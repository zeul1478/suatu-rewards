import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { brandFor } from "@/brands";
import { BrandLogo } from "@/components/brand/BrandLogo";
import type { DashboardNavItem } from "@/components/dashboard/DashboardNav";
import { AppHeader, SidebarLayout } from "@/components/layout";
import { IdleLogout } from "@/components/staff/IdleLogout";
import { Icon } from "@/components/ui/icons/Icon";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { storeUrl } from "@/lib/storeUrl";
import { requireManager } from "@/server/dashboard/access";
import { STAFF_IDLE_MS } from "@/server/staff/session";
import { dashboardLogoutAction } from "../actions";

/** Signed-in dashboard: header, section navigation, idle logout (§6: 15 minutes, like staff). */
export default async function ManagerLayout({
  children,
  params,
}: LayoutProps<"/dashboard/[storeSlug]">) {
  const { storeSlug } = await params;
  const { store, manager } = await requireManager(storeSlug);
  const [t, tCommon] = await Promise.all([getTranslations("dashboard"), getTranslations("common")]);
  const url = (path = "") => storeUrl(store.slug, path, "dashboard");
  const items: DashboardNavItem[] = [
    { href: url(), label: t("nav.overview"), icon: "chart" },
    { href: url("/customers"), label: t("nav.customers"), icon: "users" },
    { href: url("/rewards"), label: t("nav.rewards"), icon: "rewards" },
    { href: url("/offers"), label: t("nav.offers"), icon: "offer" },
    { href: url("/messages"), label: t("nav.messages"), icon: "mail" },
    { href: url("/staff"), label: t("nav.staff"), icon: "staff" },
    { href: url("/settings"), label: t("nav.settings"), icon: "settings" },
    { href: url("/sign"), label: t("nav.sign"), icon: "print" },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <IdleLogout
        timeoutMs={STAFF_IDLE_MS}
        logout={dashboardLogoutAction.bind(null, store.slug, "idle")}
      />

      <SidebarLayout
        nav={{ items, label: t("nav.label") }}
        header={
          <AppHeader
            logo={
              <>
                <BrandLogo
                  brand={brandFor(store.slug)}
                  kind="wordmark"
                  theme="light"
                  height={26}
                  priority
                />
                <span className="font-display text-lg font-semibold text-ink-muted">
                  {t("title")}
                </span>
              </>
            }
            signedInAs={t("signedInAs", { name: manager.displayName })}
            actions={
              <>
                <Link href={storeUrl(store.slug, "", "staff")} className="glass">
                  <Icon name="station" size={22} />
                  {t("counterScreen")}
                </Link>
                <LogoutButton
                  action={dashboardLogoutAction.bind(null, store.slug, undefined)}
                  label={tCommon("logOut")}
                  pendingLabel={tCommon("loggingOut")}
                />
              </>
            }
          />
        }
      >
        {children}
      </SidebarLayout>
    </div>
  );
}
