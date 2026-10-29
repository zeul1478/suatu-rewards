import { getTranslations } from "next-intl/server";
import { DashboardNav, type DashboardNavItem } from "@/components/dashboard/DashboardNav";
import { IdleLogout } from "@/components/staff/IdleLogout";
import { Icon } from "@/components/ui/icons/Icon";
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

      <header className="screen-gutter flex flex-wrap items-center justify-between gap-3 border-b border-line bg-raised pt-[max(var(--space-3),env(safe-area-inset-top))] pb-3">
        <div className="flex flex-col gap-1">
          <p className="flex items-baseline gap-3">
            <span className="font-display text-2xl font-bold">behappy</span>
            <span className="font-display text-lg font-semibold text-ink-muted">{t("title")}</span>
          </p>
          <p className="flex items-center gap-1.5 text-sm text-ink-muted">
            <Icon name="user" size={20} />
            {t("signedInAs", { name: admin.displayName })}
          </p>
        </div>
        <LogoutButton
          action={adminLogoutAction.bind(null, undefined)}
          label={tCommon("logOut")}
          pendingLabel={tCommon("loggingOut")}
        />
      </header>

      <div className="screen-gutter mx-auto grid w-full max-w-6xl flex-1 grid-cols-[minmax(0,1fr)] content-start gap-4 py-4 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8 md:py-8">
        <DashboardNav items={items} label={t("nav.label")} />
        <main className="flex min-w-0 flex-col gap-6">{children}</main>
      </div>
    </div>
  );
}
