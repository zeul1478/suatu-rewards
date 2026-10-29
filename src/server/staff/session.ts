import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { isProduction } from "@/server/env";
import { supabaseAdmin } from "@/server/supabase/admin";

/**
 * Staff sessions (§6): random token in an httpOnly cookie, only its SHA-256 in the database.
 * Bound to one store. Ends after 15 minutes without activity, or 12 hours at most.
 */

export const STAFF_COOKIE = "suatu-staff";
export const STAFF_IDLE_MS = 15 * 60 * 1000;
const STAFF_MAX_AGE_MS = 12 * 60 * 60 * 1000;
/** Don't write last_seen_at on every request; once a minute is plenty for a 15-minute timeout. */
const TOUCH_INTERVAL_MS = 60 * 1000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type StaffMember = {
  id: string;
  storeId: string;
  displayName: string;
  role: "cashier" | "manager";
};

export async function startStaffSession(staffId: string, storeId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const { error } = await supabaseAdmin()
    .from("staff_sessions")
    .insert({
      staff_id: staffId,
      store_id: storeId,
      token_hash: hashToken(token),
      expires_at: new Date(Date.now() + STAFF_MAX_AGE_MS).toISOString(),
    });
  if (error) throw new Error(`Staff session insert failed: ${error.message}`);

  (await cookies()).set(STAFF_COOKIE, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: STAFF_MAX_AGE_MS / 1000,
  });
}

/** The signed-in staff member for this store, or null (no session, other store, idle, expired). */
export const getCurrentStaff = cache(async (storeId: string): Promise<StaffMember | null> => {
  const token = (await cookies()).get(STAFF_COOKIE)?.value;
  if (!token) return null;

  const admin = supabaseAdmin();
  const { data: session } = await admin
    .from("staff_sessions")
    .select(
      "id, store_id, last_seen_at, expires_at, revoked_at, staff:staff_id (id, display_name, role, active)",
    )
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!session || session.revoked_at || !session.staff?.active) return null;
  if (session.store_id !== storeId) return null;

  const now = Date.now();
  const idleFor = now - new Date(session.last_seen_at).getTime();
  if (new Date(session.expires_at).getTime() < now || idleFor > STAFF_IDLE_MS) {
    await admin
      .from("staff_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", session.id);
    return null;
  }
  if (idleFor > TOUCH_INTERVAL_MS) {
    await admin
      .from("staff_sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", session.id);
  }

  return {
    id: session.staff.id,
    storeId: session.store_id,
    displayName: session.staff.display_name,
    role: session.staff.role as StaffMember["role"],
  };
});

export async function endStaffSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_COOKIE)?.value;
  if (token) {
    await supabaseAdmin()
      .from("staff_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", hashToken(token));
  }
  cookieStore.delete(STAFF_COOKIE);
}
