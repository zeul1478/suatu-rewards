import type { ReactNode } from "react";

/** Top of every dashboard page: title, one line of explanation, optional actions on the right. */
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
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex max-w-2xl flex-col gap-1">
        <h1 className="font-display text-4xl leading-tight font-bold tracking-tight">{title}</h1>
        {intro ? <p className="text-ink-muted">{intro}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2 print:hidden">{actions}</div> : null}
    </div>
  );
}
