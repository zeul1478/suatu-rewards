// Tests read the same local settings as the app (written by `pnpm db:env`).
try {
  process.loadEnvFile(".env.local");
} catch {
  throw new Error("No .env.local — run `pnpm db:start` first.");
}

export const env = {
  supabaseUrl: process.env.SUPABASE_URL!,
  publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY!,
  secretKey: process.env.SUPABASE_SECRET_KEY!,
  databaseUrl: process.env.DATABASE_URL!,
  mailpitUrl: process.env.MAILPIT_URL ?? "http://127.0.0.1:55324",
};
