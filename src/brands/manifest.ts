import type { Brand } from "./types";

/**
 * A web app manifest for one of a store's apps (customer app, owner dashboard, counter): its
 * name and icon on the home screen, and that it opens full screen without the browser's bars.
 * All three use the store's icons; the name and colours tell them apart.
 */
export function storeManifest(
  brand: Brand,
  app: { name: string; shortName: string; startUrl: string; scope: string; color: string },
) {
  return {
    name: app.name,
    short_name: app.shortName,
    start_url: app.startUrl,
    scope: app.scope,
    display: "standalone",
    background_color: app.color,
    theme_color: app.color,
    icons: [
      { src: brand.icons.app192, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: brand.icons.app512, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: brand.icons.maskable192, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: brand.icons.maskable512, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

/** The manifest as a response, with the content type browsers expect. */
export function manifestResponse(manifest: ReturnType<typeof storeManifest>): Response {
  return Response.json(manifest, { headers: { "Content-Type": "application/manifest+json" } });
}
