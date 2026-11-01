import { type ReactNode, ViewTransition } from "react";
import { DashboardNav, type DashboardNavItem } from "@/components/dashboard/DashboardNav";

type SidebarLayoutProps = {
  /** The top bar (AppHeader). */
  header: ReactNode;
  nav: { items: DashboardNavItem[]; label: string };
  children: ReactNode;
};

/**
 * Owner dashboard and platform admin: top bar, then the section menu and the page. On a phone
 * the menu is a swipeable row above the page; from tablet width it's a column on the left whose
 * top lines up with the page title. Same gutters and top/bottom space as Screen. Changing
 * section crossfades the page area only (the top bar and menu stay still; globals.css).
 */
export function SidebarLayout({ header, nav, children }: SidebarLayoutProps) {
  return (
    <>
      {header}
      <div className="sidebar-layout screen-gutter mx-auto grid w-full max-w-6xl flex-1 grid-cols-[minmax(0,1fr)] content-start gap-6 pt-[var(--space-6)] pb-[max(var(--space-8),env(safe-area-inset-bottom))] md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8 md:pt-[var(--space-8)]">
        <DashboardNav items={nav.items} label={nav.label} />
        <main className="flex min-w-0 flex-col gap-6">
          <ViewTransition>{children}</ViewTransition>
        </main>
      </div>
    </>
  );
}
