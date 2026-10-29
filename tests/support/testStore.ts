import { createClient } from "@supabase/supabase-js";
import { db } from "./db";
import { env } from "./env";

/*
 * Tests never touch the real store's data. They run against their own store, "suatu-test"
 * (same name and look as Suatu — unknown slugs use the default brand), and every test run ends
 * by deleting everything tests created: this store's customers, logins, points, codes and
 * sessions, the throwaway "test-…" stores of the DB tests, and test emails in Mailpit.
 */

export const TEST_STORE = { slug: "suatu-test", name: "Suatu" } as const;

/**
 * The tests' own platform admin (password 0000, development only), so admin tests never use or
 * lock the real 0000 admin. Stores it creates are deleted after the run like "test-…" stores.
 */
export const TEST_ADMIN = { username: "testadmin", password: "0000" } as const;

/** Same argon2id hash as the dev seed: user name 0000, password 0000. */
const STAFF_0000_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$NNMgCqOF1rmfLkaR9/w2bA$Pxnqh73ohMyiTIiaO5sVU8UxDKi+GxPbfeUGbUtH+OA";

export async function createTestStore(): Promise<void> {
  await cleanUpTestData();
  await db().query(
    `insert into public.stores (slug, name, country, timezone, currency, locale, points_per_visit)
     values ($1, $2, 'US', 'America/New_York', 'USD', 'en-US', 5)`,
    [TEST_STORE.slug, TEST_STORE.name],
  );
  await db().query(
    `insert into public.rewards (store_id, name, cost_points)
     select id, 'Free coffee', 100 from public.stores where slug = $1`,
    [TEST_STORE.slug],
  );
  await db().query(
    `insert into public.staff (store_id, staff_code, role, display_name, password_hash)
     select id, '0000', 'manager', 'Manager (dev)', $2 from public.stores where slug = $1`,
    [TEST_STORE.slug, STAFF_0000_HASH],
  );
  await db().query(
    `insert into public.platform_admins (username, display_name, password_hash)
     values ($1, 'Test admin', $2)`,
    [TEST_ADMIN.username, STAFF_0000_HASH],
  );
}

/**
 * Deletes every row tests created. Runs as the database owner, which may remove ledger and
 * consent rows the app itself can never delete. Customers are removed only when every store
 * they belong to is a test store, so someone who also joined the real Suatu is never touched.
 */
export async function cleanUpTestData(): Promise<void> {
  await removeTestOfferImages();
  const client = await db().connect();
  try {
    await client.query("begin");
    await client.query(`
      create temp table test_admins on commit drop as
        select id from public.platform_admins where username = '${TEST_ADMIN.username}';
      create temp table test_stores on commit drop as
        select id from public.stores where slug = '${TEST_STORE.slug}' or slug like 'test-%'
        union
        select target_id from public.audit_log
        where action = 'store.created' and actor_id in (select id from test_admins);
      create temp table test_customers on commit drop as
        select c.id, c.auth_user_id, c.phone_e164 from public.customers c
        where (exists (select 1 from public.store_customers sc
                       where sc.customer_id = c.id and sc.store_id in (select id from test_stores))
               and not exists (select 1 from public.store_customers sc
                               where sc.customer_id = c.id and sc.store_id not in (select id from test_stores)))
           or (c.email like 'test-%@example.test');
    `);
    await client.query(`
      delete from public.redemptions where store_id in (select id from test_stores)
        or customer_id in (select id from test_customers);
      delete from public.point_transactions where store_id in (select id from test_stores)
        or customer_id in (select id from test_customers);
      delete from public.consent_events where store_id in (select id from test_stores)
        or customer_id in (select id from test_customers);
      delete from public.email_verifications where customer_id in (select id from test_customers);
      delete from public.store_customers where store_id in (select id from test_stores)
        or customer_id in (select id from test_customers);
      delete from public.audit_log where store_id in (select id from test_stores)
        or actor_id in (select id from test_customers) or actor_id in (select id from test_admins);
      delete from public.staff_sessions where store_id in (select id from test_stores);
      delete from public.offers where store_id in (select id from test_stores);
      delete from public.auth_throttles where scope in ('customer_phone', 'reset_email')
        and key in (select phone_e164 from test_customers);
      delete from public.auth_throttles where scope = 'admin_login' and key = '${TEST_ADMIN.username}';
      delete from public.admin_sessions where admin_id in (select id from test_admins);
      delete from public.platform_admins where id in (select id from test_admins);
      delete from public.auth_throttles where scope in ('staff_login', 'redeem_code')
        and (split_part(key, ':', 1) in (select id::text from test_stores)
             or key in (select s.id::text from public.staff s where s.store_id in (select id from test_stores)));
      delete from public.staff where store_id in (select id from test_stores);
      delete from public.rewards where store_id in (select id from test_stores);
      delete from public.customers where id in (select id from test_customers);
      delete from auth.users where id in (select auth_user_id from test_customers)
        or email like 'test-%@example.test';
      delete from public.stores where id in (select id from test_stores);
    `);
    // Per-IP counters from test runs use made-up 10.x addresses; clearing them only unlocks.
    await client.query(`delete from public.auth_throttles where scope in ('ip', 'signup_ip')`);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/** Offer pictures go through the Storage API: Supabase refuses direct deletes of its tables. */
async function removeTestOfferImages(): Promise<void> {
  const { rows } = await db().query(`
    select o.name from storage.objects o
    where o.bucket_id = 'offer-images'
      and split_part(o.name, '/', 1) in (
        select id::text from public.stores where slug = '${TEST_STORE.slug}' or slug like 'test-%')`);
  if (rows.length === 0) return;
  const storage = createClient(env.supabaseUrl, env.secretKey, {
    auth: { persistSession: false },
  }).storage.from("offer-images");
  const { error } = await storage.remove(rows.map((row: { name: string }) => row.name));
  if (error) throw new Error(`Test image cleanup failed: ${error.message}`);
}
