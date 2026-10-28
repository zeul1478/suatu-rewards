import "server-only";
import type { EmailMessage } from "@/server/integrations/email/EmailSender";

/*
 * Transactional emails. Plain and short; the HTML mirrors the text. Never include passwords.
 * (Marketing emails, with unsubscribe link and postal address per CAN-SPAM, come later.)
 */

function layout(storeName: string, paragraphs: string[], action: { label: string; url: string }) {
  const escape = (value: string) =>
    value.replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
    );
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#eaf4ee;font-family:Arial,sans-serif;color:#07231a">
<table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px">
<tr><td>
<p style="margin:0 0 16px;font-weight:bold;letter-spacing:2px;color:#1e7a4f">${escape(storeName.toUpperCase())} REWARDS</p>
${paragraphs.map((p) => `<p style="margin:0 0 16px;line-height:1.5">${escape(p)}</p>`).join("\n")}
<p style="margin:24px 0"><a href="${escape(action.url)}" style="background:#1e7a4f;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${escape(action.label)}</a></p>
<p style="margin:0;font-size:13px;color:#3d5c4e">Or paste this link into your browser: ${escape(action.url)}</p>
</td></tr></table></body></html>`;
}

export function passwordResetEmail(input: {
  to: string;
  firstName: string;
  storeName: string;
  url: string;
}): EmailMessage {
  const paragraphs = [
    `Hi ${input.firstName},`,
    `Someone asked to reset the password for your ${input.storeName} Rewards account. The link works once and expires in 60 minutes.`,
    "If it wasn't you, ignore this email. Your password stays the same.",
  ];
  return {
    to: input.to,
    subject: `Reset your ${input.storeName} Rewards password`,
    text: `${paragraphs.join("\n\n")}\n\nReset your password: ${input.url}\n`,
    html: layout(input.storeName, paragraphs, { label: "Choose a new password", url: input.url }),
  };
}

export function verifyEmailEmail(input: {
  to: string;
  firstName: string;
  storeName: string;
  url: string;
}): EmailMessage {
  const paragraphs = [
    `Hi ${input.firstName},`,
    `Please confirm this is your email address for ${input.storeName} Rewards. We use it only to help you reset your password and, if you asked for them, to send offers.`,
  ];
  return {
    to: input.to,
    subject: `Confirm your email for ${input.storeName} Rewards`,
    text: `${paragraphs.join("\n\n")}\n\nConfirm your email: ${input.url}\n`,
    html: layout(input.storeName, paragraphs, { label: "Confirm my email", url: input.url }),
  };
}
