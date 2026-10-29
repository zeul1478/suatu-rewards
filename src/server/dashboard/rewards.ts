import "server-only";
import { recordAudit } from "@/server/audit";
import type { StaffMember } from "@/server/staff/session";
import type { Store } from "@/server/stores/getStore";
import { supabaseAdmin } from "@/server/supabase/admin";
import { isUuid } from "./customers";

/*
 * Rewards in the owner dashboard (§11 rewards CRUD). A reward someone has already redeemed
 * can't be deleted (its history points at it); it can be turned off instead.
 */

export type RewardRow = {
  id: string;
  name: string;
  costPoints: number;
  active: boolean;
  redeemed: number;
};

export async function listRewards(store: Store): Promise<RewardRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("rewards")
    .select("id, name, cost_points, active, redemptions (count)")
    .eq("store_id", store.id)
    .eq("redemptions.status", "completed")
    .order("cost_points")
    .order("created_at");
  if (error) throw new Error(`Rewards lookup failed: ${error.message}`);
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    costPoints: row.cost_points,
    active: row.active,
    redeemed: row.redemptions[0]?.count ?? 0,
  }));
}

export type RewardInput = { name: string; costPoints: number; active: boolean };

export async function createReward(store: Store, manager: StaffMember, input: RewardInput) {
  const { data, error } = await supabaseAdmin()
    .from("rewards")
    .insert({
      store_id: store.id,
      name: input.name,
      cost_points: input.costPoints,
      active: input.active,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Reward insert failed: ${error.message}`);
  await audit(store, manager, "reward.created", data.id, input);
}

export async function updateReward(
  store: Store,
  manager: StaffMember,
  rewardId: string,
  input: RewardInput,
): Promise<boolean> {
  if (!isUuid(rewardId)) return false;
  const { data, error } = await supabaseAdmin()
    .from("rewards")
    .update({ name: input.name, cost_points: input.costPoints, active: input.active })
    .eq("store_id", store.id)
    .eq("id", rewardId)
    .select("id");
  if (error) throw new Error(`Reward update failed: ${error.message}`);
  if (data.length === 0) return false;
  await audit(store, manager, "reward.updated", rewardId, input);
  return true;
}

export type DeleteRewardResult = { ok: true } | { ok: false; error: "notFound" | "inUse" };

export async function deleteReward(
  store: Store,
  manager: StaffMember,
  rewardId: string,
): Promise<DeleteRewardResult> {
  if (!isUuid(rewardId)) return { ok: false, error: "notFound" };
  const admin = supabaseAdmin();
  const { count } = await admin
    .from("redemptions")
    .select("id", { count: "exact", head: true })
    .eq("reward_id", rewardId);
  if ((count ?? 0) > 0) return { ok: false, error: "inUse" };

  const { data, error } = await admin
    .from("rewards")
    .delete()
    .eq("store_id", store.id)
    .eq("id", rewardId)
    .select("id");
  if (error) throw new Error(`Reward delete failed: ${error.message}`);
  if (data.length === 0) return { ok: false, error: "notFound" };
  await audit(store, manager, "reward.deleted", rewardId, {});
  return { ok: true };
}

function audit(
  store: Store,
  manager: StaffMember,
  action: string,
  rewardId: string,
  details: Partial<RewardInput>,
) {
  return recordAudit({
    storeId: store.id,
    actorType: "staff",
    actorId: manager.id,
    action,
    targetType: "reward",
    targetId: rewardId,
    details,
  });
}
