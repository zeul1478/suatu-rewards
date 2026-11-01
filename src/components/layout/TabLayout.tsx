import { type ReactNode, ViewTransition } from "react";

type TabLayoutProps = {
  /** The store's logo, centred above the lane stripe. */
  logo: ReactNode;
  /** The bottom tab bar. */
  nav: ReactNode;
  children: ReactNode;
};

/**
 * The signed-in customer app: logo, lane stripe and tab bar stay on screen; switching tabs only
 * changes the page underneath (title and content), with a short crossfade of that area. The
 * frame is the same column as Screen (gutters, width, top and bottom space).
 */
export function TabLayout({ logo, nav, children }: TabLayoutProps) {
  return (
    <>
      <div className="screen-gutter mx-auto flex w-full max-w-md flex-1 flex-col gap-4 pt-[max(var(--space-8),env(safe-area-inset-top))] pb-[max(var(--space-8),env(safe-area-inset-bottom))]">
        <header className="flex flex-col items-center gap-4">
          <div className="flex min-h-[var(--target-min)] items-center">{logo}</div>
          <div className="lane-stripe self-stretch" aria-hidden="true" />
        </header>
        <main className="flex flex-col">
          <ViewTransition>{children}</ViewTransition>
        </main>
      </div>
      {nav}
    </>
  );
}

/** One tab's page inside TabLayout: its centred title, then its content. */
export function TabPage({
  title,
  gap = "normal",
  children,
}: {
  title: string;
  /** loose: more room between blocks, for long screens like Account. */
  gap?: "normal" | "loose";
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col ${gap === "loose" ? "gap-10" : "gap-6"}`}>
      <h1 className="text-center font-display text-4xl leading-tight font-bold tracking-tight text-balance text-ink">
        {title}
      </h1>
      {children}
    </div>
  );
}
