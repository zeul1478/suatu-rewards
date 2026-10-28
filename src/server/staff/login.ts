import "server-only";
import { verify } from "@node-rs/argon2";
import { recordAudit } from "@/server/audit";
import { isProduction } from "@/server/env";
import { supabaseAdmin } from "@/server/supabase/admin";
import { clearFailures, lockedUntil, minutesLeft, recordFailure } from "@/server/throttle";
import { staffPasswordAllowed } from "./passwordPolicy";
import { startStaffSession } from "./session";

export type StaffLoginResult =
  | { ok: true }
  | { ok: false; error: "invalid" }
  | { ok: false; error: "needsRealPassword" }
  | { ok: false; error: "locked"; minutes: number }
  | { ok: false; error: "ipLimited"; minutes: number };

// Verified against when the user name doesn't exist, so both cases take the same time.
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$NNMgCqOF1rmfLkaR9/w2bA$Pxnqh73ohMyiTIiaO5sVU8UxDKi+GxPbfeUGbUtH+OA";

/** Staff login (§6): user name + password, argon2id, 5 failures → 15-minute lock. */
export async function logInStaff(input: {
  storeId: string;
  staffCode: string;
  password: string;
  ip: string;
}): Promise<StaffLoginResult> {
  const ipLock = await lockedUntil("ip", input.ip);
  if (ipLock) return { ok: false, error: "ipLimited", minutes: minutesLeft(ipLock) };

  const throttleKey = `${input.storeId}:${input.staffCode.toLowerCase()}`;
  const accountLock = await lockedUntil("staff_login", throttleKey);
  if (accountLock) return { ok: false, error: "locked", minutes: minutesLeft(accountLock) };

  const { data: staff } = await supabaseAdmin()
    .from("staff")
    .select("id, password_hash, active")
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

  if (!staffPasswordAllowed(input.password, { production: isProduction() })) {
    return { ok: false, error: "needsRealPassword" };
  }

  await clearFailures("staff_login", throttleKey);
  await supabaseAdmin()
    .from("staff")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", staff.id);
  await startStaffSession(staff.id, input.storeId);
  await recordAudit({
    storeId: input.storeId,
    actorType: "staff",
    actorId: staff.id,
    action: "staff.login",
  });
  return { ok: true };
}
