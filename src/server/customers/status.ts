import "server-only";
import { computeProgress, type Progress } from "@/lib/progress";
import { getActiveRewards } from "@/server/rewards/activeRewards";
import { getPendingRedemption, type PendingRedemption } from "@/server/rewards/redemptions";
import type { Store } from "@/server/stores/getStore";
import { supabaseForCustomer } from "@/server/supabase/session";
import type { CurrentCustomer } from "./currentCustomer";

/** Everything the customer home shows; also the JSON the home polls every 3 seconds. */
export type CustomerStatus = {
  progress: Progress;
  lastVisitAt: string | null;
  pendingRedemption: PendingRedemption | null;
};

export async function getCustomerStatus(
  store: Store,
  customer: CurrentCustomer,
): Promise<CustomerStatus> {
  // RLS-scoped read: this client only sees the customer's own membership.
  const supabase = await supabaseForCustomer();
  const [{ data: membership }, rewards, pendingRedemption] = await Promise.all([
    supabase
      .from("store_customers")
      .select("points_balance, last_visit_at")
      .eq("store_id", store.id)
      .eq("customer_id", customer.id)
      .maybeSingle(),
    getActiveRewards(store.id),
    getPendingRedemption(store, customer),
  ]);

  return {
    progress: computeProgress({
      balance: membership?.points_balance ?? 0,
      pointsPerVisit: store.pointsPerVisit,
      rewards,
    }),
    lastVisitAt: membership?.last_visit_at ?? null,
    pendingRedemption,
  };
}
