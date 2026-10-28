import { brandFor } from "@/brands";
import { storeUrl } from "@/lib/storeUrl";
import { getStoreOr404 } from "@/server/stores/getStore";

/**
 * Per-store web app manifest (brand/suatu/README.md "Manifest snippet"): the store's name and
 * icons when the customer adds the app to their home screen. The service worker comes in M5.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/s/[storeSlug]/manifest.webmanifest">,
) {
  const store = await getStoreOr404((await params).storeSlug);
  const brand = brandFor(store.slug);
  const home = storeUrl(store.slug);

  return Response.json(
    {
      name: brand.programName,
      short_name: brand.shortName,
      start_url: home,
      scope: home,
      display: "standalone",
      background_color: brand.colors.dark.page,
      theme_color: brand.colors.dark.page,
      icons: [
        { src: brand.icons.app192, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: brand.icons.app512, sizes: "512x512", type: "image/png", purpose: "any" },
        { src: brand.icons.maskable192, sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: brand.icons.maskable512, sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
