import type { Metadata, Viewport } from "next";
import { brandFor, brandThemeStyle } from "@/brands";
import { brandMetadata } from "@/brands/metadata";
import { PoweredBy } from "@/components/brand/PoweredBy";
import { ServiceWorker } from "@/components/customer/ServiceWorker";
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
      // With a tab bar on screen, leave room for it (it floats 8px up, depth.css) so the last
      // content and footer stay visible. app-3d: the customer app's depth (depth.css).
      className="app-backdrop app-3d flex min-h-dvh flex-col text-ink has-[.bottom-nav]:pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
    >
      <ServiceWorker storeSlug={store.slug} scope={storeUrl(store.slug)} />
      <div className="flex-1">{children}</div>
      <PoweredBy theme="system" />
    </div>
  );
}
