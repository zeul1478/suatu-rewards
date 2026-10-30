import { getTranslations } from "next-intl/server";
import { DashboardNav, type DashboardNavItem } from "@/components/dashboard/DashboardNav";
import { IdleLogout } from "@/components/staff/IdleLogout";
import { AppHeader } from "@/components/ui/AppHeader";
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

      <AppHeader
        logo={
          <>
            <span className="font-display text-2xl font-bold">behappy</span>
            <span className="font-display text-lg font-semibold text-ink-muted">{t("title")}</span>
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

      <div className="screen-gutter mx-auto grid w-full max-w-6xl flex-1 grid-cols-[minmax(0,1fr)] content-start gap-4 py-4 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8 md:py-8">
        <DashboardNav items={items} label={t("nav.label")} />
        <main className="flex min-w-0 flex-col gap-6">{children}</main>
      </div>
    </div>
  );
}
