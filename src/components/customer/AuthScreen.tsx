import type { ReactNode } from "react";
import type { Brand } from "@/brands";
import { BrandLogo } from "@/components/brand/BrandLogo";

type AuthScreenProps = {
  brand: Brand;
  title: string;
  intro?: string;
  children: ReactNode;
};

/**
 * Shared frame for sign-up, log-in and password screens: logo, lane stripe and title centred
 * above one column. The form below stays left-aligned (labels are easier to scan that way).
 */
export function AuthScreen({ brand, title, intro, children }: AuthScreenProps) {
  return (
    <main className="screen-gutter mx-auto flex w-full max-w-md flex-col gap-6 pt-[max(var(--space-8),env(safe-area-inset-top))] pb-[var(--space-8)]">
      <header className="flex flex-col items-center gap-5 text-center">
        <BrandLogo brand={brand} kind="lockup" theme="system" height={64} priority />
        <div className="lane-stripe self-stretch" aria-hidden="true" />
        <h1 className="font-display text-4xl leading-tight font-bold tracking-tight text-ink">
          {title}
        </h1>
        {intro ? <p className="text-ink-muted">{intro}</p> : null}
      </header>
      {children}
    </main>
  );
}
