import "server-only";
import type { CurrentCustomer } from "@/server/customers/currentCustomer";
import type { StaffMember } from "@/server/staff/session";
import type { Store } from "@/server/stores/getStore";
import { supabaseAdmin } from "@/server/supabase/admin";
import { clearFailures, lockedUntil, minutesLeft, recordFailure } from "@/server/throttle";

/*
 * Redemption (§0 steps 7–9): the customer taps Redeem and gets a 6-digit code valid 5 minutes;
 * staff type the code; only then do points move. Codes are throttled per staff member:
 * 5 wrong codes → that staff member can't redeem for 15 minutes.
 */

export type PendingRedemption = {
  id: string;
  code: string;
  expiresAt: string;
  /** Measured on the server, so a phone with a wrong clock still counts down correctly. */
  secondsLeft: number;
  rewardId: string;
  rewardName: string;
};

export async function startRedemption(input: {
  store: Store;
  customer: CurrentCustomer;
  rewardId: string;
}): Promise<{ ok: true } | { ok: false; error: "notEnoughPoints" | "rewardNotFound" }> {
  const { error } = await supabaseAdmin().rpc("create_redemption", {
    p_store_id: input.store.id,
    p_customer_id: input.customer.id,
    p_reward_id: input.rewardId,
  });
  if (error?.message === "not_enough_points") return { ok: false, error: "notEnoughPoints" };
  if (error?.message === "reward_not_found") return { ok: false, error: "rewardNotFound" };
  if (error) throw new Error(`create_redemption failed: ${error.message}`);
  return { ok: true };
}

/** The customer's live code at this store, if any. */
export async function getPendingRedemption(
  store: Store,
  customer: CurrentCustomer,
): Promise<PendingRedemption | null> {
  const { data } = await supabaseAdmin()
    .from("redemptions")
    .select("id, code, expires_at, reward_id, reward:reward_id (name)")
    .eq("store_id", store.id)
    .eq("customer_id", customer.id)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.reward) return null;
  return {
    id: data.id,
    code: data.code,
    expiresAt: data.expires_at,
    secondsLeft: Math.max(0, Math.round((new Date(data.expires_at).getTime() - Date.now()) / 1000)),
    rewardId: data.reward_id,
    rewardName: data.reward.name,
  };
}

/** Whether a given redemption has been confirmed at the counter (for the customer's code screen). */
export async function redemptionCompleted(
  store: Store,
  customer: CurrentCustomer,
  redemptionId: string,
): Promise<boolean> {
  const { data } = await supabaseAdmin()
    .from("redemptions")
    .select("status")
    .eq("id", redemptionId)
    .eq("store_id", store.id)
    .eq("customer_id", customer.id)
    .maybeSingle();
  return data?.status === "completed";
}

export type RedeemCodeResult =
  | { ok: true; rewardName: string; phoneLast4: string; balance: number }
  | { ok: false; error: "invalidCode" | "notEnoughPoints" }
  | { ok: false; error: "locked"; minutes: number };

export async function redeemCode(input: {
  store: Store;
  staff: StaffMember;
  code: string;
}): Promise<RedeemCodeResult> {
  const lock = await lockedUntil("redeem_code", input.staff.id);
  if (lock) return { ok: false, error: "locked", minutes: minutesLeft(lock) };

  const { data, error } = await supabaseAdmin().rpc("complete_redemption", {
    p_store_id: input.store.id,
    p_code: input.code,
    p_staff_id: input.staff.id,
  });
  if (error?.message === "invalid_code") {
    const newLock = await recordFailure("redeem_code", input.staff.id);
    if (newLock) return { ok: false, error: "locked", minutes: minutesLeft(newLock) };
    return { ok: false, error: "invalidCode" };
  }
  if (error?.message === "not_enough_points") return { ok: false, error: "notEnoughPoints" };
  if (error || !data) throw new Error(`complete_redemption failed: ${error?.message}`);

  await clearFailures("redeem_code", input.staff.id);
  const row = data as unknown as {
    reward_name: string;
    phone_e164: string | null;
    balance: number;
  };
  return {
    ok: true,
    rewardName: row.reward_name,
    phoneLast4: row.phone_e164?.slice(-4) ?? "",
    balance: row.balance,
  };
}
