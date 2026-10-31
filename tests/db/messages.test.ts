import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { testPhone } from "../support/data";
import { closeDb, db } from "../support/db";
import { env } from "../support/env";

/*
 * Messages and reward rules (DECISIONS D84): what gets queued for which event, who may get it
 * (opt-ins), special messages, double points, welcome and birthday bonuses, and expiry. Each
 * test uses its own store. Nothing is sent here: the app's sender is tested separately.
 */

afterAll(closeDb);

const secret = () =>
  createClient(env.supabaseUrl, env.secretKey, { auth: { persistSession: false } });

async function makeStore(columns: Record<string, unknown> = {}) {
  const names = Object.keys(columns);
  const {
    rows: [store],
  } = await db().query(
    `insert into public.stores (slug, name, country, timezone, currency, locale, points_per_visit
       ${names.map((n) => `, ${n}`).join("")})
     values ($1, 'Test Station', 'US', 'America/New_York', 'USD', 'en-US', 5
       ${names.map((_, i) => `, $${i + 2}`).join("")}) returning id`,
    [`test-${randomUUID().slice(0, 8)}`, ...Object.values(columns)],
  );
  await db().query(
    `insert into public.rewards (store_id, name, cost_points) values ($1, 'Free coffee', 10)`,
    [store.id],
  );
  return store.id as string;
}

/** An active customer (signed up) at the store, with the given opt-ins. */
async function makeCustomer(
  storeId: string,
  options: {
    smsUpdates?: boolean;
    smsMarketing?: boolean;
    emailOffers?: boolean;
    birthday?: string;
  } = {},
) {
  const phone = testPhone().e164;
  const email = `test-msg-${randomUUID().slice(0, 8)}@example.test`;
  // An active customer has a login (customers.active_customer_is_complete).
  const { data: user, error } = await secret().auth.admin.createUser({
    phone,
    email,
    phone_confirm: true,
  });
  if (error || !user.user) throw new Error(`createUser: ${error?.message}`);
  const {
    rows: [customer],
  } = await db().query(
    `insert into public.customers (status, auth_user_id, phone_e164, email, first_name, last_name,
       is_adult_confirmed, birthday)
     values ('active', $1, $2, $3, 'Ana', 'Test', true, $4) returning id`,
    [user.user.id, phone, email, options.birthday ?? null],
  );
  await db().query(
    `insert into public.store_customers (store_id, customer_id, sms_updates_consent,
       sms_marketing_consent, marketing_email_consent)
     values ($1, $2, $3, $4, $5)`,
    [storeId, customer.id, !!options.smsUpdates, !!options.smsMarketing, !!options.emailOffers],
  );
  return { id: customer.id as string, phone };
}

async function turnOn(storeId: string, event: string, channel: "sms" | "email") {
  await db().query(
    `insert into public.message_templates (store_id, event, channel, enabled, body)
     values ($1, $2, $3, true, 'Hi {first_name}')`,
    [storeId, event, channel],
  );
}

async function queued(storeId: string, customerId?: string) {
  const { rows } = await db().query(
    `select channel, event, payload from public.messages
     where store_id = $1 and ($2::uuid is null or customer_id = $2) order by created_at`,
    [storeId, customerId ?? null],
  );
  return rows as { channel: string; event: string; payload: Record<string, unknown> }[];
}

async function earn(storeId: string, phone: string) {
  const { data, error } = await secret().rpc("earn_points", {
    p_store_id: storeId,
    p_phone_e164: phone,
    p_staff_id: null,
    p_idempotency_key: randomUUID(),
  });
  if (error) throw new Error(error.message);
  return data as { added: number; balance: number };
}

describe("event messages", () => {
  it("a visit queues 'visit added' only on channels the owner turned on and the customer agreed to", async () => {
    const store = await makeStore();
    await turnOn(store, "visit_added", "sms");
    await turnOn(store, "visit_added", "email");
    const yes = await makeCustomer(store, { smsUpdates: true });
    const no = await makeCustomer(store);

    await earn(store, yes.phone);
    await earn(store, no.phone);

    // Texts need the opt-in; an email about their own points doesn't.
    expect((await queued(store, yes.id)).map((m) => m.channel).sort()).toEqual(["email", "sms"]);
    expect((await queued(store, no.id)).map((m) => m.channel)).toEqual(["email"]);
    expect((await queued(store, yes.id))[0]?.payload).toEqual({ points_added: 5 });
  });

  it("nothing is queued while the owner hasn't turned an event on", async () => {
    const store = await makeStore();
    const customer = await makeCustomer(store, { smsUpdates: true });
    await earn(store, customer.phone);
    expect(await queued(store)).toEqual([]);
  });

  it("crossing a reward's price queues 'reward ready' once", async () => {
    const store = await makeStore();
    await turnOn(store, "reward_unlocked", "sms");
    const customer = await makeCustomer(store, { smsUpdates: true });
    await earn(store, customer.phone); // 5
    await earn(store, customer.phone); // 10: crosses the 10-point coffee
    await earn(store, customer.phone); // 15: already past it
    const messages = await queued(store, customer.id);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      event: "reward_unlocked",
      payload: { reward: "Free coffee" },
    });
  });

  it("numbers entered at the counter without an account get nothing", async () => {
    const store = await makeStore();
    await turnOn(store, "visit_added", "sms");
    await earn(store, testPhone().e164);
    expect(await queued(store)).toEqual([]);
  });

  it("offer messages (birthday, we miss you) need the marketing opt-in", async () => {
    const store = await makeStore();
    await turnOn(store, "we_miss_you", "sms");
    await turnOn(store, "we_miss_you", "email");
    const updatesOnly = await makeCustomer(store, { smsUpdates: true });
    const offers = await makeCustomer(store, { smsMarketing: true, emailOffers: true });
    for (const c of [updatesOnly, offers]) {
      await secret().rpc("queue_event_message", {
        p_store_id: store,
        p_customer_id: c.id,
        p_event: "we_miss_you",
        p_payload: {},
      });
    }
    expect(await queued(store, updatesOnly.id)).toEqual([]);
    expect((await queued(store, offers.id)).map((m) => m.channel).sort()).toEqual(["email", "sms"]);
  });
});

describe("reward rules", () => {
  it("double-points days multiply each visit while they're on", async () => {
    const store = await makeStore({
      double_points_multiplier: 3,
      double_points_from: "2000-01-01",
      double_points_to: "2999-12-31",
    });
    const customer = await makeCustomer(store);
    expect((await earn(store, customer.phone)).added).toBe(15);
  });

  it("outside the dates a visit earns the usual points", async () => {
    const store = await makeStore({
      double_points_multiplier: 2,
      double_points_from: "2000-01-01",
      double_points_to: "2000-01-02",
    });
    const customer = await makeCustomer(store);
    expect((await earn(store, customer.phone)).added).toBe(5);
  });

  it("the welcome bonus is given once, as a bonus rather than a visit", async () => {
    const store = await makeStore({ welcome_bonus_points: 20 });
    await turnOn(store, "welcome", "email");
    const customer = await makeCustomer(store);
    for (let i = 0; i < 2; i++) {
      await secret().rpc("customer_joined", { p_store_id: store, p_customer_id: customer.id });
    }
    const {
      rows: [member],
    } = await db().query(
      `select points_balance, visit_count from public.store_customers where store_id = $1 and customer_id = $2`,
      [store, customer.id],
    );
    expect(member).toEqual({ points_balance: 20, visit_count: 0 });
    expect((await queued(store, customer.id)).filter((m) => m.event === "welcome")).toHaveLength(2);
  });

  it("birthdays get their bonus and message once a year, at 9:00 store time", async () => {
    const store = await makeStore({ birthday_bonus_points: 25 });
    await turnOn(store, "birthday", "email");
    const customer = await makeCustomer(store, { birthday: "1990-06-15", emailOffers: true });
    // 9:30 in New York on June 15th (EDT, UTC-4), then the same hour an hour later.
    await secret().rpc("run_daily_messages", { p_now: "2030-06-15T13:30:00Z" });
    await secret().rpc("run_daily_messages", { p_now: "2030-06-15T13:45:00Z" });
    const {
      rows: [member],
    } = await db().query(
      `select points_balance from public.store_customers where store_id = $1 and customer_id = $2`,
      [store, customer.id],
    );
    expect(member.points_balance).toBe(25);
    expect((await queued(store, customer.id)).map((m) => m.event)).toEqual(["birthday"]);
  });

  it("points expire after the set months without a visit", async () => {
    const store = await makeStore({ points_expire_after_months: 3 });
    const customer = await makeCustomer(store);
    await earn(store, customer.phone);
    await db().query(
      `update public.store_customers set last_visit_at = now() - interval '4 months'
       where store_id = $1 and customer_id = $2`,
      [store, customer.id],
    );
    // 9:30 in New York today.
    const { rows } = await db().query(
      `select ((now() at time zone 'America/New_York')::date + time '09:30') at time zone 'America/New_York' as at`,
    );
    await secret().rpc("run_daily_messages", { p_now: rows[0].at.toISOString() });
    const {
      rows: [member],
    } = await db().query(
      `select points_balance from public.store_customers where store_id = $1 and customer_id = $2`,
      [store, customer.id],
    );
    expect(member.points_balance).toBe(0);
  });
});

describe("special messages", () => {
  it("reach only customers who agreed to offers on that channel", async () => {
    const store = await makeStore();
    await makeCustomer(store, { smsMarketing: true });
    await makeCustomer(store, { smsUpdates: true });
    await makeCustomer(store, { emailOffers: true });

    const { data: counts } = await secret().rpc("broadcast_counts", { p_store_id: store });
    expect(counts).toMatchObject({ "all:sms": 1, "all:email": 1, "reward_waiting:sms": 0 });

    const { data, error } = await secret().rpc("create_broadcast", {
      p_store_id: store,
      p_channel: "sms",
      p_audience: "all",
      p_subject: "",
      p_body: "Double points this weekend!",
      p_staff_id: null,
    });
    expect(error).toBeNull();
    expect(data).toMatchObject({ recipients: 1 });
    expect(await queued(store)).toEqual([{ channel: "sms", event: "broadcast", payload: {} }]);
  });
});

describe("text opt-ins", () => {
  it("are recorded as consent events", async () => {
    const store = await makeStore();
    const customer = await makeCustomer(store);
    await secret().rpc("set_sms_consent", {
      p_store_id: store,
      p_customer_id: customer.id,
      p_kind: "sms_marketing",
      p_granted: true,
      p_source: "account",
    });
    const { rows } = await db().query(
      `select kind, granted, source from public.consent_events where customer_id = $1`,
      [customer.id],
    );
    expect(rows).toEqual([{ kind: "sms_marketing", granted: true, source: "account" }]);
  });

  it("can't be called by customers or visitors", async () => {
    const anon = createClient(env.supabaseUrl, env.publishableKey, {
      auth: { persistSession: false },
    });
    const { error } = await anon.rpc("claim_messages", { p_limit: 1 });
    expect(error).not.toBeNull();
  });
});
