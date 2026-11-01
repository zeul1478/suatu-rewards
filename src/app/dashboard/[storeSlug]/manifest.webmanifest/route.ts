import { brandFor } from "@/brands";
import { manifestResponse, storeManifest } from "@/brands/manifest";
import { storeUrl } from "@/lib/storeUrl";
import { getStoreOr404 } from "@/server/stores/getStore";

/**
 * The owner dashboard as a home-screen app (D86): opens full screen at the dashboard, which asks
 * to log in when signed out. Scope "/" keeps the "Counter screen" button inside the app.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/dashboard/[storeSlug]/manifest.webmanifest">,
) {
  const store = await getStoreOr404((await params).storeSlug);
  const brand = brandFor(store.slug);
  return manifestResponse(
    storeManifest(brand, {
      name: `${brand.shortName} Dashboard`,
      shortName: `${brand.shortName} Owner`,
      startUrl: storeUrl(store.slug, "", "dashboard"),
      scope: "/",
      color: brand.colors.light.page,
    }),
  );
}
