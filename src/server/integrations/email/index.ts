import "server-only";
import nodemailer from "nodemailer";
import { serverEnv } from "@/server/env";
import type { EmailSender } from "./EmailSender";

let sender: EmailSender | undefined;

/** SMTP sender pointed at Mailpit (http://127.0.0.1:55324 shows what was "sent"). */
export function emailSender(): EmailSender {
  if (sender) return sender;
  const env = serverEnv();
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
  });
  sender = {
    async send(message) {
      await transport.sendMail({ from: env.EMAIL_FROM, ...message });
    },
  };
  return sender;
}
