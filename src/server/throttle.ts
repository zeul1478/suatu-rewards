import "server-only";
import { serverEnv } from "@/server/env";
import { supabaseAdmin } from "@/server/supabase/admin";

/**
 * Rate limits (§4.2, §6, §8). Counts and locks live in Postgres (auth_throttles) so they hold
 * across server restarts and multiple servers. Reviewed in Milestone 8 (docs/DECISIONS.md D67).
 *
 * - Per account (customer phone / staff or admin user name) and per staff member entering
 *   redemption codes: 5 failures in 15 min → locked 15 min.
 * - Per IP: LOGIN_MAX_FAILURES_PER_IP failed logins (and reset requests) in 15 min → 15 min pause.
 * - Sign-ups per IP: 20 attempts an hour, then an hour's pause (fake-account and
 *   "is this number registered?" probing).
 * - Password-reset emails per phone number: 3 an hour, so nobody can flood someone's inbox.
 */

export type ThrottleScope =
  | "customer_phone"
  | "staff_login"
  | "admin_login"
  | "ip"
  | "redeem_code"
  | "signup_ip"
  | "reset_email";

type Limit = { max: () => number; window: string; lock: string };

const ACCOUNT: Limit = { max: () => 5, window: "15 minutes", lock: "15 minutes" };
const LIMITS: Record<ThrottleScope, Limit> = {
  customer_phone: ACCOUNT,
  staff_login: ACCOUNT,
  admin_login: ACCOUNT,
  redeem_code: ACCOUNT,
  ip: {
    max: () => serverEnv().LOGIN_MAX_FAILURES_PER_IP,
    window: "15 minutes",
    lock: "15 minutes",
  },
  signup_ip: { max: () => 20, window: "1 hour", lock: "1 hour" },
  reset_email: { max: () => 3, window: "1 hour", lock: "1 hour" },
};

export async function lockedUntil(scope: ThrottleScope, key: string): Promise<Date | null> {
  const { data, error } = await supabaseAdmin().rpc("auth_throttle_locked_until", {
    p_scope: scope,
    p_key: key,
  });
  if (error) throw new Error(`Throttle check failed: ${error.message}`);
  return data ? new Date(data) : null;
}

/**
 * Records a failure (or, for the sign-up and email limits, an attempt); returns the lock end
 * time when this one triggered a lock.
 */
export async function recordFailure(scope: ThrottleScope, key: string): Promise<Date | null> {
  const limit = LIMITS[scope];
  const { data, error } = await supabaseAdmin().rpc("auth_throttle_fail", {
    p_scope: scope,
    p_key: key,
    p_max: limit.max(),
    p_window: limit.window,
    p_lock: limit.lock,
  });
  if (error) throw new Error(`Throttle update failed: ${error.message}`);
  return data ? new Date(data) : null;
}

export async function clearFailures(scope: ThrottleScope, key: string): Promise<void> {
  const { error } = await supabaseAdmin().rpc("auth_throttle_clear", {
    p_scope: scope,
    p_key: key,
  });
  if (error) throw new Error(`Throttle clear failed: ${error.message}`);
}

/** Whole minutes left on a lock, at least 1, for "try again in N minutes". */
export function minutesLeft(until: Date, now: Date = new Date()): number {
  return Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 60_000));
}
