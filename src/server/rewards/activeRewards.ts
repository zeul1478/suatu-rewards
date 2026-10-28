import "server-only";
import { cache } from "react";
import type { RewardOption } from "@/lib/progress";
import { supabaseAdmin } from "@/server/supabase/admin";

export const getActiveRewards = cache(async (storeId: string): Promise<RewardOption[]> => {
  const { data, error } = await supabaseAdmin()
    .from("rewards")
    .select("id, name, cost_points")
    .eq("store_id", storeId)
    .eq("active", true)
    .order("cost_points");
  if (error) throw new Error(`Rewards lookup failed: ${error.message}`);
  return data.map((reward) => ({
    id: reward.id,
    name: reward.name,
    costPoints: reward.cost_points,
  }));
});
