import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { testPhone } from "../support/data";
import { closeDb, db } from "../support/db";
import { env } from "../support/env";

/*
 * Stopping points cheating at the counter (DECISIONS D78): the owner's limits, a staff
 * member's own number, and the "unusual activity" numbers. Each test uses its own store.
 */

afterAll(closeDb);

const secret = () =>
  createClient(env.supabaseUrl, env.secretKey, { auth: { persistSession: false } });

type Store = { id: string; staffId: string };

async function makeStore(
  limits: { maxVisitsPerDay?: number; minMinutes?: number } = {},
): Promise<Store> {
  const {
    rows: [store],
  } = await db().query(
    `insert into public.stores (slug, name, country, timezone, currency, locale, points_per_visit,
       max_visits_per_day, min_minutes_between_visits)
     values ($1, 'Test Station', 'US', 'America/New_York', 'USD', 'en-US', 5, $2, $3) returning id`,
    [`test-${randomUUID().slice(0, 8)}`, limits.maxVisitsPerDay ?? null, limits.minMinutes ?? null],
  );
  const staffId = await addStaff(store.id, "T1234", "Test cashier");
  return { id: store.id, staffId };
}

async function addStaff(storeId: string, code: string, name: string, phone?: string) {
  const {
    rows: [row],
  } = await db().query(
    `insert into public.staff (store_id, staff_code, role, display_name, password_hash, phone_e164)
     values ($1, $2, 'cashier', $3, 'not-a-real-hash', $4) returning id`,
    [storeId, code, name, phone ?? null],
  );
  return row.id as string;
}

async function earn(store: Store, phone: string, staffId = store.staffId) {
  const { data, error } = await secret().rpc("earn_points", {
    p_store_id: store.id,
    p_phone_e164: phone,
    p_staff_id: staffId,
    p_idempotency_key: randomUUID(),
  });
  if (error) throw new Error(error.message);
  return data as { balance: number; transaction_id: string };
}

/** Moves this number's visits back in time (the ledger is append-only, so triggers are paused). */
async function moveVisitsBack(store: Store, phone: string, interval: string) {
  await db().query(
    `alter table public.point_transactions disable trigger user;
     update public.point_transactions set created_at = created_at - interval '${interval}'
     where store_id = '${store.id}'
       and customer_id = (select id from public.customers where phone_e164 = '${phone}');
     alter table public.point_transactions enable trigger user;`,
  );
}

describe("the owner's limits", () => {
  it("no limits by default: the same number can get visit after visit (§0 step 6)", async () => {
    const store = await makeStore();
    const phone = testPhone().e164;
    for (let i = 0; i < 5; i++) await earn(store, phone);
    expect((await earn(store, phone)).balance).toBe(30);
  });

  it("most visits per day: the next one that day is refused", async () => {
    const store = await makeStore({ maxVisitsPerDay: 2 });
    const phone = testPhone().e164;
    await earn(store, phone);
    await earn(store, phone);
    await expect(earn(store, phone)).rejects.toThrow("daily_cap_reached");
  });

  it("most visits per day: a voided visit doesn't count", async () => {
    const store = await makeStore({ maxVisitsPerDay: 1 });
    const phone = testPhone().e164;
    const first = await earn(store, phone);
    const { error } = await secret().rpc("void_transaction", {
      p_store_id: store.id,
      p_transaction_id: first.transaction_id,
      p_staff_id: store.staffId,
    });
    expect(error).toBeNull();
    expect((await earn(store, phone)).balance).toBe(5);
  });

  it("minutes between visits: too soon is refused with the minutes left", async () => {
    const store = await makeStore({ minMinutes: 30 });
    const phone = testPhone().e164;
    await earn(store, phone);
    await expect(earn(store, phone)).rejects.toThrow(/^too_soon:30$/);
    await moveVisitsBack(store, phone, "20 minutes");
    await expect(earn(store, phone)).rejects.toThrow(/^too_soon:10$/);
  });

  it("minutes between visits: once the time has passed, the visit counts", async () => {
    const store = await makeStore({ minMinutes: 30 });
    const phone = testPhone().e164;
    await earn(store, phone);
    await moveVisitsBack(store, phone, "31 minutes");
    expect((await earn(store, phone)).balance).toBe(10);
  });

  it("limits apply per customer: other numbers still earn", async () => {
    const store = await makeStore({ maxVisitsPerDay: 1, minMinutes: 60 });
    await earn(store, testPhone().e164);
    expect((await earn(store, testPhone().e164)).balance).toBe(5);
  });
});

describe("a staff member's own number", () => {
  it("is refused at the counter, for any cashier", async () => {
    const store = await makeStore();
    const phone = testPhone().e164;
    await addStaff(store.id, "T5678", "Dana", phone);
    await expect(earn(store, phone)).rejects.toThrow("staff_own_number");
  });

  it("counts again once the person is turned off", async () => {
    const store = await makeStore();
    const phone = testPhone().e164;
    const dana = await addStaff(store.id, "T5678", "Dana", phone);
    await db().query(`update public.staff set active = false where id = $1`, [dana]);
    expect((await earn(store, phone)).balance).toBe(5);
  });

  it("only blocks that store's staff numbers", async () => {
    const store = await makeStore();
    const other = await makeStore();
    const phone = testPhone().e164;
    await addStaff(other.id, "T5678", "Dana", phone);
    expect((await earn(store, phone)).balance).toBe(5);
  });

  it("must be a full international number", async () => {
    const store = await makeStore();
    await expect(addStaff(store.id, "T5678", "Dana", "555-0142")).rejects.toThrow(/check/);
  });
});

describe("dashboard_unusual_activity", () => {
  async function unusual(store: Store) {
    const { data, error } = await secret().rpc("dashboard_unusual_activity", {
      p_store_id: store.id,
    });
    expect(error).toBeNull();
    return data as {
      numbers: { phone: string; most_in_a_day: number; days: number }[];
      cashiers: { name: string; visits: number; top_three: number }[];
    };
  }

  it("nothing to report for an ordinary week", async () => {
    const store = await makeStore();
    for (let i = 0; i < 4; i++) await earn(store, testPhone().e164);
    expect(await unusual(store)).toEqual({ numbers: [], cashiers: [] });
  });

  it("a number with 3+ visits in a day is listed", async () => {
    const store = await makeStore();
    const busy = testPhone().e164;
    for (let i = 0; i < 4; i++) await earn(store, busy);
    await earn(store, testPhone().e164);
    const { numbers } = await unusual(store);
    expect(numbers).toEqual([expect.objectContaining({ phone: busy, most_in_a_day: 4, days: 1 })]);
  });

  it("a cashier whose entries keep going to the same few numbers is listed", async () => {
    const store = await makeStore();
    const honest = await addStaff(store.id, "T2222", "Honest cashier");
    const favourites = [testPhone().e164, testPhone().e164];
    for (let day = 0; day < 6; day++) {
      for (const phone of favourites) await earn(store, phone);
      await earn(store, testPhone().e164, honest);
      await earn(store, testPhone().e164, honest);
      // Spread over days so no single number reaches 3 in a day.
      for (const phone of favourites) await moveVisitsBack(store, phone, "1 day");
    }
    const { cashiers, numbers } = await unusual(store);
    expect(numbers).toEqual([]);
    expect(cashiers).toEqual([
      expect.objectContaining({ name: "Test cashier", visits: 12, top_three: 12 }),
    ]);
  });

  it("voided visits don't count", async () => {
    const store = await makeStore();
    const phone = testPhone().e164;
    for (let i = 0; i < 3; i++) {
      const { transaction_id } = await earn(store, phone);
      if (i === 2) {
        await secret().rpc("void_transaction", {
          p_store_id: store.id,
          p_transaction_id: transaction_id,
          p_staff_id: store.staffId,
        });
      }
    }
    expect((await unusual(store)).numbers).toEqual([]);
  });
});
