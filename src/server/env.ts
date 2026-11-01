import "server-only";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SUPABASE_URL: z.url(),
  /** The app's public address, e.g. https://rewards.example.com. Required in production. */
  APP_URL: z.url().default("http://localhost:3000"),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  SMTP_HOST: z.string().default("127.0.0.1"),
  SMTP_PORT: z.coerce.number().int().default(55325),
  /** A real provider's SMTP login (e.g. Resend: user "resend", the API key as password). */
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  /** "true" for TLS from the first byte (port 465). Port 587 upgrades with STARTTLS anyway. */
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  EMAIL_FROM: z.string().default("Suatu Rewards <no-reply@suatu.test>"),
  /**
   * Twilio, for texts (D84). Without these, texts are only recorded (the dev "texts" page shows
   * them), which is how local runs and tests work. TWILIO_FROM: the Twilio phone number, +1….
   */
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),
  /** Protects /api/cron/outbox, which a scheduled job calls to send queued messages. */
  CRON_SECRET: z.string().min(24).optional(),
  /** Failed logins allowed per IP address in 15 minutes before that IP is paused (§4.2). */
  LOGIN_MAX_FAILURES_PER_IP: z.coerce.number().int().positive().default(30),
});

let cached: z.infer<typeof schema> | undefined;

/** Server environment, validated once. Missing values fail loudly with the variable's name. */
export function serverEnv() {
  if (!cached) {
    cached = schema.parse(process.env);
    if (isProduction() && !process.env.APP_URL) {
      throw new Error("APP_URL must be set in production (links in emails use it).");
    }
  }
  return cached;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
