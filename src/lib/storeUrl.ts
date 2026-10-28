/**
 * Builds every store-scoped URL in the app (spec §5). Today stores live under a
 * path prefix (/s/suatu); routing everything through here means moving to
 * subdomains later only needs middleware, not a hunt through the codebase.
 */

export type StoreArea = "customer" | "staff" | "dashboard" | "legal";

const areaPrefix: Record<StoreArea, string> = {
  customer: "/s",
  staff: "/staff",
  dashboard: "/dashboard",
  legal: "/legal",
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function storeUrl(slug: string, path = "", area: StoreArea = "customer"): string {
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(`Invalid store slug: "${slug}"`);
  }
  if (path !== "" && !path.startsWith("/")) {
    throw new Error(`Store path must start with "/": "${path}"`);
  }
  return `${areaPrefix[area]}/${slug}${path === "/" ? "" : path}`;
}
