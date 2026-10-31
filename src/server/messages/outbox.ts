import "server-only";
import { after } from "next/server";
import { maskEmail, redactPii } from "@/lib/mask";
import {
  MARKETING_EVENTS,
  renderMessage,
  stopLine,
  type MessageChannel,
  type MessageValues,
} from "@/lib/messages";
import { maskPhone } from "@/lib/phone";
import { storeUrl } from "@/lib/storeUrl";
import { serverEnv } from "@/server/env";
import { emailSender } from "@/server/integrations/email";
import { smsSender } from "@/server/integrations/sms";
import { supabaseAdmin } from "@/server/supabase/admin";
import type { Database } from "@/types/database";

type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type Outcome = "sent" | "failed" | "skipped" | "later";

/** Texts go out between 9:00 and 20:00, store time; outside that they wait for the morning. */
const QUIET_BEFORE = 9;
const QUIET_FROM = 20;
const MAX_ATTEMPTS = 3;

function localHour(timezone: string, at = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: timezone,
    }).format(at),
  );
}

/** The next moment it's 9:00 at the store (checked hour by hour, so DST is handled). */
function nextMorning(timezone: string): Date {
  const at = new Date();
  at.setUTCMinutes(0, 0, 0);
  for (let i = 0; i < 26; i++) {
    at.setUTCHours(at.getUTCHours() + 1);
    if (localHour(timezone, at) === QUIET_BEFORE) return at;
  }
  return new Date(Date.now() + 12 * 3600_000);
}

function localDay(timezone: string, at: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(at);
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

type Store = { id: string; name: string; slug: string; locale: string; timezone: string };

/**
 * Sends what's due in the outbox (D84): claims a batch, writes each message from the owner's
 * current wording, sends it and records the result on the same row. Safe to call often and from
 * several places at once (claim_messages hands each row to one caller). Returns what happened.
 */
export async function processOutbox(limit = 25): Promise<Record<Outcome, number>> {
  const admin = supabaseAdmin();
  const counts: Record<Outcome, number> = { sent: 0, failed: 0, skipped: 0, later: 0 };
  const { data: rows, error } = await admin.rpc("claim_messages", { p_limit: limit });
  if (error) throw new Error(`Outbox claim failed: ${error.message}`);

  const stores = new Map<string, Store>();
  for (const row of rows ?? []) {
    let store = stores.get(row.store_id);
    if (!store) {
      const { data } = await admin
        .from("stores")
        .select("id, name, slug, locale, timezone")
        .eq("id", row.store_id)
        .single();
      if (!data) continue;
      store = data;
      stores.set(row.store_id, store);
    }
    let outcome: Outcome;
    try {
      outcome = await deliver(row, store);
    } catch (cause) {
      const message = redactPii(String(cause instanceof Error ? cause.message : cause)).slice(
        0,
        300,
      );
      const retry = row.attempts < MAX_ATTEMPTS;
      await admin
        .from("messages")
        .update({
          status: retry ? "queued" : "failed",
          last_error: message,
          send_after: new Date(Date.now() + row.attempts * 5 * 60_000).toISOString(),
        })
        .eq("id", row.id);
      outcome = retry ? "later" : "failed";
    }
    counts[outcome]++;
  }
  return counts;
}

async function finish(row: MessageRow, status: "sent" | "skipped", fields: Partial<MessageRow>) {
  await supabaseAdmin()
    .from("messages")
    .update({ status, sent_at: status === "sent" ? new Date().toISOString() : null, ...fields })
    .eq("id", row.id);
  return status;
}

async function deliver(row: MessageRow, store: Store): Promise<Outcome> {
  const admin = supabaseAdmin();
  const channel = row.channel as MessageChannel;
  // A manager's test carries its own wording (payload overrides) and sample values.
  const payload = (row.payload ?? {}) as MessageValues & {
    body_override?: string;
    subject_override?: string;
  };
  const link = `${serverEnv().APP_URL}${storeUrl(store.slug)}`;

  // Who, and their numbers right now (an account deleted since queuing gets nothing).
  let to: string | null = row.to_address;
  const { body_override: bodyOverride, subject_override: subjectOverride, ...given } = payload;
  let values: MessageValues = { store: store.name, link, ...given };
  if (!to && row.customer_id) {
    const [{ data: customer }, { data: member }] = await Promise.all([
      admin
        .from("customers")
        .select("status, first_name, phone_e164, email")
        .eq("id", row.customer_id)
        .single(),
      admin
        .from("store_customers")
        .select("points_balance")
        .eq("store_id", store.id)
        .eq("customer_id", row.customer_id)
        .single(),
    ]);
    if (!customer || customer.status !== "active" || !member) {
      return finish(row, "skipped", { last_error: "no active account" });
    }
    to = channel === "sms" ? customer.phone_e164 : customer.email;
    const { data: next } = await admin
      .from("rewards")
      .select("name, cost_points")
      .eq("store_id", store.id)
      .eq("active", true)
      .gt("cost_points", member.points_balance)
      .order("cost_points")
      .limit(1)
      .maybeSingle();
    values = {
      ...values,
      first_name: customer.first_name ?? "",
      points: member.points_balance,
      reward: payload.reward ?? next?.name ?? "",
      points_to_go: next ? next.cost_points - member.points_balance : "",
    };
  }
  if (!to) return finish(row, "skipped", { last_error: "no address" });

  // The words: a special message's own, or the owner's current template for the event.
  let subject = "";
  let body: string;
  if (row.broadcast_id) {
    const { data } = await admin
      .from("broadcasts")
      .select("subject, body")
      .eq("id", row.broadcast_id)
      .single();
    if (!data) return finish(row, "skipped", { last_error: "message removed" });
    subject = data.subject ?? "";
    body = data.body;
  } else {
    const { data } = await admin
      .from("message_templates")
      .select("enabled, subject, body")
      .eq("store_id", store.id)
      .eq("event", row.event ?? "")
      .eq("channel", channel)
      .maybeSingle();
    // A test uses the wording it was sent with; otherwise the event must still be switched on.
    if (row.to_address && bodyOverride) {
      subject = subjectOverride ?? "";
      body = bodyOverride;
    } else if (!data || !data.enabled) {
      return finish(row, "skipped", { last_error: "turned off" });
    } else {
      subject = data.subject ?? "";
      body = data.body;
    }
  }

  const text = renderMessage(body, values);
  const masked = channel === "sms" ? maskPhone(to) : maskEmail(to);

  if (channel === "sms") {
    if (localHour(store.timezone) < QUIET_BEFORE || localHour(store.timezone) >= QUIET_FROM) {
      await admin
        .from("messages")
        .update({ status: "queued", send_after: nextMorning(store.timezone).toISOString() })
        .eq("id", row.id);
      return "later";
    }
    // One automatic text a day per customer: the first event wins (special messages don't count).
    if (row.customer_id && !row.broadcast_id) {
      const today = localDay(store.timezone, new Date());
      const { data: sentToday } = await admin
        .from("messages")
        .select("sent_at")
        .eq("store_id", store.id)
        .eq("customer_id", row.customer_id)
        .eq("channel", "sms")
        .eq("status", "sent")
        .is("broadcast_id", null)
        .gte("sent_at", new Date(Date.now() - 36 * 3600_000).toISOString());
      if (
        sentToday?.some((m) => m.sent_at && localDay(store.timezone, new Date(m.sent_at)) === today)
      ) {
        return finish(row, "skipped", { to_masked: masked, last_error: "one text a day" });
      }
    }
    const marketing = MARKETING_EVENTS.includes(row.event ?? "");
    await smsSender().send({ to, body: marketing ? `${text} ${stopLine(store.locale)}` : text });
  } else {
    const subjectText = renderMessage(subject, values) || store.name;
    await emailSender().send({
      to,
      subject: subjectText,
      text,
      html: `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5">${escapeHtml(text).replace(/\n/g, "<br>")}</div>`,
    });
  }
  return finish(row, "sent", { to_masked: masked, last_error: null });
}

/**
 * Sends what's queued after the response, so the cashier, owner or customer never waits on it.
 * Call after anything that may have queued a message (a visit, a reward, a sign-up…).
 */
export function sendQueuedSoon(): void {
  after(async () => {
    try {
      await processOutbox();
    } catch (error) {
      console.error("Outbox run failed", { error: redactPii(String(error)) });
    }
  });
}
