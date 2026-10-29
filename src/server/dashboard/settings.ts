import "server-only";
import { recordAudit } from "@/server/audit";
import type { StaffMember } from "@/server/staff/session";
import type { Store } from "@/server/stores/getStore";
import { supabaseAdmin } from "@/server/supabase/admin";

export const POINTS_PER_VISIT_MAX = 100;

/** Settings (§11): points per visit. Applies to visits from now on; balances don't change. */
export async function updatePointsPerVisit(
  store: Store,
  manager: StaffMember,
  pointsPerVisit: number,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("stores")
    .update({ points_per_visit: pointsPerVisit })
    .eq("id", store.id);
  if (error) throw new Error(`Settings update failed: ${error.message}`);
  await recordAudit({
    storeId: store.id,
    actorType: "staff",
    actorId: manager.id,
    action: "store.settings_changed",
    details: { points_per_visit: { from: store.pointsPerVisit, to: pointsPerVisit } },
  });
}
