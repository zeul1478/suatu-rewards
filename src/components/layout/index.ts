/**
 * The building blocks every screen is made of. Import from here so all screens (customer app,
 * counter, dashboard, admin, logins, legal pages) share one frame, one header style and one
 * spacing; change the look here and every screen follows.
 *
 * - Screen: the page frame (width, gutters, top and bottom space).
 * - BrandHeader: centred logo, stripe, title and intro (single-column screens).
 * - AppHeader: the top bar of the counter, dashboard and admin.
 * - SidebarLayout: top bar + section menu + page (dashboard, admin).
 * - TabLayout / TabPage: logo + stripe + tab bar that stay, and each tab's page (customer app).
 * - PageTitle: a dashboard/admin page's title, buttons and intro.
 * - Section: a titled block inside a screen.
 * - TabSkeleton / PageSkeleton: the grey "loading" shapes shown while a screen loads.
 * Panels use the .panel and .panel-pad classes (globals.css).
 */
export { AppHeader } from "@/components/ui/AppHeader";
export { PageTitle } from "@/components/dashboard/PageTitle";
export { BrandHeader } from "./BrandHeader";
export { Screen } from "./Screen";
export { Section } from "./Section";
export { SidebarLayout } from "./SidebarLayout";
export { PageSkeleton, TabSkeleton } from "./Skeletons";
export { TabLayout, TabPage } from "./TabLayout";
