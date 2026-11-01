import "server-only";
import { serverEnv } from "@/server/env";
import type { SmsSender } from "./SmsSender";

let sender: SmsSender | undefined;

/** Without Twilio: the last texts "sent", kept in memory for the dev texts page (/dev/texts). */
const recorded: { at: string; to: string; body: string }[] = [];
export function recordedTexts(): readonly { at: string; to: string; body: string }[] {
  return recorded;
}

/**
 * Twilio's Messages API over plain HTTPS (no SDK). Without TWILIO_* settings texts are only
 * recorded in memory (latest 50) for the dev texts page; nothing leaves the laptop.
 */
export function smsSender(): SmsSender {
  if (sender) return sender;
  const env = serverEnv();
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM) {
    sender = {
      live: false,
      async send({ to, body }) {
        recorded.unshift({ at: new Date().toISOString(), to, body });
        recorded.length = Math.min(recorded.length, 50);
      },
    };
    return sender;
  }
  const sid = env.TWILIO_ACCOUNT_SID;
  const auth = Buffer.from(`${sid}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const from = env.TWILIO_FROM;
  sender = {
    live: true,
    async send({ to, body }) {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: to, From: from, Body: body }),
        },
      );
      if (!response.ok) {
        // Twilio's error code and message (never the number or the text) for the log.
        const detail = (await response.json().catch(() => ({}))) as {
          code?: number;
          message?: string;
        };
        throw new Error(
          `Twilio ${response.status} ${detail.code ?? ""} ${detail.message ?? ""}`.trim(),
        );
      }
    },
  };
  return sender;
}
