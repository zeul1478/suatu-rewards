import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { testPhone } from "../support/data";
import { closeDb, db } from "../support/db";
import { env } from "../support/env";

/*
 * Owner dashboard functions (M7): adjust_points and dashboard_overview, straight against
 * Postgres. Each test uses its own throwaway store.
 */

afterAll(closeDb);

const secret = () =>
  createClient(env.supabaseUrl, env.secretKey, { auth: { persistSession: false } });

type Store = { id: string; staffId: string };

async function makeStore(): Promise<Store> {
  const slug = `test-${randomUUID().slice(0, 8)}`;
  const {
    rows: [store],
  } = await db().query(
    `insert into public.stores (slug, name, country, timezone, currency, locale, points_per_visit)
     values ($1, 'Test Station', 'US', 'America/New_York', 'USD', 'en-US', 5) returning id`,
    [slug],
  );
  const {
    rows: [staff],
  } = await db().query(
    `insert into public.staff (store_id, staff_code, role, display_name, password_hash)
     values ($1, 'M1234', 'manager', 'Test manager', 'not-a-real-hash') returning id`,
    [store.id],
  );
  return { id: store.id, staffId: staff.id };
}

async function earn(
  store: Store,
  phone: string,
): Promise<{ customer_id: string; transaction_id: string }> {
  const { data, error } = await secret().rpc("earn_points", {
    p_store_id: store.id,
    p_phone_e164: phone,
    p_staff_id: store.staffId,
    p_idempotency_key: randomUUID(),
  });
  if (error) throw new Error(error.message);
  return data;
}

async function adjust(
  store: Store,
  customerId: string,
  points: number,
  note: string,
  key = randomUUID(),
) {
  return secret().rpc("adjust_points", {
    p_store_id: store.id,
    p_customer_id: customerId,
    p_points: points,
    p_note: note,
    p_staff_id: store.staffId,
    p_idempotency_key: key,
  });
}

async function balance(store: Store, customerId: string): Promise<number> {
  const { rows } = await db().query(
    `select points_balance from public.store_customers where store_id = $1 and customer_id = $2`,
    [store.id, customerId],
  );
  return rows[0].points_balance;
}

async function ledgerSum(store: Store, customerId: string): Promise<number> {
  const { rows } = await db().query(
    `select coalesce(sum(points), 0)::int as sum from public.point_transactions
     where store_id = $1 and customer_id = $2`,
    [store.id, customerId],
  );
  return rows[0].sum;
}

describe("adjust_points (§7: owner, note required, never below zero)", () => {
  it("adds and removes points with the note in the ledger, and audits it", async () => {
    const store = await makeStore();
    const { customer_id } = await earn(store, testPhone().e164);

    const added = await adjust(store, customer_id, 20, "  Missed visits last week  ");
    expect(added.error).toBeNull();
    expect(added.data).toMatchObject({ duplicate: false, points: 20, balance: 25 });

    const removed = await adjust(store, customer_id, -10, "Entered twice by mistake");
    expect(removed.data).toMatchObject({ points: -10, balance: 15 });
    expect(await balance(store, customer_id)).toBe(15);
    expect(await ledgerSum(store, customer_id)).toBe(15);

    const { rows } = await db().query(
      `select type, source, points, note, staff_id from public.point_transactions
       where store_id = $1 and type = 'adjust' order by created_at`,
      [store.id],
    );
    expect(rows).toEqual([
      {
        type: "adjust",
        source: "owner_adjust",
        points: 20,
        note: "Missed visits last week",
        staff_id: store.staffId,
      },
      {
        type: "adjust",
        source: "owner_adjust",
        points: -10,
        note: "Entered twice by mistake",
        staff_id: store.staffId,
      },
    ]);
    const audit = await db().query(
      `select count(*)::int as n from public.audit_log where store_id = $1 and action = 'points.adjust'`,
      [store.id],
    );
    expect(audit.rows[0].n).toBe(2);
  });

  it("refuses a missing note, zero, and going below zero", async () => {
    const store = await makeStore();
    const { customer_id } = await earn(store, testPhone().e164);

    expect((await adjust(store, customer_id, 5, "  ")).error?.message).toBe("note_required");
    expect((await adjust(store, customer_id, 0, "Nothing")).error?.message).toBe("invalid_points");
    expect((await adjust(store, customer_id, -6, "Too much")).error?.message).toBe(
      "balance_below_zero",
    );
    expect((await adjust(store, customer_id, -5, "Exactly all")).data).toMatchObject({
      balance: 0,
    });
    expect(await balance(store, customer_id)).toBe(0);
  });

  it("the same key twice adjusts once", async () => {
    const store = await makeStore();
    const { customer_id } = await earn(store, testPhone().e164);
    const key = randomUUID();

    await adjust(store, customer_id, 10, "Birthday bonus", key);
    const again = await adjust(store, customer_id, 10, "Birthday bonus", key);
    expect(again.data).toMatchObject({ duplicate: true, balance: 15 });
    expect(await balance(store, customer_id)).toBe(15);
  });

  it("only for members of this store", async () => {
    const store = await makeStore();
    const other = await makeStore();
    const { customer_id } = await earn(other, testPhone().e164);
    expect((await adjust(store, customer_id, 5, "Wrong store")).error?.message).toBe("not_found");
  });
});

describe("dashboard_overview (§11)", () => {
  it("counts members, visits (not voided) and returning customers", async () => {
    const store = await makeStore();
    const regular = testPhone().e164;
    const { customer_id: regularId } = await earn(store, regular);
    await earn(store, regular);
    const once = await earn(store, testPhone().e164);
    const voided = await earn(store, testPhone().e164);
    await secret().rpc("void_transaction", {
      p_store_id: store.id,
      p_transaction_id: voided.transaction_id,
      p_staff_id: store.staffId,
    });
    // The regular also came 3 days ago, so they've been on two different days.
    await db().query(
      `update public.point_transactions set created_at = now() - interval '3 days'
       where id = (select id from public.point_transactions
                   where customer_id = $1 and type = 'earn' order by created_at limit 1)`,
      [regularId],
    );
    // A visit 40 days ago counts as a member but not in the 30-day numbers.
    const old = await earn(store, testPhone().e164);
    await db().query(
      `update public.point_transactions set created_at = now() - interval '40 days' where id = $1`,
      [old.transaction_id],
    );
    expect(once.customer_id).toBeTruthy();

    const { data, error } = await secret().rpc("dashboard_overview", { p_store_id: store.id });
    expect(error).toBeNull();
    expect(data).toEqual({
      members: 4,
      signed_up: 0,
      visits_today: 2,
      visits_7_days: 3,
      visits_30_days: 3,
      visitors_30_days: 2,
      returning_30_days: 1,
      redeemed_total: 0,
      redeemed_30_days: 0,
    });
  });

  it("is not callable by browsers", async () => {
    const anon = createClient(env.supabaseUrl, env.publishableKey, {
      auth: { persistSession: false },
    });
    const store = await makeStore();
    const overview = await anon.rpc("dashboard_overview", { p_store_id: store.id });
    expect(overview.error).not.toBeNull();
    const adjusted = await anon.rpc("adjust_points", {
      p_store_id: store.id,
      p_customer_id: randomUUID(),
      p_points: 5,
      p_note: "nope",
      p_staff_id: store.staffId,
      p_idempotency_key: randomUUID(),
    });
    expect(adjusted.error).not.toBeNull();
  });
});
