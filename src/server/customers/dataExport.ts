import "server-only";
import { supabaseAdmin } from "@/server/supabase/admin";
import type { CurrentCustomer } from "./currentCustomer";

/**
 * "Download my data" (spec §4.4, CCPA right to know): everything stored about the customer,
 * as JSON. Never includes the password (only a hash exists, and it isn't exported either) or
 * internal IDs of other people (staff are named by role only).
 */
export async function exportCustomerData(customer: CurrentCustomer) {
  const admin = supabaseAdmin();
  const [profile, memberships, ledger, redemptions, consents] = await Promise.all([
    admin
      .from("customers")
      .select("phone_e164, email, first_name, last_name, birthday, email_verified_at, created_at")
      .eq("id", customer.id)
      .single(),
    admin
      .from("store_customers")
      .select(
        "joined_at, last_visit_at, visit_count, points_balance, program_terms_accepted_at, program_terms_version, privacy_accepted_at, privacy_version, marketing_email_consent, marketing_email_consent_at, store:store_id (name)",
      )
      .eq("customer_id", customer.id),
    admin
      .from("point_transactions")
      .select("type, points, note, created_at, store:store_id (name)")
      .eq("customer_id", customer.id)
      .order("created_at"),
    admin
      .from("redemptions")
      .select("status, created_at, completed_at, reward:reward_id (name), store:store_id (name)")
      .eq("customer_id", customer.id)
      .order("created_at"),
    admin
      .from("consent_events")
      .select("kind, document_version, granted, source, created_at")
      .eq("customer_id", customer.id)
      .order("created_at"),
  ]);

  for (const result of [profile, memberships, ledger, redemptions, consents]) {
    if (result.error) throw new Error(`Export failed: ${result.error.message}`);
  }

  return {
    exportedAt: new Date().toISOString(),
    profile: profile.data,
    memberships: memberships.data,
    pointsHistory: ledger.data,
    redemptions: redemptions.data,
    consents: consents.data,
  };
}
