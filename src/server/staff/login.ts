import "server-only";
import { hash, verify } from "@node-rs/argon2";
import { recordAudit } from "@/server/audit";
import { isProduction } from "@/server/env";
import { supabaseAdmin } from "@/server/supabase/admin";
import { clearFailures, lockedUntil, minutesLeft, recordFailure } from "@/server/throttle";
import {
  checkNewStaffPassword,
  staffPasswordAllowed,
  type StaffPasswordIssue,
} from "./passwordPolicy";
import { startStaffSession } from "./session";

export type StaffLoginResult =
  | { ok: true }
  | { ok: false; error: "invalid" }
  | { ok: false; error: "managersOnly" }
  | { ok: false; error: "mustChangePassword" }
  | { ok: false; error: "newPasswordInvalid"; issue: StaffPasswordIssue }
  | { ok: false; error: "locked"; minutes: number }
  | { ok: false; error: "ipLimited"; minutes: number };

// Verified against when the user name doesn't exist, so both cases take the same time.
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$NNMgCqOF1rmfLkaR9/w2bA$Pxnqh73ohMyiTIiaO5sVU8UxDKi+GxPbfeUGbUtH+OA";

/**
 * Staff login (§6): user name + password, argon2id, 5 failures → 15-minute lock.
 * A temporary password (set by the owner) or, in production, the development password must be
 * replaced before the session starts: the form asks for `newPassword` and submits again.
 * The owner dashboard passes `managersOnly`.
 */
export async function logInStaff(input: {
  storeId: string;
  staffCode: string;
  password: string;
  newPassword?: string;
  ip: string;
  managersOnly?: boolean;
}): Promise<StaffLoginResult> {
  const ipLock = await lockedUntil("ip", input.ip);
  if (ipLock) return { ok: false, error: "ipLimited", minutes: minutesLeft(ipLock) };

  const throttleKey = `${input.storeId}:${input.staffCode.toLowerCase()}`;
  const accountLock = await lockedUntil("staff_login", throttleKey);
  if (accountLock) return { ok: false, error: "locked", minutes: minutesLeft(accountLock) };

  const { data: staff } = await supabaseAdmin()
    .from("staff")
    .select("id, staff_code, role, password_hash, active, must_change_password")
    .eq("store_id", input.storeId)
    .eq("staff_code", input.staffCode)
    .maybeSingle();

  const passwordOk = await verify(staff?.password_hash ?? DUMMY_HASH, input.password);
  if (!staff || !staff.active || !passwordOk) {
    const [lock] = await Promise.all([
      recordFailure("staff_login", throttleKey),
      recordFailure("ip", input.ip),
    ]);
    if (lock) return { ok: false, error: "locked", minutes: minutesLeft(lock) };
    return { ok: false, error: "invalid" };
  }
  await clearFailures("staff_login", throttleKey);

  if (input.managersOnly && staff.role !== "manager") return { ok: false, error: "managersOnly" };

  const mustChange =
    staff.must_change_password ||
    !staffPasswordAllowed(input.password, { production: isProduction() });
  const update: { last_login_at: string; password_hash?: string; must_change_password?: false } = {
    last_login_at: new Date().toISOString(),
  };
  if (mustChange) {
    if (!input.newPassword) return { ok: false, error: "mustChangePassword" };
    const issue = checkNewStaffPassword(input.newPassword, {
      staffCode: staff.staff_code,
      currentPassword: input.password,
    });
    if (issue) return { ok: false, error: "newPasswordInvalid", issue };
    update.password_hash = await hash(input.newPassword);
    update.must_change_password = false;
  }

  const { error } = await supabaseAdmin().from("staff").update(update).eq("id", staff.id);
  if (error) throw new Error(`Staff update failed: ${error.message}`);
  if (mustChange) {
    await recordAudit({
      storeId: input.storeId,
      actorType: "staff",
      actorId: staff.id,
      action: "staff.password_changed",
    });
  }
  await startStaffSession(staff.id, input.storeId);
  await recordAudit({
    storeId: input.storeId,
    actorType: "staff",
    actorId: staff.id,
    action: "staff.login",
  });
  return { ok: true };
}
