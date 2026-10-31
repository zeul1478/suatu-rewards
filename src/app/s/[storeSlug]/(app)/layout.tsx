import { getTranslations } from "next-intl/server";
import { brandFor } from "@/brands";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BottomNav } from "@/components/customer/BottomNav";
import { TabLayout } from "@/components/layout";
import { storeUrl } from "@/lib/storeUrl";
import { getStoreOr404 } from "@/server/stores/getStore";

// Signed-in customer screens share the logo, stripe and tab bar, which stay on screen while the
// tabs change (TabLayout). Each page still checks the session itself.
export default async function SignedInLayout({ children, params }: LayoutProps<"/s/[storeSlug]">) {
  const { storeSlug } = await params;
  const store = await getStoreOr404(storeSlug);
  const t = await getTranslations("nav");

  return (
    <TabLayout
      logo={
        <BrandLogo
          brand={brandFor(store.slug)}
          kind="wordmark"
          theme="system"
          height={26}
          priority
        />
      }
      nav={
        <BottomNav
          label={t("label")}
          items={[
            { href: storeUrl(store.slug), label: t("home"), icon: "home" },
            { href: storeUrl(store.slug, "/rewards"), label: t("rewards"), icon: "rewards" },
            { href: storeUrl(store.slug, "/history"), label: t("history"), icon: "history" },
            { href: storeUrl(store.slug, "/account"), label: t("account"), icon: "account" },
          ]}
        />
      }
    >
      {children}
    </TabLayout>
  );
}
