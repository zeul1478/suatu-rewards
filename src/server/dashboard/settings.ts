import "server-only";
import { recordAudit } from "@/server/audit";
import type { StaffMember } from "@/server/staff/session";
import type { Store } from "@/server/stores/getStore";
import { supabaseAdmin } from "@/server/supabase/admin";

export const POINTS_PER_VISIT_MAX = 100;
/** Same bounds as the database checks (20261030100000_fraud_guards.sql). */
export const MAX_VISITS_PER_DAY_MAX = 50;
export const MIN_MINUTES_BETWEEN_VISITS_MAX = 1440;

export type StoreSettings = {
  pointsPerVisit: number;
  /** null = no limit (D78). */
  maxVisitsPerDay: number | null;
  minMinutesBetweenVisits: number | null;
};

/**
 * Settings (§11): points per visit and the counter limits (D78). They apply from the next visit;
 * balances don't change. Only what changed goes in the audit log.
 */
export async function updateSettings(
  store: Store,
  manager: StaffMember,
  settings: StoreSettings,
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("stores")
    .update({
      points_per_visit: settings.pointsPerVisit,
      max_visits_per_day: settings.maxVisitsPerDay,
      min_minutes_between_visits: settings.minMinutesBetweenVisits,
    })
    .eq("id", store.id);
  if (error) throw new Error(`Settings update failed: ${error.message}`);

  const changes = Object.fromEntries(
    (
      [
        ["points_per_visit", store.pointsPerVisit, settings.pointsPerVisit],
        ["max_visits_per_day", store.maxVisitsPerDay, settings.maxVisitsPerDay],
        [
          "min_minutes_between_visits",
          store.minMinutesBetweenVisits,
          settings.minMinutesBetweenVisits,
        ],
      ] as const
    )
      .filter(([, from, to]) => from !== to)
      .map(([key, from, to]) => [key, { from, to }]),
  );
  if (Object.keys(changes).length === 0) return;
  await recordAudit({
    storeId: store.id,
    actorType: "staff",
    actorId: manager.id,
    action: "store.settings_changed",
    details: changes,
  });
}
