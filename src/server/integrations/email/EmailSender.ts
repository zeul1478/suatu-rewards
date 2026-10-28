export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

/** Sends transactional email. Locally: Mailpit over SMTP. Later: a Resend adapter (spec §3). */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
