import type { Metadata, Viewport } from "next";
import { brandThemeStyle, DEFAULT_BRAND } from "@/brands";
import { PoweredBy } from "@/components/brand/PoweredBy";

export const metadata: Metadata = {
  title: { template: "%s · behappy admin", default: "behappy admin" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: DEFAULT_BRAND.colors.light.page };

// Platform admin (§11): behappy's own console for every store. Light theme, laptop first.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div
      data-theme="light"
      style={brandThemeStyle(DEFAULT_BRAND)}
      className="flex min-h-dvh flex-col bg-page text-ink"
    >
      <div className="flex flex-1 flex-col">{children}</div>
      <PoweredBy theme="light" />
    </div>
  );
}
