import "server-only";
import type { Store } from "@/server/stores/getStore";
import { supabaseForCustomer } from "@/server/supabase/session";
import type { CurrentCustomer } from "./currentCustomer";

export type HistoryEntry = {
  id: string;
  type: "earn" | "redeem" | "adjust" | "reversal" | "expire";
  points: number;
  /** Reward name for redemptions, the owner's note for adjustments. */
  note: string | null;
  /** Formatted on the server in the store's time zone (see DECISIONS D39). */
  when: string;
};

const PAGE_SIZE = 100;

/** The customer's points history at this store, newest first (spec §11 History). */
export async function getHistory(store: Store, customer: CurrentCustomer): Promise<HistoryEntry[]> {
  // RLS-scoped read: this client can only see the customer's own ledger rows.
  const supabase = await supabaseForCustomer();
  const { data, error } = await supabase
    .from("point_transactions")
    .select("id, type, points, note, created_at")
    .eq("store_id", store.id)
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (error) throw new Error(`History lookup failed: ${error.message}`);

  const format = new Intl.DateTimeFormat(store.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: store.timezone,
  });
  return data.map((row) => ({
    id: row.id,
    type: row.type as HistoryEntry["type"],
    points: row.points,
    note: row.note,
    when: format.format(new Date(row.created_at)),
  }));
}
