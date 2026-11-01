import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { supabaseAdmin } from "@/server/supabase/admin";

export type Store = {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  locale: string;
  pointsPerVisit: number;
  /** The owner's limits at the counter (D78); null = no limit. */
  maxVisitsPerDay: number | null;
  minMinutesBetweenVisits: number | null;
};

/** Active store by URL slug, once per request. Unknown or closed stores are a 404. */
export const getStoreOr404 = cache(async (slug: string): Promise<Store> => {
  const { data, error } = await supabaseAdmin()
    .from("stores")
    .select(
      "id, slug, name, timezone, locale, points_per_visit, max_visits_per_day, min_minutes_between_visits",
    )
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(`Store lookup failed: ${error.message}`);
  if (!data) notFound();
  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    timezone: data.timezone,
    locale: data.locale,
    pointsPerVisit: data.points_per_visit,
    maxVisitsPerDay: data.max_visits_per_day,
    minMinutesBetweenVisits: data.min_minutes_between_visits,
  };
});

/**
 * A store's language and time zone for the text on its screens (src/i18n/request.ts), any
 * status, or null for an unknown slug. Unlike getStoreOr404 it never ends the request.
 */
export const getStoreLocale = cache(
  async (slug: string): Promise<{ locale: string; timezone: string } | null> => {
    const { data, error } = await supabaseAdmin()
      .from("stores")
      .select("locale, timezone")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(`Store lookup failed: ${error.message}`);
    return data;
  },
);
