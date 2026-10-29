import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { testEmail, testPhone } from "../support/data";
import { closeDb, db } from "../support/db";
import { env } from "../support/env";

/*
 * The points engine (§0, §7, M3 "done when"), straight against Postgres functions.
 * Each test uses its own throwaway store, so nothing depends on test order.
 */

afterAll(closeDb);

const secret = () =>
  createClient(env.supabaseUrl, env.secretKey, { auth: { persistSession: false } });

type Store = { id: string; staffId: string; rewardId: string };

async function makeStore(options: { dailyCap?: number } = {}): Promise<Store> {
  const slug = `test-${randomUUID().slice(0, 8)}`;
  const {
    rows: [store],
  } = await db().query(
    `insert into public.stores (slug, name, country, timezone, currency, locale, points_per_visit, daily_earn_cap)
     values ($1, 'Test Station', 'US', 'America/New_York', 'USD', 'en-US', 5, $2) returning id`,
    [slug, options.dailyCap ?? null],
  );
  const {
    rows: [staff],
  } = await db().query(
    `insert into public.staff (store_id, staff_code, role, display_name, password_hash)
     values ($1, 'T1234', 'cashier', 'Test cashier', 'not-a-real-hash') returning id`,
    [store.id],
  );
  const {
    rows: [reward],
  } = await db().query(
    `insert into public.rewards (store_id, name, cost_points) values ($1, 'Free coffee', 100) returning id`,
    [store.id],
  );
  return { id: store.id, staffId: staff.id, rewardId: reward.id };
}

async function earn(store: Store, phone: string, key: string = randomUUID()) {
  const { data, error } = await secret().rpc("earn_points", {
    p_store_id: store.id,
    p_phone_e164: phone,
    p_staff_id: store.staffId,
    p_idempotency_key: key,
  });
  if (error) throw new Error(error.message);
  return data as {
    balance: number;
    added: number;
    duplicate: boolean;
    is_new_customer: boolean;
    customer_id: string;
  };
}

async function redeem(store: Store, phone: string) {
  const {
    rows: [customer],
  } = await db().query(`select id from public.customers where phone_e164 = $1`, [phone]);
  const created = await secret().rpc("create_redemption", {
    p_store_id: store.id,
    p_customer_id: customer.id,
    p_reward_id: store.rewardId,
  });
  if (created.error) throw new Error(created.error.message);
  const { code } = created.data as { code: string };
  const completed = await secret().rpc("complete_redemption", {
    p_store_id: store.id,
    p_code: code,
    p_staff_id: store.staffId,
  });
  return { code, ...completed };
}

/** §0 rule: the balance shown anywhere equals the sum of the ledger. */
async function expectBalanceMatchesLedger(store: Store, phone: string, expected: number) {
  const {
    rows: [row],
  } = await db().query(
    `select sc.points_balance,
            (select coalesce(sum(points), 0)::int from public.point_transactions pt
             where pt.store_id = sc.store_id and pt.customer_id = sc.customer_id) as ledger
     from public.store_customers sc join public.customers c on c.id = sc.customer_id
     where sc.store_id = $1 and c.phone_e164 = $2`,
    [store.id, phone],
  );
  expect(row).toEqual({ points_balance: expected, ledger: expected });
}

describe("earn_points", () => {
  it("20 visits → 100; redeem → 0", async () => {
    const store = await makeStore();
    const phone = testPhone().e164;
    for (let visit = 1; visit <= 20; visit++) {
      expect((await earn(store, phone)).balance).toBe(visit * 5);
    }
    const { error, data } = await redeem(store, phone);
    expect(error).toBeNull();
    expect((data as { balance: number }).balance).toBe(0);
    await expectBalanceMatchesLedger(store, phone, 0);
  });

  it("21 visits → 105; redeem → 5 (points carry over)", async () => {
    const store = await makeStore();
    const phone = testPhone().e164;
    for (let visit = 1; visit <= 21; visit++) await earn(store, phone);
    await expectBalanceMatchesLedger(store, phone, 105);
    await redeem(store, phone);
    await expectBalanceMatchesLedger(store, phone, 5);
  });

  it("the same idempotency key twice adds +5 once", async () => {
    const store = await makeStore();
    const phone = testPhone().e164;
    const key = randomUUID();
    const first = await earn(store, phone, key);
    const again = await earn(store, phone, key);
    expect(first).toMatchObject({ added: 5, duplicate: false, balance: 5 });
    expect(again).toMatchObject({ added: 0, duplicate: true, balance: 5 });
    await expectBalanceMatchesLedger(store, phone, 5);
  });

  it("two cashiers at the same moment: +10, and a new number becomes one customer", async () => {
    const store = await makeStore();
    const phone = testPhone().e164;
    const [a, b] = await Promise.all([earn(store, phone), earn(store, phone)]);
    expect(a.customer_id).toBe(b.customer_id);
    await expectBalanceMatchesLedger(store, phone, 10);
  });

  it("ten parallel taps of the same submission still add +5 once", async () => {
    const store = await makeStore();
    const phone = testPhone().e164;
    const key = randomUUID();
    await Promise.all(Array.from({ length: 10 }, () => earn(store, phone, key)));
    await expectBalanceMatchesLedger(store, phone, 5);
  });

  it("a never-seen number creates an unclaimed customer with 5 points (§0 step 10)", async () => {
    const store = await makeStore();
    const phone = testPhone().e164;
    expect(await earn(store, phone)).toMatchObject({ is_new_customer: true, balance: 5 });
    const { rows } = await db().query(
      `select status, email from public.customers where phone_e164 = $1`,
      [phone],
    );
    expect(rows).toEqual([{ status: "unclaimed", email: null }]);
    expect((await earn(store, phone)).is_new_customer).toBe(false);
  });

  it("signing up later keeps the points already earned (§0 step 11)", async () => {
    const store = await makeStore();
    const phone = testPhone().e164;
    await earn(store, phone);
    const email = testEmail();
    const { data: user } = await secret().auth.admin.createUser({
      phone,
      email,
      password: randomUUID(),
      phone_confirm: true,
    });
    const { error } = await secret().rpc("register_customer", {
      p_auth_user_id: user.user!.id,
      p_store_id: store.id,
      p_phone_e164: phone,
      p_email: email,
      p_first_name: "Testa",
      p_last_name: "Fictiva",
      p_program_terms_version: "v",
      p_privacy_version: "v",
      p_terms_of_use_version: "v",
      p_marketing_email: false,
      p_source: "signup",
    });
    expect(error).toBeNull();
    await expectBalanceMatchesLedger(store, phone, 5);
    expect((await earn(store, phone)).balance).toBe(10);
  });

  it("a daily cap, when a store sets one, stops further earning that day", async () => {
    const store = await makeStore({ dailyCap: 10 });
    const phone = testPhone().e164;
    await earn(store, phone);
    await earn(store, phone);
    await expect(earn(store, phone)).rejects.toThrow("daily_cap_reached");
    await expectBalanceMatchesLedger(store, phone, 10);
  });

  it("the ledger can't be edited or deleted, even by the server", async () => {
    const store = await makeStore();
    const phone = testPhone().e164;
    await earn(store, phone);
    const connection = await db().connect();
    try {
      await connection.query("set role service_role");
      await expect(
        connection.query(`update public.point_transactions set points = 500 where store_id = $1`, [
          store.id,
        ]),
      ).rejects.toThrow(/permission denied/);
      await expect(
        connection.query(`delete from public.point_transactions where store_id = $1`, [store.id]),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await connection.query("reset role");
      connection.release();
    }
  });
});

describe("redemptions (§0 steps 8–9, §4.3b)", () => {
  async function storeWithCustomerAt(points: number) {
    const store = await makeStore();
    const phone = testPhone().e164;
    for (let i = 0; i < points / 5; i++) await earn(store, phone);
    const {
      rows: [customer],
    } = await db().query(`select id from public.customers where phone_e164 = $1`, [phone]);
    return { store, phone, customerId: customer.id as string };
  }

  const createCode = async (store: Store, customerId: string) => {
    const { data, error } = await secret().rpc("create_redemption", {
      p_store_id: store.id,
      p_customer_id: customerId,
      p_reward_id: store.rewardId,
    });
    return { data: data as { id: string; code: string; expires_at: string } | null, error };
  };
  const complete = (store: Store, code: string) =>
    secret().rpc("complete_redemption", {
      p_store_id: store.id,
      p_code: code,
      p_staff_id: store.staffId,
    });

  it("codes are 6 digits and valid for 5 minutes", async () => {
    const { store, customerId } = await storeWithCustomerAt(100);
    const { data } = await createCode(store, customerId);
    expect(data!.code).toMatch(/^\d{6}$/);
    const minutes = (new Date(data!.expires_at).getTime() - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(4.9);
    expect(minutes).toBeLessThanOrEqual(5);
  });

  it("a code works once", async () => {
    const { store, phone, customerId } = await storeWithCustomerAt(200);
    const { data } = await createCode(store, customerId);
    expect((await complete(store, data!.code)).error).toBeNull();
    expect((await complete(store, data!.code)).error?.message).toBe("invalid_code");
    await expectBalanceMatchesLedger(store, phone, 100);
  });

  it("an expired code is refused (fake clock: expiry moved into the past)", async () => {
    const { store, phone, customerId } = await storeWithCustomerAt(100);
    const { data } = await createCode(store, customerId);
    await db().query(
      `update public.redemptions set expires_at = now() - interval '1 second' where id = $1`,
      [data!.id],
    );
    expect((await complete(store, data!.code)).error?.message).toBe("invalid_code");
    await expectBalanceMatchesLedger(store, phone, 100);
  });

  it("a code from another store is refused", async () => {
    const { store, customerId } = await storeWithCustomerAt(100);
    const otherStore = await makeStore();
    const { data } = await createCode(store, customerId);
    expect((await complete(otherStore, data!.code)).error?.message).toBe("invalid_code");
  });

  it("a new code replaces the previous one", async () => {
    const { store, customerId } = await storeWithCustomerAt(100);
    const first = await createCode(store, customerId);
    const second = await createCode(store, customerId);
    if (first.data!.code !== second.data!.code) {
      expect((await complete(store, first.data!.code)).error?.message).toBe("invalid_code");
    }
    expect((await complete(store, second.data!.code)).error).toBeNull();
  });

  it("no code without enough points; the balance never goes below zero", async () => {
    const { store, phone, customerId } = await storeWithCustomerAt(95);
    expect((await createCode(store, customerId)).error?.message).toBe("not_enough_points");
    await expectBalanceMatchesLedger(store, phone, 95);
  });
});

describe("void_transaction (§6: own entries, 10 minutes)", () => {
  async function staffMember(store: Store, code: string) {
    const {
      rows: [row],
    } = await db().query(
      `insert into public.staff (store_id, staff_code, role, display_name, password_hash)
       values ($1, $2, 'cashier', 'Other cashier', 'not-a-real-hash') returning id`,
      [store.id, code],
    );
    return row.id as string;
  }

  async function lastEarn(store: Store, phone: string) {
    const {
      rows: [row],
    } = await db().query(
      `select pt.id from public.point_transactions pt join public.customers c on c.id = pt.customer_id
       where pt.store_id = $1 and c.phone_e164 = $2 and pt.type = 'earn' order by pt.created_at desc limit 1`,
      [store.id, phone],
    );
    return row.id as string;
  }

  const voidIt = (store: Store, transactionId: string, staffId = store.staffId) =>
    secret().rpc("void_transaction", {
      p_store_id: store.id,
      p_transaction_id: transactionId,
      p_staff_id: staffId,
    });

  it("reverses the visit: points and visit count go back, the ledger keeps both rows", async () => {
    const store = await makeStore();
    const phone = testPhone().e164;
    await earn(store, phone);
    await earn(store, phone);
    const { data, error } = await voidIt(store, await lastEarn(store, phone));
    expect(error).toBeNull();
    expect(data).toMatchObject({ balance: 5, points: 5 });
    await expectBalanceMatchesLedger(store, phone, 5);
    const { rows } = await db().query(
      `select sc.visit_count, (select count(*)::int from public.point_transactions pt
                               where pt.customer_id = sc.customer_id and pt.store_id = sc.store_id) as rows
       from public.store_customers sc join public.customers c on c.id = sc.customer_id
       where sc.store_id = $1 and c.phone_e164 = $2`,
      [store.id, phone],
    );
    expect(rows[0]).toEqual({ visit_count: 1, rows: 3 });
  });

  it("only once", async () => {
    const store = await makeStore();
    const phone = testPhone().e164;
    await earn(store, phone);
    const id = await lastEarn(store, phone);
    await voidIt(store, id);
    expect((await voidIt(store, id)).error?.message).toBe("already_voided");
    await expectBalanceMatchesLedger(store, phone, 0);
  });

  it("only your own entries", async () => {
    const store = await makeStore();
    const phone = testPhone().e164;
    await earn(store, phone);
    const other = await staffMember(store, "T5678");
    expect((await voidIt(store, await lastEarn(store, phone), other)).error?.message).toBe(
      "not_own_entry",
    );
  });

  it("only within 10 minutes (fake clock: entry moved 11 minutes back)", async () => {
    const store = await makeStore();
    const phone = testPhone().e164;
    await earn(store, phone);
    const id = await lastEarn(store, phone);
    await db().query(
      `alter table public.point_transactions disable trigger user;
       update public.point_transactions set created_at = now() - interval '11 minutes' where id = '${id}';
       alter table public.point_transactions enable trigger user;`,
    );
    expect((await voidIt(store, id)).error?.message).toBe("too_late");
  });

  it("not when the points were already spent on a reward", async () => {
    const store = await makeStore();
    const phone = testPhone().e164;
    for (let i = 0; i < 20; i++) await earn(store, phone);
    const id = await lastEarn(store, phone);
    await redeem(store, phone);
    expect((await voidIt(store, id)).error?.message).toBe("points_already_used");
    await expectBalanceMatchesLedger(store, phone, 0);
  });

  it("only visits in this store", async () => {
    const store = await makeStore();
    const otherStore = await makeStore();
    const phone = testPhone().e164;
    await earn(store, phone);
    expect((await voidIt(otherStore, await lastEarn(store, phone))).error?.message).toBe(
      "not_found",
    );
  });
});
