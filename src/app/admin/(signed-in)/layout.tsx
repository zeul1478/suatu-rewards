import { getTranslations } from "next-intl/server";
import type { DashboardNavItem } from "@/components/dashboard/DashboardNav";
import { AppHeader, SidebarLayout } from "@/components/layout";
import { IdleLogout } from "@/components/staff/IdleLogout";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { requireAdmin } from "@/server/admin/access";
import { ADMIN_IDLE_MS } from "@/server/admin/session";
import { adminLogoutAction } from "../actions";

/** Signed-in admin: header, sections (stores, audit log), 15-minute idle logout. */
export default async function SignedInAdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  const [t, tCommon] = await Promise.all([getTranslations("admin"), getTranslations("common")]);
  const items: DashboardNavItem[] = [
    { href: "/admin", label: t("nav.stores"), icon: "station" },
    { href: "/admin/audit", label: t("nav.audit"), icon: "history" },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <IdleLogout timeoutMs={ADMIN_IDLE_MS} logout={adminLogoutAction.bind(null, "idle")} />

      <SidebarLayout
        nav={{ items, label: t("nav.label") }}
        header={
          <AppHeader
            logo={
              <>
                <span className="font-display text-2xl font-bold">behappy</span>
                <span className="font-display text-lg font-semibold text-ink-muted">
                  {t("title")}
                </span>
              </>
            }
            signedInAs={t("signedInAs", { name: admin.displayName })}
            actions={
              <LogoutButton
                action={adminLogoutAction.bind(null, undefined)}
                label={tCommon("logOut")}
                pendingLabel={tCommon("loggingOut")}
              />
            }
          />
        }
      >
        {children}
      </SidebarLayout>
    </div>
  );
}
