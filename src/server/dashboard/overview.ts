import "server-only";
import { displayName } from "@/lib/progress";
import { maskPhone } from "@/lib/phone";
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

export type UnusualActivity = {
  /** Numbers credited 3+ times on one day in the last 7 days, worst first (at most 10). */
  numbers: {
    customerId: string;
    /** "Ana E." for signed-up customers, otherwise the masked number. */
    label: string;
    mostInADay: number;
    days: number;
  }[];
  /** Cashiers with 10+ entries this week, more than half of them to the same three numbers. */
  cashiers: { staffId: string; name: string; visits: number; topThree: number }[];
};

/** The "Unusual activity" card (D78): see dashboard_unusual_activity in the migrations. */
export async function getUnusualActivity(store: Store): Promise<UnusualActivity> {
  const { data, error } = await supabaseAdmin().rpc("dashboard_unusual_activity", {
    p_store_id: store.id,
  });
  if (error) throw new Error(`dashboard_unusual_activity failed: ${error.message}`);
  const row = data as {
    numbers: {
      customer_id: string;
      phone: string | null;
      first_name: string | null;
      last_name: string | null;
      status: string;
      most_in_a_day: number;
      days: number;
    }[];
    cashiers: { staff_id: string; name: string; visits: number; top_three: number }[];
  };
  return {
    numbers: row.numbers.map((n) => ({
      customerId: n.customer_id,
      label:
        (n.status === "active" ? displayName(n.first_name, n.last_name) : null) ??
        (n.phone ? maskPhone(n.phone) : "—"),
      mostInADay: n.most_in_a_day,
      days: n.days,
    })),
    cashiers: row.cashiers.map((c) => ({
      staffId: c.staff_id,
      name: c.name,
      visits: c.visits,
      topThree: c.top_three,
    })),
  };
}
