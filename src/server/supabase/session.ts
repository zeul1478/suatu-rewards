import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { serverEnv } from "@/server/env";
import { customerCookieOptions } from "./cookieOptions";

/**
 * Supabase client acting as the signed-in customer (RLS applies), backed by httpOnly cookies.
 * Server Components can't write cookies; token refresh there is handled by src/proxy.ts.
 */
export async function supabaseForCustomer(): Promise<SupabaseClient<Database>> {
  const env = serverEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: customerCookieOptions(),
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}
