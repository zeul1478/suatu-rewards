import "server-only";
import { maskEmail } from "@/lib/mask";
import { maskPhone } from "@/lib/phone";
import { displayName } from "@/lib/progress";
import { recordAudit } from "@/server/audit";
import type { StaffMember } from "@/server/staff/session";
import type { Store } from "@/server/stores/getStore";
import { supabaseAdmin } from "@/server/supabase/admin";

/*
 * Customers in the owner dashboard (§11). Contact details are always masked here (§14): the
 * owner sees "••• 0142" and "m•••@gmail.com", never the full phone or email.
 */

export const CUSTOMERS_PAGE_SIZE = 50;

export type CustomerRow = {
  id: string;
  /** "Andrei P." once signed up; null for numbers a cashier typed that haven't signed up yet. */
  name: string | null;
  phone: string;
  status: "active" | "unclaimed";
  points: number;
  visits: number;
  lastVisit: string | null;
};

const MEMBER_FIELDS =
  "points_balance, visit_count, last_visit_at, joined_at, marketing_email_consent, customer:customer_id!inner (id, status, first_name, last_name, phone_e164, email, email_verified_at)";

/**
 * Search: digits (4 or more) match the end of the phone number, so "0142" or a full number
 * both work; anything else matches first or last name. Newest visit first.
 */
export async function listCustomers(
  store: Store,
  options: { query?: string; page?: number },
): Promise<{ rows: CustomerRow[]; total: number }> {
  const page = Math.max(1, options.page ?? 1);
  let request = supabaseAdmin()
    .from("store_customers")
    .select(MEMBER_FIELDS, { count: "exact" })
    .eq("store_id", store.id)
    .neq("customer.status", "deleted");

  const query = (options.query ?? "").trim();
  const digits = query.replace(/\D/g, "");
  if (digits.length >= 4 && !/[a-z]/i.test(query)) {
    // A 10-digit US number typed without +1 still matches the end of +1XXXXXXXXXX.
    request = request.like("customer.phone_e164", `%${digits}`);
  } else if (query) {
    // Letters, spaces, hyphens and apostrophes only: keeps PostgREST's filter syntax intact.
    const name = query.replace(/[^\p{L}\p{M}\s'-]/gu, "").trim();
    if (name) {
      request = request.or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`, {
        referencedTable: "customer",
      });
    }
  }

  const from = (page - 1) * CUSTOMERS_PAGE_SIZE;
  const { data, error, count } = await request
    .order("last_visit_at", { ascending: false, nullsFirst: false })
    .order("joined_at", { ascending: false })
    .range(from, from + CUSTOMERS_PAGE_SIZE - 1);
  if (error) throw new Error(`Customer list failed: ${error.message}`);

  const format = dateFormat(store);
  return {
    total: count ?? 0,
    rows: data.map((row) => ({
      id: row.customer.id,
      name: displayName(row.customer.first_name, row.customer.last_name),
      phone: row.customer.phone_e164 ? maskPhone(row.customer.phone_e164) : "—",
      status: row.customer.status as CustomerRow["status"],
      points: row.points_balance,
      visits: row.visit_count,
      lastVisit: row.last_visit_at ? format.format(new Date(row.last_visit_at)) : null,
    })),
  };
}

export type LedgerEntry = {
  id: string;
  type: "earn" | "redeem" | "adjust" | "reversal" | "expire";
  points: number;
  note: string | null;
  staff: string | null;
  when: string;
};

export type CustomerDetail = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  email: string | null;
  emailConfirmed: boolean;
  status: "active" | "unclaimed";
  points: number;
  visits: number;
  joined: string;
  lastVisit: string | null;
  offerEmails: boolean;
  history: LedgerEntry[];
};

const HISTORY_SHOWN = 50;

/** One customer of this store, or null (not a member here, or deleted). */
export async function getCustomerDetail(
  store: Store,
  customerId: string,
): Promise<CustomerDetail | null> {
  if (!isUuid(customerId)) return null;
  const admin = supabaseAdmin();
  const { data: member, error } = await admin
    .from("store_customers")
    .select(MEMBER_FIELDS)
    .eq("store_id", store.id)
    .eq("customer_id", customerId)
    .neq("customer.status", "deleted")
    .maybeSingle();
  if (error) throw new Error(`Customer lookup failed: ${error.message}`);
  if (!member) return null;

  const { data: ledger, error: ledgerError } = await admin
    .from("point_transactions")
    .select("id, type, points, note, created_at, staff:staff_id (display_name)")
    .eq("store_id", store.id)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_SHOWN);
  if (ledgerError) throw new Error(`Ledger lookup failed: ${ledgerError.message}`);

  const { customer } = member;
  const date = dateFormat(store);
  const dateTime = new Intl.DateTimeFormat(store.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: store.timezone,
  });
  return {
    id: customer.id,
    name: displayName(customer.first_name, customer.last_name),
    firstName: customer.first_name,
    lastName: customer.last_name,
    phone: customer.phone_e164 ? maskPhone(customer.phone_e164) : "—",
    email: customer.email ? maskEmail(customer.email) : null,
    emailConfirmed: Boolean(customer.email_verified_at),
    status: customer.status as CustomerDetail["status"],
    points: member.points_balance,
    visits: member.visit_count,
    joined: date.format(new Date(member.joined_at)),
    lastVisit: member.last_visit_at ? date.format(new Date(member.last_visit_at)) : null,
    offerEmails: member.marketing_email_consent,
    history: ledger.map((row) => ({
      id: row.id,
      type: row.type as LedgerEntry["type"],
      points: row.points,
      note: row.note,
      staff: row.staff?.display_name ?? null,
      when: dateTime.format(new Date(row.created_at)),
    })),
  };
}

export type AdjustResult =
  | { ok: true; points: number; balance: number }
  | { ok: false; error: "notFound" | "balanceBelowZero" | "invalidPoints" | "noteRequired" };

const adjustErrors: Record<string, Exclude<AdjustResult, { ok: true }>["error"]> = {
  not_found: "notFound",
  balance_below_zero: "balanceBelowZero",
  invalid_points: "invalidPoints",
  note_required: "noteRequired",
};

/** Owner adjustment (§7 adjust_points): ± points with a required note, never below zero. */
export async function adjustPoints(input: {
  store: Store;
  manager: StaffMember;
  customerId: string;
  points: number;
  note: string;
  idempotencyKey: string;
}): Promise<AdjustResult> {
  if (!isUuid(input.customerId)) return { ok: false, error: "notFound" };
  const { data, error } = await supabaseAdmin().rpc("adjust_points", {
    p_store_id: input.store.id,
    p_customer_id: input.customerId,
    p_points: input.points,
    p_note: input.note,
    p_staff_id: input.manager.id,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) {
    const known = adjustErrors[error.message];
    if (known) return { ok: false, error: known };
    throw new Error(`adjust_points failed: ${error.message}`);
  }
  const row = data as { points: number; balance: number };
  return { ok: true, points: row.points, balance: row.balance };
}

/**
 * Release a phone number (DECISIONS D4): someone signed up with a number that isn't theirs, or
 * a cashier mistyped one. The account is anonymized like "Delete my account" (history kept,
 * personal data erased, login removed) and the number is free for a new sign-up.
 */
export async function releaseNumber(input: {
  store: Store;
  manager: StaffMember;
  customerId: string;
  reason: string;
}): Promise<{ ok: true } | { ok: false; error: "notFound" }> {
  if (!isUuid(input.customerId)) return { ok: false, error: "notFound" };
  const admin = supabaseAdmin();
  const { data: member } = await admin
    .from("store_customers")
    .select("customer:customer_id!inner (id, status, auth_user_id)")
    .eq("store_id", input.store.id)
    .eq("customer_id", input.customerId)
    .neq("customer.status", "deleted")
    .maybeSingle();
  if (!member) return { ok: false, error: "notFound" };

  const { error } = await admin.rpc("anonymize_customer", { p_customer_id: input.customerId });
  if (error) throw new Error(`Release failed: ${error.message}`);
  if (member.customer.auth_user_id) {
    const { error: authError } = await admin.auth.admin.deleteUser(member.customer.auth_user_id);
    if (authError) throw new Error(`Auth user deletion failed: ${authError.message}`);
  }
  await recordAudit({
    storeId: input.store.id,
    actorType: "staff",
    actorId: input.manager.id,
    action: "customer.number_released",
    targetType: "customer",
    targetId: input.customerId,
    details: { was: member.customer.status, reason: input.reason },
  });
  return { ok: true };
}

function dateFormat(store: Store) {
  return new Intl.DateTimeFormat(store.locale, { dateStyle: "medium", timeZone: store.timezone });
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
