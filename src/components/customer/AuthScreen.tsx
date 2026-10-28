import type { ReactNode } from "react";

type AuthScreenProps = {
  programName: string;
  title: string;
  intro?: string;
  children: ReactNode;
};

/** Shared frame for sign-up, log-in and password screens: brand line, lane stripe, one column. */
export function AuthScreen({ programName, title, intro, children }: AuthScreenProps) {
  return (
    <main className="screen-gutter mx-auto flex w-full max-w-md flex-col gap-6 pt-[max(var(--space-8),env(safe-area-inset-top))] pb-[max(var(--space-12),env(safe-area-inset-bottom))]">
      <header className="flex flex-col gap-4">
        <p className="font-display text-lg font-semibold tracking-[0.2em] text-brand uppercase">
          {programName}
        </p>
        <div className="lane-stripe" aria-hidden="true" />
        <h1 className="font-display text-4xl leading-tight font-bold text-ink">{title}</h1>
        {intro ? <p className="text-ink-muted">{intro}</p> : null}
      </header>
      {children}
    </main>
  );
}
