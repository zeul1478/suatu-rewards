import "server-only";
import { isUuid } from "@/server/dashboard/customers";
import { supabaseAdmin } from "@/server/supabase/admin";

/*
 * The audit log for the platform admin (§11): who did what, where and when, newest first.
 * Entries never hold personal data (see recordAudit); customers appear only as "Customer".
 */

export const AUDIT_PAGE_SIZE = 50;

export type AuditRow = {
  id: string;
  /** "Oct 29, 2026, 14:05:09 UTC" — one clock for every store. */
  time: string;
  store: string | null;
  actorType: "customer" | "staff" | "admin" | "system";
  /** Staff or admin display name; null for customers and the system. */
  actorName: string | null;
  action: string;
  target: string | null;
  details: string;
};

export type AuditFilters = { storeId?: string; action?: string; page: number };

const timeFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "UTC",
});

export async function listAudit(
  filters: AuditFilters,
): Promise<{ rows: AuditRow[]; hasMore: boolean }> {
  const db = supabaseAdmin();
  let query = db
    .from("audit_log")
    .select(
      "id, created_at, actor_type, actor_id, action, target_type, target_id, details, store:store_id (name)",
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(filters.page * AUDIT_PAGE_SIZE, (filters.page + 1) * AUDIT_PAGE_SIZE);
  if (filters.storeId && isUuid(filters.storeId)) query = query.eq("store_id", filters.storeId);
  if (filters.action) query = query.like("action", `${filters.action.replace(/[%_\\]/g, "")}%`);
  const { data, error } = await query;
  if (error) throw new Error(`Audit lookup failed: ${error.message}`);

  // One page asks one more row than it shows, to know whether there's a next page.
  const page = data.slice(0, AUDIT_PAGE_SIZE);
  const names = await actorNames(page);
  return {
    hasMore: data.length > AUDIT_PAGE_SIZE,
    rows: page.map((row) => ({
      id: row.id,
      time: `${timeFormat.format(new Date(row.created_at))} UTC`,
      store: row.store?.name ?? null,
      actorType: row.actor_type as AuditRow["actorType"],
      actorName: row.actor_id ? (names.get(row.actor_id) ?? null) : null,
      action: row.action,
      target: row.target_type
        ? `${row.target_type}${row.target_id ? ` ${row.target_id.slice(0, 8)}` : ""}`
        : null,
      details: describeDetails(row.details),
    })),
  };
}

/** Display names of the staff and admins in these rows, in two lookups. */
async function actorNames(
  rows: { actor_type: string; actor_id: string | null }[],
): Promise<Map<string, string>> {
  const idsOf = (type: string) => [
    ...new Set(rows.filter((r) => r.actor_type === type && r.actor_id).map((r) => r.actor_id!)),
  ];
  const staffIds = idsOf("staff");
  const adminIds = idsOf("admin");
  const db = supabaseAdmin();
  const [staff, admins] = await Promise.all([
    staffIds.length
      ? db.from("staff").select("id, display_name").in("id", staffIds)
      : { data: [], error: null },
    adminIds.length
      ? db.from("platform_admins").select("id, display_name").in("id", adminIds)
      : { data: [], error: null },
  ]);
  if (staff.error) throw new Error(`Staff lookup failed: ${staff.error.message}`);
  if (admins.error) throw new Error(`Admin lookup failed: ${admins.error.message}`);
  return new Map([...staff.data, ...admins.data].map((row) => [row.id, row.display_name]));
}

/** `{"points": 5, "new_customer": true}` → "points 5 · new_customer true". Ids are shortened. */
export function describeDetails(details: unknown): string {
  if (!details || typeof details !== "object" || Array.isArray(details)) return "";
  return Object.entries(details)
    .map(([key, value]) => {
      const text = typeof value === "string" ? value : JSON.stringify(value);
      return `${key} ${isUuid(text) ? text.slice(0, 8) : text}`;
    })
    .join(" · ");
}
