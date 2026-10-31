import type { ReactNode } from "react";

/**
 * Top of every dashboard and admin page: the title with its buttons on the same line (on a
 * phone they come after the explanation), then one line of explanation at a reading width.
 * Same place on every page, so titles and buttons line up as you move through the menu.
 */
export function PageTitle({
  title,
  intro,
  actions,
}: {
  title: string;
  intro?: string;
  actions?: ReactNode;
}) {
  return (
    // Phone: title, intro, then buttons. Wider: buttons on the title's line, intro below.
    <div className="grid gap-x-4 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <h1 className="flex min-h-[var(--target-min)] items-center font-display text-4xl leading-tight font-bold tracking-tight">
        {title}
      </h1>
      {actions ? (
        <div
          className={`${intro ? "row-start-3" : ""} flex flex-wrap gap-2 sm:col-start-2 sm:row-start-1 sm:items-center sm:justify-end print:hidden`}
        >
          {actions}
        </div>
      ) : null}
      {intro ? <p className="-mt-1 max-w-2xl text-ink-muted sm:col-span-2">{intro}</p> : null}
    </div>
  );
}
