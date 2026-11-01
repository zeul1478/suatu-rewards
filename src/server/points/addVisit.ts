import "server-only";
import { computeProgress, displayName, type Progress } from "@/lib/progress";
import { normalizePhone } from "@/lib/phone";
import { getActiveRewards } from "@/server/rewards/activeRewards";
import type { StaffMember } from "@/server/staff/session";
import type { Store } from "@/server/stores/getStore";
import { supabaseAdmin } from "@/server/supabase/admin";
import { sendQueuedSoon } from "@/server/messages/outbox";

type EarnRow = {
  duplicate: boolean;
  added: number;
  customer_status: "unclaimed" | "active" | "deleted";
  first_name: string | null;
  last_name: string | null;
  is_new_customer: boolean;
  balance: number;
};

export type AddVisitResult =
  | {
      ok: true;
      duplicate: boolean;
      added: number;
      isNewCustomer: boolean;
      /** "Andrei P.", or null when nobody has signed up with this number yet. */
      customerName: string | null;
      phoneLast4: string;
      progress: Progress;
    }
  | { ok: false; error: "phoneInvalid" | "dailyCapReached" | "staffOwnNumber" }
  | { ok: false; error: "tooSoon"; minutesLeft: number };

/**
 * Staff "Add visit" (§0 steps 4, 6, 10): +points for the typed number, creating the customer if
 * it's new. The idempotency key comes from the form, so a double tap or retry counts once.
 */
export async function addVisit(input: {
  store: Store;
  staff: StaffMember;
  phone: string;
  idempotencyKey: string;
}): Promise<AddVisitResult> {
  const phoneE164 = normalizePhone(input.phone);
  if (!phoneE164) return { ok: false, error: "phoneInvalid" };

  const { data, error } = await supabaseAdmin().rpc("earn_points", {
    p_store_id: input.store.id,
    p_phone_e164: phoneE164,
    p_staff_id: input.staff.id,
    p_idempotency_key: input.idempotencyKey,
  });
  // The owner's limits and the staff-number rule (D78), raised by earn_points.
  if (error?.message === "daily_cap_reached") return { ok: false, error: "dailyCapReached" };
  if (error?.message === "staff_own_number") return { ok: false, error: "staffOwnNumber" };
  const tooSoon = error?.message.match(/^too_soon:(\d+)$/);
  if (tooSoon) return { ok: false, error: "tooSoon", minutesLeft: Number(tooSoon[1]) };
  if (error || !data) throw new Error(`earn_points failed: ${error?.message}`);

  // A visit or bonus may have queued a text or email (D84).
  sendQueuedSoon();
  const row = data as unknown as EarnRow;
  const rewards = await getActiveRewards(input.store.id);
  return {
    ok: true,
    duplicate: row.duplicate,
    added: row.added,
    isNewCustomer: row.is_new_customer,
    customerName:
      row.customer_status === "active" ? displayName(row.first_name, row.last_name) : null,
    phoneLast4: phoneE164.slice(-4),
    progress: computeProgress({
      balance: row.balance,
      pointsPerVisit: input.store.pointsPerVisit,
      rewards,
    }),
  };
}
