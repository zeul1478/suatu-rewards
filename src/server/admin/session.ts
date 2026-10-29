import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { isProduction } from "@/server/env";
import { supabaseAdmin } from "@/server/supabase/admin";

/**
 * Platform-admin sessions (/admin, §11): like staff sessions — random token in an httpOnly
 * cookie, only its SHA-256 in the database, 15 minutes idle — but not tied to a store, and the
 * cookie is sent to /admin only.
 */

export const ADMIN_COOKIE = "suatu-admin";
export const ADMIN_IDLE_MS = 15 * 60 * 1000;
const ADMIN_MAX_AGE_MS = 8 * 60 * 60 * 1000;
const TOUCH_INTERVAL_MS = 60 * 1000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type PlatformAdmin = { id: string; displayName: string };

export async function startAdminSession(adminId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const { error } = await supabaseAdmin()
    .from("admin_sessions")
    .insert({
      admin_id: adminId,
      token_hash: hashToken(token),
      expires_at: new Date(Date.now() + ADMIN_MAX_AGE_MS).toISOString(),
    });
  if (error) throw new Error(`Admin session insert failed: ${error.message}`);

  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/admin",
    maxAge: ADMIN_MAX_AGE_MS / 1000,
  });
}

/** The signed-in platform admin, or null (no session, turned off, idle, expired). */
export const getCurrentAdmin = cache(async (): Promise<PlatformAdmin | null> => {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  const db = supabaseAdmin();
  const { data: session } = await db
    .from("admin_sessions")
    .select(
      "id, last_seen_at, expires_at, revoked_at, admin:admin_id (id, display_name, active, must_change_password)",
    )
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!session || session.revoked_at || !session.admin?.active) return null;
  if (session.admin.must_change_password) return null;

  const now = Date.now();
  const idleFor = now - new Date(session.last_seen_at).getTime();
  if (new Date(session.expires_at).getTime() < now || idleFor > ADMIN_IDLE_MS) {
    await db
      .from("admin_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", session.id);
    return null;
  }
  if (idleFor > TOUCH_INTERVAL_MS) {
    await db
      .from("admin_sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", session.id);
  }
  return { id: session.admin.id, displayName: session.admin.display_name };
});

export async function endAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (token) {
    await supabaseAdmin()
      .from("admin_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", hashToken(token));
  }
  cookieStore.delete({ name: ADMIN_COOKIE, path: "/admin" });
}
