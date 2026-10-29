/** Request header carrying the store slug from src/proxy.ts to src/i18n/request.ts. */
export const STORE_SLUG_HEADER = "x-suatu-store";

const SLUG = "[a-z0-9]+(?:-[a-z0-9]+)*";
// /s/<slug>, /staff/<slug>, /dashboard/<slug> and /legal/<slug>/… (not /legal/privacy).
const STORE_PATH = new RegExp(`^/(?:s|staff|dashboard)/(${SLUG})(?:/|$)|^/legal/(${SLUG})/`);

/** The store a page belongs to, from its path (storeUrl's areas), or null outside a store. */
export function storeSlugFromPath(pathname: string): string | null {
  const match = STORE_PATH.exec(pathname);
  return match?.[1] ?? match?.[2] ?? null;
}
