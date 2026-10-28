import "server-only";
import { toAuthSecret } from "@/lib/password/authSecret";
import { supabaseAdmin, supabaseDetached } from "@/server/supabase/admin";
import { supabaseForCustomer } from "@/server/supabase/session";
import { lockedUntil, minutesLeft, recordFailure } from "@/server/throttle";
import type { CurrentCustomer } from "./currentCustomer";

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; error: "passwordWrong" }
  | { ok: false; error: "locked"; minutes: number };

/**
 * Delete my account (spec §4.4, §8): confirmed with the password (counts toward the login
 * lockout). Name, phone and email are erased; the points history stays, anonymous. The login is
 * removed and this device signed out. The phone number can then be used for a new account.
 */
export async function deleteAccount(input: {
  customer: CurrentCustomer;
  password: string;
}): Promise<DeleteAccountResult> {
  const { customer } = input;
  const lock = await lockedUntil("customer_phone", customer.phoneE164);
  if (lock) return { ok: false, error: "locked", minutes: minutesLeft(lock) };

  const check = supabaseDetached();
  const { error: passwordError } = await check.auth.signInWithPassword({
    phone: customer.phoneE164,
    password: toAuthSecret(input.password),
  });
  if (passwordError) {
    const newLock = await recordFailure("customer_phone", customer.phoneE164);
    if (newLock) return { ok: false, error: "locked", minutes: minutesLeft(newLock) };
    return { ok: false, error: "passwordWrong" };
  }

  const admin = supabaseAdmin();
  const { error } = await admin.rpc("anonymize_customer", { p_customer_id: customer.id });
  if (error) throw new Error(`Account deletion failed: ${error.message}`);

  // Removing the Auth user also ends every session on every device.
  const { error: authError } = await admin.auth.admin.deleteUser(customer.authUserId);
  if (authError) throw new Error(`Auth user deletion failed: ${authError.message}`);

  // Clear this device's cookies (the session itself is already gone).
  const supabase = await supabaseForCustomer();
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  return { ok: true };
}
