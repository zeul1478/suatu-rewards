import "server-only";
import { serverEnv } from "@/server/env";
import { supabaseAdmin } from "@/server/supabase/admin";

/**
 * Login throttling (§4.2, §6). Counts and locks live in Postgres (auth_throttles) so they hold
 * across server restarts and multiple servers.
 *
 * - Per account (customer phone / staff code): 5 failures in 15 min → locked 15 min.
 * - Per IP: LOGIN_MAX_FAILURES_PER_IP failures in 15 min → that IP paused 15 min.
 */

export type ThrottleScope = "customer_phone" | "staff_login" | "ip";

const ACCOUNT_MAX_FAILURES = 5;
const WINDOW = "15 minutes";
const LOCK = "15 minutes";

export async function lockedUntil(scope: ThrottleScope, key: string): Promise<Date | null> {
  const { data, error } = await supabaseAdmin().rpc("auth_throttle_locked_until", {
    p_scope: scope,
    p_key: key,
  });
  if (error) throw new Error(`Throttle check failed: ${error.message}`);
  return data ? new Date(data) : null;
}

/** Records a failure; returns the lock end time when this failure triggered a lock. */
export async function recordFailure(scope: ThrottleScope, key: string): Promise<Date | null> {
  const { data, error } = await supabaseAdmin().rpc("auth_throttle_fail", {
    p_scope: scope,
    p_key: key,
    p_max: scope === "ip" ? serverEnv().LOGIN_MAX_FAILURES_PER_IP : ACCOUNT_MAX_FAILURES,
    p_window: WINDOW,
    p_lock: LOCK,
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
