import "server-only";
import { toAuthSecret } from "@/lib/password/authSecret";
import { normalizePhone } from "@/lib/phone";
import { supabaseForCustomer } from "@/server/supabase/session";
import { clearFailures, lockedUntil, minutesLeft, recordFailure } from "@/server/throttle";

export type LoginResult =
  | { ok: true }
  | { ok: false; error: "invalid" }
  | { ok: false; error: "locked"; minutes: number }
  | { ok: false; error: "ipLimited"; minutes: number };

/**
 * Phone + password login (§4.2). Wrong phone and wrong password give the same answer. 5 failures
 * for a phone lock it for 15 minutes — even the right password is refused while locked.
 */
export async function logInCustomer(input: {
  phone: string;
  password: string;
  ip: string;
}): Promise<LoginResult> {
  const ipLock = await lockedUntil("ip", input.ip);
  if (ipLock) return { ok: false, error: "ipLimited", minutes: minutesLeft(ipLock) };

  const phone = normalizePhone(input.phone);
  if (!phone) {
    await recordFailure("ip", input.ip);
    return { ok: false, error: "invalid" };
  }

  const phoneLock = await lockedUntil("customer_phone", phone);
  if (phoneLock) return { ok: false, error: "locked", minutes: minutesLeft(phoneLock) };

  const supabase = await supabaseForCustomer();
  const { error } = await supabase.auth.signInWithPassword({
    phone,
    password: toAuthSecret(input.password),
  });

  if (error) {
    const [lock] = await Promise.all([
      recordFailure("customer_phone", phone),
      recordFailure("ip", input.ip),
    ]);
    if (lock) return { ok: false, error: "locked", minutes: minutesLeft(lock) };
    return { ok: false, error: "invalid" };
  }

  await clearFailures("customer_phone", phone);
  return { ok: true };
}

export async function logOutCustomer(): Promise<void> {
  const supabase = await supabaseForCustomer();
  await supabase.auth.signOut({ scope: "local" });
}
