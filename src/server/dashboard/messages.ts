import "server-only";
import {
  defaultWording,
  MESSAGE_EVENTS,
  sampleValues,
  type MessageChannel,
  type MessageEvent,
} from "@/lib/messages";
import { storeUrl } from "@/lib/storeUrl";
import { recordAudit } from "@/server/audit";
import { serverEnv } from "@/server/env";
import { sendQueuedSoon } from "@/server/messages/outbox";
import type { StaffMember } from "@/server/staff/session";
import type { Store } from "@/server/stores/getStore";
import { supabaseAdmin } from "@/server/supabase/admin";

export type Wording = { enabled: boolean; subject: string; body: string; saved: boolean };
export type EventSettings = { event: MessageEvent; sms: Wording; email: Wording };
export type BroadcastAudience = "all" | "lapsed_30" | "reward_waiting" | "birthday_month";
export const AUDIENCES: BroadcastAudience[] = [
  "all",
  "lapsed_30",
  "reward_waiting",
  "birthday_month",
];

/** Every event with its text and email wording: the owner's saved one, or the default (off). */
export async function getEventSettings(store: Store): Promise<EventSettings[]> {
  const { data, error } = await supabaseAdmin()
    .from("message_templates")
    .select("event, channel, enabled, subject, body")
    .eq("store_id", store.id);
  if (error) throw new Error(`Templates read failed: ${error.message}`);
  const saved = new Map(data.map((row) => [`${row.event}:${row.channel}`, row]));
  const wording = (event: MessageEvent, channel: MessageChannel): Wording => {
    const row = saved.get(`${event}:${channel}`);
    if (row)
      return { enabled: row.enabled, subject: row.subject ?? "", body: row.body, saved: true };
    return { enabled: false, ...defaultWording(store.locale, event, channel), saved: false };
  };
  return MESSAGE_EVENTS.map((event) => ({
    event,
    sms: wording(event, "sms"),
    email: wording(event, "email"),
  }));
}

export async function saveEventWording(
  store: Store,
  manager: StaffMember,
  input: {
    event: MessageEvent;
    channel: MessageChannel;
    enabled: boolean;
    subject: string;
    body: string;
  },
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("message_templates")
    .upsert(
      {
        store_id: store.id,
        event: input.event,
        channel: input.channel,
        enabled: input.enabled,
        subject: input.channel === "email" ? input.subject : null,
        body: input.body,
      },
      { onConflict: "store_id,event,channel" },
    );
  if (error) throw new Error(`Template save failed: ${error.message}`);
  await recordAudit({
    storeId: store.id,
    actorType: "staff",
    actorId: manager.id,
    action: "messages.template_saved",
    details: { event: input.event, channel: input.channel, enabled: input.enabled },
  });
}

/** A test of the wording on screen, to an address the manager types (their own phone or email). */
export async function sendTestMessage(
  store: Store,
  manager: StaffMember,
  input: { channel: MessageChannel; to: string; subject: string; body: string; event: string },
): Promise<void> {
  const { data: reward } = await supabaseAdmin()
    .from("rewards")
    .select("name")
    .eq("store_id", store.id)
    .eq("active", true)
    .order("cost_points")
    .limit(1)
    .maybeSingle();
  const link = `${serverEnv().APP_URL}${storeUrl(store.slug)}`;
  const { error } = await supabaseAdmin()
    .from("messages")
    .insert({
      store_id: store.id,
      channel: input.channel,
      event: input.event,
      to_address: input.to,
      payload: {
        ...sampleValues(store.name, link, reward?.name ?? ""),
        body_override: input.body,
        subject_override: input.subject,
      },
    });
  if (error) throw new Error(`Test queue failed: ${error.message}`);
  await recordAudit({
    storeId: store.id,
    actorType: "staff",
    actorId: manager.id,
    action: "messages.test_sent",
    details: { channel: input.channel, event: input.event },
  });
  sendQueuedSoon();
}

/** How many people each group would reach by text and by email (only those who opted in). */
export async function getAudienceCounts(store: Store): Promise<Record<string, number>> {
  const { data, error } = await supabaseAdmin().rpc("broadcast_counts", { p_store_id: store.id });
  if (error) throw new Error(`Audience count failed: ${error.message}`);
  return (data ?? {}) as Record<string, number>;
}

export async function sendBroadcast(
  store: Store,
  manager: StaffMember,
  input: { channel: MessageChannel; audience: BroadcastAudience; subject: string; body: string },
): Promise<number> {
  const { data, error } = await supabaseAdmin().rpc("create_broadcast", {
    p_store_id: store.id,
    p_channel: input.channel,
    p_audience: input.audience,
    p_subject: input.channel === "email" ? input.subject : "",
    p_body: input.body,
    p_staff_id: manager.id,
  });
  if (error) throw new Error(`Broadcast failed: ${error.message}`);
  sendQueuedSoon();
  return (data as { recipients: number }).recipients;
}

export type SentMessage = {
  id: string;
  createdAt: string;
  channel: MessageChannel;
  event: string | null;
  special: boolean;
  /** A manager's "send me a test". */
  test: boolean;
  to: string | null;
  status: string;
  error: string | null;
};

/** The latest messages, newest first, with the recipient masked. */
export async function getRecentMessages(store: Store, limit = 50): Promise<SentMessage[]> {
  const { data, error } = await supabaseAdmin()
    .from("messages")
    .select(
      "id, created_at, channel, event, broadcast_id, to_address, to_masked, status, last_error",
    )
    .eq("store_id", store.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Messages read failed: ${error.message}`);
  return data.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    channel: row.channel as MessageChannel,
    event: row.event,
    special: row.broadcast_id !== null,
    test: row.to_address !== null,
    to: row.to_masked,
    status: row.status,
    error: row.last_error,
  }));
}
