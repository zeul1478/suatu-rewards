import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { testEmail, testPhone } from "../support/data";
import { closeDb, createUnclaimedCustomer, db, testStoreId } from "../support/db";
import { env } from "../support/env";

/*
 * Database functions and row-level security, against the local Supabase (`pnpm db:start`).
 */

afterAll(closeDb);

const secret = () =>
  createClient(env.supabaseUrl, env.secretKey, { auth: { persistSession: false } });
const anon = () =>
  createClient(env.supabaseUrl, env.publishableKey, { auth: { persistSession: false } });

async function authUser(phoneE164: string, email: string): Promise<string> {
  const { data, error } = await secret().auth.admin.createUser({
    phone: phoneE164,
    email,
    password: randomUUID(),
    phone_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

async function register(overrides: { phone?: string; email?: string; authUserId?: string } = {}) {
  const phone = overrides.phone ?? testPhone().e164;
  const email = overrides.email ?? testEmail();
  const authUserId = overrides.authUserId ?? (await authUser(phone, email));
  return secret().rpc("register_customer", {
    p_auth_user_id: authUserId,
    p_store_id: await testStoreId(),
    p_phone_e164: phone,
    p_email: email,
    p_first_name: "Testa",
    p_last_name: "Fictiva",
    p_program_terms_version: "2026-10-28",
    p_privacy_version: "2026-10-28",
    p_terms_of_use_version: "2026-10-28",
    p_marketing_email: true,
    p_source: "signup",
  });
}

describe("auth throttle functions", () => {
  const fail = (key: string) =>
    secret().rpc("auth_throttle_fail", {
      p_scope: "customer_phone",
      p_key: key,
      p_max: 5,
      p_window: "15 minutes",
      p_lock: "15 minutes",
    });

  it("locks on the 5th failure for 15 minutes, and clearing unlocks", async () => {
    const key = `+1${randomUUID()}`;
    for (let i = 1; i <= 4; i++) expect((await fail(key)).data).toBeNull();

    const { data: lockedUntil } = await fail(key);
    const minutes = (new Date(lockedUntil!).getTime() - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(14.9);
    expect(minutes).toBeLessThanOrEqual(15);

    const check = await secret().rpc("auth_throttle_locked_until", {
      p_scope: "customer_phone",
      p_key: key,
    });
    expect(check.data).not.toBeNull();

    await secret().rpc("auth_throttle_clear", { p_scope: "customer_phone", p_key: key });
    const after = await secret().rpc("auth_throttle_locked_until", {
      p_scope: "customer_phone",
      p_key: key,
    });
    expect(after.data).toBeNull();
  });

  it("starts counting again once the 15-minute window has passed", async () => {
    const key = `+1${randomUUID()}`;
    for (let i = 1; i <= 4; i++) await fail(key);
    await db().query(
      `update public.auth_throttles set window_started_at = now() - interval '16 minutes' where key = $1`,
      [key],
    );
    expect((await fail(key)).data).toBeNull();
  });
});

describe("register_customer", () => {
  it("creates an active customer with membership and five consent records", async () => {
    const { data: customerId, error } = await register();
    expect(error).toBeNull();

    const { rows: consents } = await db().query(
      `select kind, granted, source, document_version from public.consent_events
       where customer_id = $1 order by kind`,
      [customerId],
    );
    expect(consents.map((row) => row.kind)).toEqual([
      "age_18_plus",
      "marketing_email",
      "privacy_policy",
      "program_terms",
      "terms_of_use",
    ]);
    expect(consents.every((row) => row.granted && row.source === "signup")).toBe(true);

    const { rows: membership } = await db().query(
      `select program_terms_version, marketing_email_consent from public.store_customers where customer_id = $1`,
      [customerId],
    );
    expect(membership[0]).toEqual({
      program_terms_version: "2026-10-28",
      marketing_email_consent: true,
    });
  });

  it("claims an unclaimed customer instead of creating a second one", async () => {
    const phone = testPhone().e164;
    const unclaimedId = await createUnclaimedCustomer(phone);
    const { data: customerId } = await register({ phone });
    expect(customerId).toBe(unclaimedId);
  });

  it("refuses a phone that already belongs to a signed-up customer", async () => {
    const phone = testPhone().e164;
    await register({ phone });
    const { error } = await register({
      phone,
      authUserId: await authUser(testPhone().e164, testEmail()),
    });
    expect(error?.message).toBe("phone_taken");
  });

  it("refuses an email another customer uses", async () => {
    const email = testEmail();
    await register({ email });
    const { error } = await register({
      email,
      authUserId: await authUser(testPhone().e164, testEmail()),
    });
    expect(error?.message).toBe("email_taken");
  });

  it("consent records are append-only", async () => {
    const { data: customerId } = await register();
    const connection = await db().connect();
    try {
      await connection.query("set role service_role");
      await expect(
        connection.query(
          `update public.consent_events set granted = false where customer_id = $1`,
          [customerId],
        ),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await connection.query("reset role");
      connection.release();
    }
  });
});

describe("row-level security", () => {
  it("the browser-safe key can't read customers, staff, sessions, throttles or audit log", async () => {
    await register();
    for (const table of [
      "customers",
      "store_customers",
      "consent_events",
      "staff",
      "staff_sessions",
      "auth_throttles",
      "audit_log",
      "platform_admins",
      "admin_sessions",
    ] as const) {
      const { data } = await anon().from(table).select("*").limit(5);
      expect(data ?? [], table).toEqual([]);
    }
  });

  it("the browser-safe key can't call the sign-up or throttle functions", async () => {
    const { error } = await anon().rpc("auth_throttle_clear", { p_scope: "ip", p_key: "x" });
    expect(error?.message).toMatch(/permission denied/);
  });

  it("a signed-in customer reads only their own customer row", async () => {
    const phone = testPhone().e164;
    const email = testEmail();
    const password = randomUUID();
    const { data: created } = await secret().auth.admin.createUser({
      phone,
      email,
      password,
      phone_confirm: true,
    });
    await register({ phone, email, authUserId: created.user!.id });
    await register(); // someone else

    const client = anon();
    await client.auth.signInWithPassword({ phone, password });
    const { data } = await client.from("customers").select("phone_e164");
    expect(data).toEqual([{ phone_e164: phone }]);
  });

  it("anyone can read active stores", async () => {
    const { data } = await anon().from("stores").select("slug").eq("slug", "suatu");
    expect(data).toEqual([{ slug: "suatu" }]);
  });
});
