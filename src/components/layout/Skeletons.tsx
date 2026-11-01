import { getTranslations } from "next-intl/server";

/** "Loading…" for screen readers; the grey shapes themselves are hidden from them. */
async function LoadingStatus() {
  const t = await getTranslations("common");
  return (
    <p className="sr-only" role="status">
      {t("loading")}
    </p>
  );
}

/**
 * Shown under the logo the moment a customer tab is tapped (loading.tsx): the logo, stripe and
 * tab bar stay (TabLayout); grey shapes stand in for the title and cards. Pulses gently (off with
 * reduced motion).
 */
export async function TabSkeleton() {
  return (
    <>
      <LoadingStatus />
      <div aria-hidden="true" className="flex flex-col gap-6 motion-safe:animate-pulse">
        <div className="mx-auto h-10 w-40 rounded-[var(--radius-md)] bg-sunken" />
        <div className="h-40 rounded-[var(--radius-xl)] bg-sunken" />
        <div className="h-24 rounded-[var(--radius-xl)] bg-sunken" />
      </div>
    </>
  );
}

/**
 * Shown in the page area of the dashboard and admin while a section loads (loading.tsx): a
 * title, a row of tiles and a panel, where PageTitle and the content will be. The top bar and
 * menu stay as they are.
 */
export async function PageSkeleton() {
  return (
    <>
      <LoadingStatus />
      <div aria-hidden="true" className="flex flex-col gap-6 motion-safe:animate-pulse">
        {/* Same spacing as PageTitle, so the real title and intro land exactly here. */}
        <div className="grid gap-y-3">
          <div className="flex min-h-[var(--target-min)] items-center">
            {/* As tall as the title's line (text-4xl, leading-tight). */}
            <div className="h-[1.25em] text-4xl" />
            <div className="h-9 w-48 rounded-[var(--radius-md)] bg-sunken" />
          </div>
          <div className="-mt-1 flex h-6 items-center">
            <div className="h-4 w-full max-w-md rounded-[var(--radius-sm)] bg-sunken" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
          <div className="h-24 rounded-[var(--radius-lg)] bg-sunken" />
          <div className="h-24 rounded-[var(--radius-lg)] bg-sunken" />
          <div className="h-24 rounded-[var(--radius-lg)] bg-sunken" />
        </div>
        <div className="h-64 rounded-[var(--radius-lg)] bg-sunken" />
      </div>
    </>
  );
}
