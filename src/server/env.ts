import "server-only";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  SMTP_HOST: z.string().default("127.0.0.1"),
  SMTP_PORT: z.coerce.number().int().default(55325),
  EMAIL_FROM: z.string().default("Suatu Rewards <no-reply@suatu.test>"),
  /** Failed logins allowed per IP address in 15 minutes before that IP is paused (§4.2). */
  LOGIN_MAX_FAILURES_PER_IP: z.coerce.number().int().positive().default(30),
});

let cached: z.infer<typeof schema> | undefined;

/** Server environment, validated once. Missing values fail loudly with the variable's name. */
export function serverEnv() {
  cached ??= schema.parse(process.env);
  return cached;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
