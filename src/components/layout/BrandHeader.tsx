import type { ReactNode } from "react";
import { BackLink } from "@/components/ui/BackLink";

type BrandHeaderProps = {
  /** The logo (a BrandLogo, or the behappy name on admin screens). Always centred. */
  logo: ReactNode;
  /** A line under the logo, e.g. the store's tagline. */
  tagline?: string;
  title: string;
  /** One or two lines under the title, or the document version on legal pages. */
  intro?: ReactNode;
  /** A way back, shown on the left of the logo row. */
  back?: { href: string; label: string };
};

/**
 * The top of every single-column screen (customer app, every login, legal pages): logo, lane
 * stripe, title and intro, all centred and spaced the same. Forms below stay left-aligned
 * (labels are easier to scan that way).
 */
export function BrandHeader({ logo, tagline, title, intro, back }: BrandHeaderProps) {
  return (
    <header className="flex flex-col items-center gap-4 text-center">
      {/* Three columns keep the logo centred whether or not there's a back link. */}
      <div className="grid min-h-[var(--target-min)] w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="justify-self-start">
          {back ? <BackLink href={back.href}>{back.label}</BackLink> : null}
        </div>
        {logo}
      </div>
      {tagline ? (
        <p className="-mt-2 font-display text-lg text-ink-muted italic">{tagline}</p>
      ) : null}
      <div className="lane-stripe self-stretch" aria-hidden="true" />
      <h1 className="font-display text-4xl leading-tight font-bold tracking-tight text-balance text-ink">
        {title}
      </h1>
      {intro ? <div className="text-ink-muted">{intro}</div> : null}
    </header>
  );
}
