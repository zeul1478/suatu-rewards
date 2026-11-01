import { brandFor } from "@/brands";
import { manifestResponse, storeManifest } from "@/brands/manifest";
import { storeUrl } from "@/lib/storeUrl";
import { getStoreOr404 } from "@/server/stores/getStore";

/**
 * Per-store web app manifest (brand/suatu/README.md "Manifest snippet"): the store's name and
 * icons when the customer adds the app to their home screen.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/s/[storeSlug]/manifest.webmanifest">,
) {
  const store = await getStoreOr404((await params).storeSlug);
  const brand = brandFor(store.slug);
  const home = storeUrl(store.slug);
  return manifestResponse(
    storeManifest(brand, {
      name: brand.programName,
      shortName: brand.shortName,
      startUrl: home,
      scope: home,
      color: brand.colors.dark.page,
    }),
  );
}
