import "server-only";
import { hash } from "@node-rs/argon2";
import { isUuid } from "@/server/dashboard/customers";
import { recordAudit } from "@/server/audit";
import { checkNewStaffPassword, type StaffPasswordIssue } from "@/server/staff/passwordPolicy";
import type { Store } from "@/server/stores/getStore";
import { supabaseAdmin } from "@/server/supabase/admin";
import type { PlatformAdmin } from "./session";

/*
 * Stores as the platform admin sees them (/admin, §11): every store whatever its status, the
 * numbers that say whether it's being used, and setting up a new one with its first owner.
 */

export type StoreStatus = "active" | "paused" | "closed";

export type StoreSummary = {
  id: string;
  slug: string;
  name: string;
  country: string;
  locale: string;
  status: StoreStatus;
  members: number;
  staff: number;
  visits30Days: number;
  /** Date of the latest visit in the store's time zone, formatted on the server. */
  lastVisit: string | null;
};

export async function listStores(): Promise<StoreSummary[]> {
  const { data, error } = await supabaseAdmin().rpc("admin_store_summaries");
  if (error) throw new Error(`Store list failed: ${error.message}`);
  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    country: row.country,
    locale: row.locale,
    status: row.status as StoreStatus,
    members: row.members,
    staff: row.staff,
    visits30Days: row.visits_30_days,
    lastVisit: row.last_visit_at
      ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: row.timezone }).format(
          new Date(row.last_visit_at),
        )
      : null,
  }));
}

export type AdminStore = Store & {
  status: StoreStatus;
  country: string;
  currency: string;
  createdAt: string;
};

/** Any store by id, whatever its status (getStoreOr404 only finds active ones). */
export async function getStoreForAdmin(storeId: string): Promise<AdminStore | null> {
  if (!isUuid(storeId)) return null;
  const { data, error } = await supabaseAdmin()
    .from("stores")
    .select(
      "id, slug, name, timezone, locale, points_per_visit, status, country, currency, created_at",
    )
    .eq("id", storeId)
    .maybeSingle();
  if (error) throw new Error(`Store lookup failed: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    timezone: data.timezone,
    locale: data.locale,
    pointsPerVisit: data.points_per_visit,
    status: data.status as StoreStatus,
    country: data.country,
    currency: data.currency,
    createdAt: new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeZone: data.timezone,
    }).format(new Date(data.created_at)),
  };
}

/**
 * Where a new store can be. Each country brings its currency, time zones and app language;
 * adding one here is all it takes (plus a messages file for a new language).
 */
export const STORE_COUNTRIES = {
  US: {
    currency: "USD",
    locale: "en-US",
    timezones: ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"],
  },
  RO: { currency: "RON", locale: "ro-RO", timezones: ["Europe/Bucharest"] },
} as const;

export type StoreCountry = keyof typeof STORE_COUNTRIES;

function countryForTimezone(timezone: string) {
  return (
    Object.entries(STORE_COUNTRIES) as [StoreCountry, (typeof STORE_COUNTRIES)[StoreCountry]][]
  ).find(([, country]) => (country.timezones as readonly string[]).includes(timezone));
}

export type NewStore = {
  name: string;
  slug: string;
  /** One of STORE_COUNTRIES' time zones; it decides the country, currency and language. */
  timezone: string;
  pointsPerVisit: number;
  ownerCode: string;
  ownerName: string;
  ownerPassword: string;
};

export type CreateStoreResult =
  | { ok: true; storeId: string }
  | { ok: false; error: "slugTaken" | "timezoneInvalid" }
  | { ok: false; error: "passwordInvalid"; issue: StaffPasswordIssue };

/** New store + its owner (temporary password, replaced at first login) + "Free coffee, 100". */
export async function createStore(
  admin: PlatformAdmin,
  input: NewStore,
): Promise<CreateStoreResult> {
  const found = countryForTimezone(input.timezone);
  if (!found) return { ok: false, error: "timezoneInvalid" };
  const [countryCode, country] = found;
  const issue = checkNewStaffPassword(input.ownerPassword, { staffCode: input.ownerCode });
  if (issue) return { ok: false, error: "passwordInvalid", issue };

  const { data, error } = await supabaseAdmin().rpc("create_store", {
    p_slug: input.slug,
    p_name: input.name,
    p_country: countryCode,
    p_timezone: input.timezone,
    p_currency: country.currency,
    p_locale: country.locale,
    p_points_per_visit: input.pointsPerVisit,
    p_owner_code: input.ownerCode,
    p_owner_name: input.ownerName,
    p_owner_password_hash: await hash(input.ownerPassword),
    p_admin_id: admin.id,
  });
  // 23505: two admins creating the same address at the same moment.
  if (error?.message === "slug_taken" || error?.code === "23505") {
    return { ok: false, error: "slugTaken" };
  }
  if (error) throw new Error(`create_store failed: ${error.message}`);
  return { ok: true, storeId: data };
}

/**
 * Pause a store (or switch it back on). A paused store's customer app, counter screen and
 * dashboard answer "not found" and its staff are logged out; nothing is deleted.
 */
export async function setStoreStatus(
  admin: PlatformAdmin,
  storeId: string,
  status: "active" | "paused",
): Promise<boolean> {
  if (!isUuid(storeId)) return false;
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("stores")
    .update({ status })
    .eq("id", storeId)
    .neq("status", "closed")
    .select("id");
  if (error) throw new Error(`Store update failed: ${error.message}`);
  if (data.length === 0) return false;

  if (status === "paused") {
    const { error: revokeError } = await db
      .from("staff_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("store_id", storeId)
      .is("revoked_at", null);
    if (revokeError) throw new Error(`Staff session revoke failed: ${revokeError.message}`);
  }
  await recordAudit({
    storeId,
    actorType: "admin",
    actorId: admin.id,
    action: status === "paused" ? "store.paused" : "store.resumed",
    targetType: "store",
    targetId: storeId,
  });
  return true;
}
