import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, db } from "../support/db";
import { env } from "../support/env";

/*
 * Platform admin functions (M8): create_store and admin_store_summaries, straight against
 * Postgres. Stores use "test-" addresses, deleted after the run.
 */

afterAll(closeDb);

const secret = () =>
  createClient(env.supabaseUrl, env.secretKey, { auth: { persistSession: false } });
const anon = () =>
  createClient(env.supabaseUrl, env.publishableKey, { auth: { persistSession: false } });

const newSlug = () => `test-${randomUUID().slice(0, 8)}`;

function createStore(slug: string) {
  return secret().rpc("create_store", {
    p_slug: slug,
    p_name: "Test Station",
    p_country: "RO",
    p_timezone: "Europe/Bucharest",
    p_currency: "RON",
    p_locale: "ro-RO",
    p_points_per_visit: 10,
    p_owner_code: "owner1",
    p_owner_name: "Dana",
    p_owner_password_hash: "not-a-real-hash",
    p_admin_id: randomUUID(),
  });
}

describe("create_store", () => {
  it("makes the store, its first owner (temporary password) and the starter reward", async () => {
    const slug = newSlug();
    const { data: storeId, error } = await createStore(slug);
    expect(error).toBeNull();

    const { rows } = await db().query(
      `select s.slug, s.locale, s.points_per_visit, s.status,
              (select json_agg(json_build_object('code', staff_code, 'role', role,
                 'must_change', must_change_password)) from public.staff where store_id = s.id) as staff,
              (select json_agg(json_build_object('name', name, 'cost', cost_points))
                 from public.rewards where store_id = s.id) as rewards,
              (select count(*)::int from public.audit_log
                 where store_id = s.id and action = 'store.created' and actor_type = 'admin') as audits
       from public.stores s where s.id = $1`,
      [storeId],
    );
    expect(rows[0]).toEqual({
      slug,
      locale: "ro-RO",
      points_per_visit: 10,
      status: "active",
      staff: [{ code: "owner1", role: "manager", must_change: true }],
      rewards: [{ name: "Free coffee", cost: 100 }],
      audits: 1,
    });
  });

  it("refuses an address that's taken, and leaves nothing half-made", async () => {
    const slug = newSlug();
    await createStore(slug);
    const { error } = await createStore(slug);
    expect(error?.message).toBe("slug_taken");
    const { rows } = await db().query(
      `select count(*)::int as n from public.stores where slug = $1`,
      [slug],
    );
    expect(rows[0].n).toBe(1);
  });

  it("can't be called with the browser-safe key", async () => {
    const { error } = await anon().rpc("create_store", {
      p_slug: newSlug(),
      p_name: "x",
      p_country: "US",
      p_timezone: "America/New_York",
      p_currency: "USD",
      p_locale: "en-US",
      p_points_per_visit: 5,
      p_owner_code: "owner1",
      p_owner_name: "x",
      p_owner_password_hash: "x",
      p_admin_id: randomUUID(),
    });
    expect(error?.message).toMatch(/permission denied/);
  });
});

describe("admin_store_summaries", () => {
  it("counts members, active staff and visits of the last 30 days (voided ones excluded)", async () => {
    const slug = newSlug();
    const { data: storeId } = await createStore(slug);
    const {
      rows: [staff],
    } = await db().query(`select id from public.staff where store_id = $1`, [storeId]);
    const phone = `+1954555${String(Math.floor(Math.random() * 10_000)).padStart(4, "0")}`;
    for (let i = 0; i < 3; i++) {
      await db().query(`select public.earn_points($1, $2, $3, gen_random_uuid()::text)`, [
        storeId,
        phone,
        staff.id,
      ]);
    }
    const {
      rows: [last],
    } = await db().query(
      `select id from public.point_transactions where store_id = $1 order by created_at desc limit 1`,
      [storeId],
    );
    await db().query(`select public.void_transaction($1, $2, $3)`, [storeId, last.id, staff.id]);

    const { data, error } = await secret().rpc("admin_store_summaries");
    expect(error).toBeNull();
    const row = data!.find((store: { slug: string }) => store.slug === slug);
    expect(row).toMatchObject({
      status: "active",
      members: 1,
      staff: 1,
      visits_30_days: 2,
      timezone: "Europe/Bucharest",
    });
    expect(row!.last_visit_at).not.toBeNull();
  });

  it("can't be called with the browser-safe key", async () => {
    const { error } = await anon().rpc("admin_store_summaries");
    expect(error?.message).toMatch(/permission denied/);
  });
});
