import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { serverEnv } from "@/server/env";

let admin: SupabaseClient<Database> | undefined;

/**
 * Privileged client (secret key, bypasses RLS). Server-only; every caller is responsible for
 * checking who is asking before using it.
 */
export function supabaseAdmin(): SupabaseClient<Database> {
  const env = serverEnv();
  admin ??= createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

/** A throwaway client with no cookies, for checking a password without touching the session. */
export function supabaseDetached(): SupabaseClient<Database> {
  const env = serverEnv();
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
