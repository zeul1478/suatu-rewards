import type { Metadata, Viewport } from "next";
import { brandFor, brandThemeStyle } from "@/brands";
import { brandMetadata } from "@/brands/metadata";
import { PoweredBy } from "@/components/brand/PoweredBy";
import { getStoreOr404 } from "@/server/stores/getStore";

export async function generateMetadata({
  params,
}: LayoutProps<"/staff/[storeSlug]">): Promise<Metadata> {
  return brandMetadata(brandFor((await params).storeSlug));
}

export async function generateViewport({
  params,
}: LayoutProps<"/staff/[storeSlug]">): Promise<Viewport> {
  return { themeColor: brandFor((await params).storeSlug).colors.light.page };
}

// Staff screen: the store's brand in the light theme for bright shops (spec §9), tablet first.
export default async function StaffLayout({ children, params }: LayoutProps<"/staff/[storeSlug]">) {
  const { storeSlug } = await params;
  const store = await getStoreOr404(storeSlug);
  return (
    <div
      data-theme="light"
      style={brandThemeStyle(brandFor(store.slug))}
      className="flex min-h-dvh flex-col bg-page text-ink"
    >
      <div className="flex flex-1 flex-col">{children}</div>
      <PoweredBy />
    </div>
  );
}
