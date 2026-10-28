import type { Metadata } from "next";
import type { Brand } from "./types";

/**
 * A brand's browser and sharing metadata (brand/suatu/README.md "Files → where they go"):
 * favicon (SVG + ICO), iPhone home-screen icon, link-preview image, and — inside a store — its
 * web app manifest.
 */
export function brandMetadata(brand: Brand, options: { manifest?: string } = {}): Metadata {
  return {
    title: { default: brand.programName, template: `%s · ${brand.programName}` },
    applicationName: brand.programName,
    icons: {
      icon: [
        { url: brand.icons.favicon, type: "image/svg+xml" },
        { url: brand.icons.faviconIco, sizes: "48x48" },
      ],
      apple: [{ url: brand.icons.appleTouch, sizes: "180x180" }],
    },
    openGraph: {
      siteName: brand.programName,
      images: [{ url: brand.socialImage, width: 1200, height: 630, alt: brand.programName }],
    },
    appleWebApp: { title: brand.shortName, statusBarStyle: "black-translucent" },
    ...(options.manifest ? { manifest: options.manifest } : {}),
  };
}
