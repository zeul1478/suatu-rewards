import "server-only";
import { toAuthSecret } from "@/lib/password/authSecret";
import { checkPassword, type PasswordIssue } from "@/lib/password/rules";
import { recordAudit } from "@/server/audit";
import { supabaseDetached } from "@/server/supabase/admin";
import { supabaseForCustomer } from "@/server/supabase/session";
import { lockedUntil, minutesLeft, recordFailure } from "@/server/throttle";
import type { CurrentCustomer } from "./currentCustomer";

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; error: "currentWrong" }
  | { ok: false; error: "locked"; minutes: number }
  | { ok: false; error: PasswordIssue };

/**
 * Change password (§4.3b): the current password is required and counts toward the login lockout.
 * Every other device is signed out; this one stays signed in.
 */
export async function changePassword(input: {
  customer: CurrentCustomer;
  currentPassword: string;
  newPassword: string;
}): Promise<ChangePasswordResult> {
  const { customer } = input;
  const lock = await lockedUntil("customer_phone", customer.phoneE164);
  if (lock) return { ok: false, error: "locked", minutes: minutesLeft(lock) };

  const issue = checkPassword(input.newPassword, {
    phoneE164: customer.phoneE164,
    email: customer.email,
  });
  if (issue) return { ok: false, error: issue };

  const check = supabaseDetached();
  const { error: currentError } = await check.auth.signInWithPassword({
    phone: customer.phoneE164,
    password: toAuthSecret(input.currentPassword),
  });
  if (currentError) {
    const newLock = await recordFailure("customer_phone", customer.phoneE164);
    if (newLock) return { ok: false, error: "locked", minutes: minutesLeft(newLock) };
    return { ok: false, error: "currentWrong" };
  }
  // That check created a short-lived session of its own; close it.
  await check.auth.signOut({ scope: "local" });

  const supabase = await supabaseForCustomer();
  const { error: updateError } = await supabase.auth.updateUser({
    password: toAuthSecret(input.newPassword),
  });
  if (updateError) throw new Error(`Password update failed: ${updateError.message}`);
  await supabase.auth.signOut({ scope: "others" });

  await recordAudit({
    actorType: "customer",
    actorId: customer.id,
    action: "customer.password_changed",
  });
  return { ok: true };
}
