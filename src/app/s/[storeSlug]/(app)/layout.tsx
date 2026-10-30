import { getTranslations } from "next-intl/server";
import { ViewTransition } from "react";
import { BottomNav } from "@/components/customer/BottomNav";
import { storeUrl } from "@/lib/storeUrl";
import { getStoreOr404 } from "@/server/stores/getStore";

// Signed-in customer screens share the tab bar. Each page still checks the session itself.
export default async function SignedInLayout({ children, params }: LayoutProps<"/s/[storeSlug]">) {
  const { storeSlug } = await params;
  const store = await getStoreOr404(storeSlug);
  const t = await getTranslations("nav");

  return (
    <>
      {/* Switching tabs crossfades (depth.css sets the timing; off with reduced motion). */}
      <ViewTransition>{children}</ViewTransition>
      <BottomNav
        label={t("label")}
        items={[
          { href: storeUrl(store.slug), label: t("home"), icon: "home" },
          { href: storeUrl(store.slug, "/rewards"), label: t("rewards"), icon: "rewards" },
          { href: storeUrl(store.slug, "/history"), label: t("history"), icon: "history" },
          { href: storeUrl(store.slug, "/account"), label: t("account"), icon: "account" },
        ]}
      />
    </>
  );
}
