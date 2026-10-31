import type { Metadata } from "next";
import type { Brand } from "./types";

/**
 * A brand's browser and sharing metadata (brand/suatu/README.md "Files → where they go"):
 * favicon (SVG + ICO), iPhone home-screen icon, link-preview image, and — inside a store — the
 * web app manifest of that part (customer app, dashboard or counter, D86).
 *
 * appleTitle: the name under the icon on an iPhone home screen. statusBar: "default" (dark clock
 * on a light bar) for the light dashboard and counter; the dark customer app lets its page show
 * through ("black-translucent").
 */
export function brandMetadata(
  brand: Brand,
  options: {
    manifest?: string;
    appleTitle?: string;
    statusBar?: "default" | "black-translucent";
  } = {},
): Metadata {
  return {
    title: { default: brand.programName, template: `%s · ${brand.programName}` },
    applicationName: brand.programName,
    icons: {
      icon: [
        {
          url: brand.icons.favicon,
          type: brand.icons.favicon.endsWith(".svg") ? "image/svg+xml" : "image/png",
        },
        { url: brand.icons.faviconIco, sizes: "48x48" },
      ],
      apple: [{ url: brand.icons.appleTouch, sizes: "180x180" }],
    },
    openGraph: {
      siteName: brand.programName,
      images: [{ url: brand.socialImage, width: 1200, height: 630, alt: brand.programName }],
    },
    appleWebApp: {
      title: options.appleTitle ?? brand.shortName,
      statusBarStyle: options.statusBar ?? "black-translucent",
    },
    ...(options.manifest ? { manifest: options.manifest } : {}),
  };
}
