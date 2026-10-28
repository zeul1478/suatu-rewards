import type { Metadata, Viewport } from "next";
import { brandFor, brandThemeStyle } from "@/brands";
import { brandMetadata } from "@/brands/metadata";
import { PoweredBy } from "@/components/brand/PoweredBy";
import { storeUrl } from "@/lib/storeUrl";
import { getStoreOr404 } from "@/server/stores/getStore";

export async function generateMetadata({
  params,
}: LayoutProps<"/s/[storeSlug]">): Promise<Metadata> {
  const { storeSlug } = await params;
  return brandMetadata(brandFor(storeSlug), {
    manifest: storeUrl(storeSlug, "/manifest.webmanifest"),
  });
}

export async function generateViewport({
  params,
}: LayoutProps<"/s/[storeSlug]">): Promise<Viewport> {
  const { colors } = brandFor((await params).storeSlug);
  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: colors.light.page },
      { media: "(prefers-color-scheme: dark)", color: colors.dark.page },
    ],
  };
}

// Customer app: the store's brand, dark by default and light when the phone is in light mode.
export default async function CustomerLayout({ children, params }: LayoutProps<"/s/[storeSlug]">) {
  const { storeSlug } = await params;
  const store = await getStoreOr404(storeSlug);
  return (
    <div
      data-theme="system"
      style={brandThemeStyle(brandFor(store.slug))}
      className="app-backdrop flex min-h-dvh flex-col text-ink"
    >
      <div className="flex-1">{children}</div>
      <PoweredBy theme="system" />
    </div>
  );
}
