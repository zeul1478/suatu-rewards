import "server-only";
import type { Store } from "@/server/stores/getStore";
import { supabaseAdmin } from "@/server/supabase/admin";

export type Overview = {
  members: number;
  signedUp: number;
  visitsToday: number;
  visits7Days: number;
  visits30Days: number;
  visitors30Days: number;
  returning30Days: number;
  redeemedTotal: number;
  redeemed30Days: number;
};

/** Overview tiles (§11), counted in the database: see dashboard_overview in the migrations. */
export async function getOverview(store: Store): Promise<Overview> {
  const { data, error } = await supabaseAdmin().rpc("dashboard_overview", {
    p_store_id: store.id,
  });
  if (error) throw new Error(`dashboard_overview failed: ${error.message}`);
  const row = data as {
    members: number;
    signed_up: number;
    visits_today: number;
    visits_7_days: number;
    visits_30_days: number;
    visitors_30_days: number;
    returning_30_days: number;
    redeemed_total: number;
    redeemed_30_days: number;
  };
  return {
    members: row.members,
    signedUp: row.signed_up,
    visitsToday: row.visits_today,
    visits7Days: row.visits_7_days,
    visits30Days: row.visits_30_days,
    visitors30Days: row.visitors_30_days,
    returning30Days: row.returning_30_days,
    redeemedTotal: row.redeemed_total,
    redeemed30Days: row.redeemed_30_days,
  };
}
