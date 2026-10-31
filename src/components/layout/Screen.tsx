import type { ReactNode } from "react";

/**
 * How wide a screen's content may grow:
 * - column: one column, phone-shaped (customer app and every login);
 * - wide: counter, dashboard and admin (side menu or two columns on bigger screens);
 * - reading: long text (legal pages).
 */
const WIDTHS = { column: "max-w-md", wide: "max-w-6xl", reading: "max-w-3xl" } as const;

/** Space between the blocks of a screen: normal for most, loose for long settings screens. */
const GAPS = { normal: "gap-6", loose: "gap-10" } as const;

type ScreenProps = {
  width?: keyof typeof WIDTHS;
  gap?: keyof typeof GAPS;
  /** Extra layout for the content area, e.g. two columns on the counter. */
  className?: string;
  children: ReactNode;
};

/**
 * The frame of every screen (the page's <main>): same side gutters (16px, clear of notches),
 * same space at the top and bottom (clear of the status bar and home indicator), content
 * centred at its width. Change the app's spacing here, not on individual screens.
 */
export function Screen({ width = "column", gap = "normal", className, children }: ScreenProps) {
  return (
    <main
      className={`screen-gutter mx-auto flex w-full flex-1 flex-col ${WIDTHS[width]} ${GAPS[gap]} pt-[max(var(--space-8),env(safe-area-inset-top))] pb-[max(var(--space-8),env(safe-area-inset-bottom))] ${className ?? ""}`}
    >
      {children}
    </main>
  );
}
