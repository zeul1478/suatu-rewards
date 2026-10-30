import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { testPhone } from "../support/data";
import { closeDb, db } from "../support/db";
import { env } from "../support/env";

/* "Is the program working?" numbers for the owner's Overview (DECISIONS D79). */

afterAll(closeDb);

const secret = () =>
  createClient(env.supabaseUrl, env.secretKey, { auth: { persistSession: false } });

type Store = { id: string; staffId: string };

async function makeStore(): Promise<Store> {
  const {
    rows: [store],
  } = await db().query(
    `insert into public.stores (slug, name, country, timezone, currency, locale, points_per_visit)
     values ($1, 'Test Station', 'US', 'America/New_York', 'USD', 'en-US', 5) returning id`,
    [`test-${randomUUID().slice(0, 8)}`],
  );
  const {
    rows: [staff],
  } = await db().query(
    `insert into public.staff (store_id, staff_code, role, display_name, password_hash)
     values ($1, 'T1234', 'cashier', 'Dana', 'not-a-real-hash') returning id`,
    [store.id],
  );
  await db().query(
    `insert into public.rewards (store_id, name, cost_points) values ($1, 'Free coffee', 10)`,
    [store.id],
  );
  return { id: store.id, staffId: staff.id };
}

async function earn(store: Store, phone: string) {
  const { data, error } = await secret().rpc("earn_points", {
    p_store_id: store.id,
    p_phone_e164: phone,
    p_staff_id: store.staffId,
    p_idempotency_key: randomUUID(),
  });
  if (error) throw new Error(error.message);
  return data as { transaction_id: string };
}

async function insights(store: Store) {
  const { data, error } = await secret().rpc("dashboard_insights", { p_store_id: store.id });
  expect(error).toBeNull();
  return data as {
    daily: { day: string; visits: number }[];
    lapsed_30: number;
    lapsed_60: number;
    lapsed_90: number;
    rewards_waiting: number;
    cashiers: { name: string; visits: number }[];
  };
}

describe("dashboard_insights", () => {
  it("30 days of visits, today last, days without visits as 0", async () => {
    const store = await makeStore();
    await earn(store, testPhone().e164);
    await earn(store, testPhone().e164);
    const { daily } = await insights(store);
    expect(daily).toHaveLength(30);
    expect(daily.at(-1)?.visits).toBe(2);
    expect(daily.slice(0, -1).every((d) => d.visits === 0)).toBe(true);
  });

  it("voided visits don't count", async () => {
    const store = await makeStore();
    const { transaction_id } = await earn(store, testPhone().e164);
    await secret().rpc("void_transaction", {
      p_store_id: store.id,
      p_transaction_id: transaction_id,
      p_staff_id: store.staffId,
    });
    const result = await insights(store);
    expect(result.daily.at(-1)?.visits).toBe(0);
    expect(result.cashiers).toEqual([]);
  });

  it("who hasn't been back, by when they last came", async () => {
    const store = await makeStore();
    const phones = [testPhone().e164, testPhone().e164, testPhone().e164, testPhone().e164];
    for (const phone of phones) await earn(store, phone);
    const ago = ["0 days", "40 days", "75 days", "200 days"];
    for (const [i, phone] of phones.entries()) {
      await db().query(
        `update public.store_customers set last_visit_at = now() - $3::interval
         where store_id = $1 and customer_id = (select id from public.customers where phone_e164 = $2)`,
        [store.id, phone, ago[i]],
      );
    }
    expect(await insights(store)).toMatchObject({ lapsed_30: 1, lapsed_60: 1, lapsed_90: 1 });
  });

  it("rewards waiting: customers with enough points for the cheapest active reward", async () => {
    const store = await makeStore();
    const regular = testPhone().e164;
    await earn(store, regular);
    await earn(store, regular); // 10 points = Free coffee
    await earn(store, testPhone().e164); // 5 points
    expect((await insights(store)).rewards_waiting).toBe(1);
  });

  it("visits per cashier in the last 7 days", async () => {
    const store = await makeStore();
    for (let i = 0; i < 3; i++) await earn(store, testPhone().e164);
    expect((await insights(store)).cashiers).toEqual([{ name: "Dana", visits: 3 }]);
  });
});
