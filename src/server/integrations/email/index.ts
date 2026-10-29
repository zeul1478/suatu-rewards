import "server-only";
import nodemailer from "nodemailer";
import { serverEnv } from "@/server/env";
import type { EmailSender } from "./EmailSender";

let sender: EmailSender | undefined;

/**
 * SMTP sender. Locally it points at Mailpit (http://127.0.0.1:55324 shows what was "sent");
 * in production at the email provider's SMTP server (docs/DEPLOY.md).
 */
export function emailSender(): EmailSender {
  if (sender) return sender;
  const env = serverEnv();
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });
  sender = {
    async send(message) {
      await transport.sendMail({ from: env.EMAIL_FROM, ...message });
    },
  };
  return sender;
}
