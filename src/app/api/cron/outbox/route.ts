import { timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/server/env";
import { processOutbox } from "@/server/messages/outbox";

/**
 * Sends queued texts and emails (D84). Called every few minutes by a scheduled job with
 * "Authorization: Bearer <CRON_SECRET>"; without CRON_SECRET set, it's off (404).
 */
export async function GET(request: Request) {
  const secret = serverEnv().CRON_SECRET;
  if (!secret) return new Response(null, { status: 404 });
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new Response(null, { status: 401 });
  }
  const result = await processOutbox(100);
  return Response.json(result);
}
