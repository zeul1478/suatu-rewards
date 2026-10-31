import type { Metadata, Viewport } from "next";
import { brandFor, brandThemeStyle } from "@/brands";
import { brandMetadata } from "@/brands/metadata";
import { PoweredBy } from "@/components/brand/PoweredBy";
import { storeUrl } from "@/lib/storeUrl";
import { getStoreOr404 } from "@/server/stores/getStore";

export async function generateMetadata({
  params,
}: LayoutProps<"/dashboard/[storeSlug]">): Promise<Metadata> {
  const { storeSlug } = await params;
  const brand = brandFor(storeSlug);
  return {
    ...brandMetadata(brand, {
      manifest: storeUrl(storeSlug, "/manifest.webmanifest", "dashboard"),
      appleTitle: `${brand.shortName} Owner`,
      statusBar: "default",
    }),
    robots: { index: false, follow: false },
  };
}

export async function generateViewport({
  params,
}: LayoutProps<"/dashboard/[storeSlug]">): Promise<Viewport> {
  return { themeColor: brandFor((await params).storeSlug).colors.light.page };
}

// Owner dashboard (§11): the store's brand in the light theme, laptop first, works on a phone.
export default async function DashboardLayout({
  children,
  params,
}: LayoutProps<"/dashboard/[storeSlug]">) {
  const { storeSlug } = await params;
  const store = await getStoreOr404(storeSlug);
  return (
    <div
      data-theme="light"
      style={brandThemeStyle(brandFor(store.slug))}
      className="flex min-h-dvh flex-col bg-page text-ink"
    >
      <div className="flex flex-1 flex-col">{children}</div>
      <div className="print:hidden">
        <PoweredBy />
      </div>
    </div>
  );
}
