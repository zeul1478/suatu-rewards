import { afterAll, describe, expect, it } from "vitest";
import { testPhone } from "../support/data";
import { closeDb, createUnclaimedCustomer, db, testStoreId } from "../support/db";

/* D5: unclaimed accounts idle for 12 months are erased; everyone else is left alone. */

afterAll(closeDb);

async function unclaimedSince(monthsAgo: number, lastVisitMonthsAgo?: number) {
  const id = await createUnclaimedCustomer(testPhone().e164);
  await db().query(
    `update public.customers set created_at = now() - make_interval(months => $2) where id = $1`,
    [id, monthsAgo],
  );
  if (lastVisitMonthsAgo !== undefined) {
    await db().query(
      `insert into public.point_transactions
         (store_id, customer_id, type, points, source, idempotency_key, created_at)
       values ($1, $2, 'earn', 5, 'staff_manual', gen_random_uuid()::text,
               now() - make_interval(months => $3))`,
      [await testStoreId(), id, lastVisitMonthsAgo],
    );
  }
  return id;
}

async function statusOf(id: string) {
  const { rows } = await db().query(
    `select status, phone_e164,
            (select count(*)::int from public.point_transactions where customer_id = $1) as ledger,
            (select count(*)::int from public.audit_log
               where target_id = $1 and action = 'customer.expired' and actor_type = 'system') as audits
     from public.customers where id = $1`,
    [id],
  );
  return rows[0];
}

describe("purge_idle_unclaimed_customers", () => {
  it("erases idle unclaimed accounts, keeps their history, spares recent ones", async () => {
    const idle = await unclaimedSince(14, 13);
    const visitedRecently = await unclaimedSince(14, 2);
    const new_ = await unclaimedSince(1);

    await db().query(`select public.purge_idle_unclaimed_customers()`);

    expect(await statusOf(idle)).toEqual({
      status: "deleted",
      phone_e164: null,
      ledger: 1,
      audits: 1,
    });
    expect(await statusOf(visitedRecently)).toMatchObject({ status: "unclaimed", audits: 0 });
    expect(await statusOf(new_)).toMatchObject({ status: "unclaimed", audits: 0 });
  });

  it("never touches signed-up customers", async () => {
    const { rows } = await db().query(
      `select count(*)::int as n from public.customers c
       join public.audit_log a on a.target_id = c.id and a.action = 'customer.expired'
       where c.auth_user_id is not null`,
    );
    expect(rows[0].n).toBe(0);
  });

  it("runs every night", async () => {
    const { rows } = await db().query(
      `select schedule, command from cron.job where jobname = 'purge-idle-unclaimed-customers'`,
    );
    expect(rows).toEqual([
      { schedule: "30 4 * * *", command: "select public.purge_idle_unclaimed_customers()" },
    ]);
  });
});
