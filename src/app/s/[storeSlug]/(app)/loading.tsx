import { getTranslations } from "next-intl/server";

/**
 * Shown the moment a tab is tapped, while the next screen renders on the server. It also lets
 * production prefetch the tabs up to this point, so the tap answers at once (prefetching guide:
 * dynamic routes are skipped without a loading boundary). Same frame as a real screen: logo
 * space, lane stripe, title, then cards.
 */
export default async function Loading() {
  const t = await getTranslations("common");
  return (
    <main
      aria-busy="true"
      className="screen-gutter mx-auto flex w-full max-w-md flex-col gap-6 pt-[max(var(--space-8),env(safe-area-inset-top))] pb-[var(--space-8)]"
    >
      <p className="sr-only" role="status">
        {t("loading")}
      </p>
      <div aria-hidden="true" className="flex flex-col gap-4 motion-safe:animate-pulse">
        <div className="mx-auto h-[26px] w-24 rounded-[var(--radius-md)] bg-sunken" />
        <div className="lane-stripe" />
        <div className="mx-auto h-9 w-40 rounded-[var(--radius-md)] bg-sunken" />
        <div className="h-40 rounded-[var(--radius-xl)] bg-sunken" />
        <div className="h-24 rounded-[var(--radius-xl)] bg-sunken" />
      </div>
    </main>
  );
}
