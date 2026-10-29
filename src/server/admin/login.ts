import "server-only";
import { hash, verify } from "@node-rs/argon2";
import { recordAudit } from "@/server/audit";
import { isProduction } from "@/server/env";
import { supabaseAdmin } from "@/server/supabase/admin";
import {
  checkNewStaffPassword,
  staffPasswordAllowed,
  type StaffPasswordIssue,
} from "@/server/staff/passwordPolicy";
import type { StaffLoginResult } from "@/server/staff/login";
import { clearFailures, lockedUntil, minutesLeft, recordFailure } from "@/server/throttle";
import { startAdminSession } from "./session";

export type AdminLoginResult = Exclude<StaffLoginResult, { error: "managersOnly" }>;

// Verified against when the user name doesn't exist, so both cases take the same time.
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$NNMgCqOF1rmfLkaR9/w2bA$Pxnqh73ohMyiTIiaO5sVU8UxDKi+GxPbfeUGbUtH+OA";

/**
 * Platform-admin login: the same rules as staff (§6) — argon2id, 5 failures → 15-minute lock,
 * per-IP limit, and a temporary or (in production) development password must be replaced
 * before the session starts.
 */
export async function logInAdmin(input: {
  username: string;
  password: string;
  newPassword?: string;
  ip: string;
}): Promise<AdminLoginResult> {
  const ipLock = await lockedUntil("ip", input.ip);
  if (ipLock) return { ok: false, error: "ipLimited", minutes: minutesLeft(ipLock) };

  const throttleKey = input.username.toLowerCase();
  const accountLock = await lockedUntil("admin_login", throttleKey);
  if (accountLock) return { ok: false, error: "locked", minutes: minutesLeft(accountLock) };

  const { data: admin } = await supabaseAdmin()
    .from("platform_admins")
    .select("id, username, password_hash, active, must_change_password")
    .eq("username", input.username)
    .maybeSingle();

  const passwordOk = await verify(admin?.password_hash ?? DUMMY_HASH, input.password);
  if (!admin || !admin.active || !passwordOk) {
    const [lock] = await Promise.all([
      recordFailure("admin_login", throttleKey),
      recordFailure("ip", input.ip),
    ]);
    if (lock) return { ok: false, error: "locked", minutes: minutesLeft(lock) };
    return { ok: false, error: "invalid" };
  }
  await clearFailures("admin_login", throttleKey);

  const mustChange =
    admin.must_change_password ||
    !staffPasswordAllowed(input.password, { production: isProduction() });
  const update: { last_login_at: string; password_hash?: string; must_change_password?: false } = {
    last_login_at: new Date().toISOString(),
  };
  if (mustChange) {
    if (!input.newPassword) return { ok: false, error: "mustChangePassword" };
    const issue: StaffPasswordIssue | null = checkNewStaffPassword(input.newPassword, {
      staffCode: admin.username,
      currentPassword: input.password,
    });
    if (issue) return { ok: false, error: "newPasswordInvalid", issue };
    update.password_hash = await hash(input.newPassword);
    update.must_change_password = false;
  }

  const { error } = await supabaseAdmin().from("platform_admins").update(update).eq("id", admin.id);
  if (error) throw new Error(`Admin update failed: ${error.message}`);
  if (mustChange) {
    await recordAudit({ actorType: "admin", actorId: admin.id, action: "admin.password_changed" });
  }
  await startAdminSession(admin.id);
  await recordAudit({ actorType: "admin", actorId: admin.id, action: "admin.login" });
  return { ok: true };
}
