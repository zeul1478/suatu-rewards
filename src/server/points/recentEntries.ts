import "server-only";
import { maskPhone } from "@/lib/phone";
import { displayName } from "@/lib/progress";
import type { StaffMember } from "@/server/staff/session";
import type { Store } from "@/server/stores/getStore";
import { supabaseAdmin } from "@/server/supabase/admin";

export const VOID_WINDOW_MS = 10 * 60 * 1000;
const SHOWN = 15;

export type RecentEntry = {
  id: string;
  /** "Andrei P." when signed up, otherwise "••• 0142". Never the full phone number. */
  customer: string;
  points: number;
  /** Time in the store's time zone, formatted on the server. */
  time: string;
  voided: boolean;
  /** Seconds left to void it; 0 when it can't be voided any more. */
  voidableForSeconds: number;
};

/** This cashier's latest visits at this store (spec §11 staff screen: recent entries). */
export async function getRecentEntries(store: Store, staff: StaffMember): Promise<RecentEntry[]> {
  const { data, error } = await supabaseAdmin()
    .from("point_transactions")
    .select(
      "id, points, created_at, customer:customer_id (first_name, last_name, phone_e164, status), reversals:point_transactions!reverses_transaction_id (id)",
    )
    .eq("store_id", store.id)
    .eq("staff_id", staff.id)
    .eq("type", "earn")
    .order("created_at", { ascending: false })
    .limit(SHOWN);
  if (error) throw new Error(`Recent entries lookup failed: ${error.message}`);

  const format = new Intl.DateTimeFormat(store.locale, {
    timeStyle: "short",
    timeZone: store.timezone,
  });
  const now = Date.now();
  return data.map((row) => {
    const voided = row.reversals.length > 0;
    const age = now - new Date(row.created_at).getTime();
    const name =
      row.customer?.status === "active"
        ? displayName(row.customer.first_name, row.customer.last_name)
        : null;
    return {
      id: row.id,
      customer: name ?? (row.customer?.phone_e164 ? maskPhone(row.customer.phone_e164) : "—"),
      points: row.points,
      time: format.format(new Date(row.created_at)),
      voided,
      voidableForSeconds: voided ? 0 : Math.max(0, Math.floor((VOID_WINDOW_MS - age) / 1000)),
    };
  });
}

export type VoidResult =
  | { ok: true; points: number; balance: number }
  | {
      ok: false;
      error: "notFound" | "notOwnEntry" | "tooLate" | "alreadyVoided" | "pointsAlreadyUsed";
    };

const errors: Record<string, Exclude<VoidResult, { ok: true }>["error"]> = {
  not_found: "notFound",
  not_own_entry: "notOwnEntry",
  too_late: "tooLate",
  already_voided: "alreadyVoided",
  points_already_used: "pointsAlreadyUsed",
};

/** Void: undo the cashier's own visit within 10 minutes, as a reversal in the ledger (§6). */
export async function voidEntry(input: {
  store: Store;
  staff: StaffMember;
  transactionId: string;
}): Promise<VoidResult> {
  const { data, error } = await supabaseAdmin().rpc("void_transaction", {
    p_store_id: input.store.id,
    p_transaction_id: input.transactionId,
    p_staff_id: input.staff.id,
  });
  if (error) {
    const known = errors[error.message];
    if (known) return { ok: false, error: known };
    throw new Error(`void_transaction failed: ${error.message}`);
  }
  const row = data as unknown as { points: number; balance: number };
  return { ok: true, points: row.points, balance: row.balance };
}
