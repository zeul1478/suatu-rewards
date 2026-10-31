import { brandFor } from "@/brands";
import { manifestResponse, storeManifest } from "@/brands/manifest";
import { storeUrl } from "@/lib/storeUrl";
import { getStoreOr404 } from "@/server/stores/getStore";

/**
 * The counter screen as a home-screen app (D86), for the station's tablet or phone: opens full
 * screen at the counter, which asks to log in when signed out.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/staff/[storeSlug]/manifest.webmanifest">,
) {
  const store = await getStoreOr404((await params).storeSlug);
  const brand = brandFor(store.slug);
  return manifestResponse(
    storeManifest(brand, {
      name: `${brand.shortName} Counter`,
      shortName: `${brand.shortName} Counter`,
      startUrl: storeUrl(store.slug, "", "staff"),
      scope: "/",
      color: brand.colors.light.page,
    }),
  );
}
