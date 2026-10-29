import "server-only";
import { toCsv, type CsvCell } from "@/lib/csv";
import { maskEmail } from "@/lib/mask";
import { maskPhone } from "@/lib/phone";
import { recordAudit } from "@/server/audit";
import type { StaffMember } from "@/server/staff/session";
import type { Store } from "@/server/stores/getStore";
import { supabaseAdmin } from "@/server/supabase/admin";

const BATCH = 1000;

/** Every customer of the store as CSV (§11), masked like the dashboard. The export is audited. */
export async function customersCsv(store: Store, manager: StaffMember): Promise<string> {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: store.timezone });
  const rows: CsvCell[][] = [
    [
      "First name",
      "Last name",
      "Phone",
      "Email",
      "Status",
      "Joined",
      "Last visit",
      "Visits",
      "Points",
      "Offer emails",
    ],
  ];

  for (let from = 0; ; from += BATCH) {
    const { data, error } = await supabaseAdmin()
      .from("store_customers")
      .select(
        "joined_at, last_visit_at, visit_count, points_balance, marketing_email_consent, customer:customer_id!inner (status, first_name, last_name, phone_e164, email)",
      )
      .eq("store_id", store.id)
      .neq("customer.status", "deleted")
      .order("joined_at")
      .range(from, from + BATCH - 1);
    if (error) throw new Error(`Customer export failed: ${error.message}`);
    for (const row of data) {
      const { customer } = row;
      rows.push([
        customer.first_name,
        customer.last_name,
        customer.phone_e164 ? maskPhone(customer.phone_e164) : null,
        customer.email ? maskEmail(customer.email) : null,
        customer.status === "active" ? "Signed up" : "Not signed up yet",
        day.format(new Date(row.joined_at)),
        row.last_visit_at ? day.format(new Date(row.last_visit_at)) : null,
        row.visit_count,
        row.points_balance,
        row.marketing_email_consent ? "Yes" : "No",
      ]);
    }
    if (data.length < BATCH) break;
  }

  await recordAudit({
    storeId: store.id,
    actorType: "staff",
    actorId: manager.id,
    action: "customers.exported",
    details: { rows: rows.length - 1 },
  });
  return toCsv(rows);
}
