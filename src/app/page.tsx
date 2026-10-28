import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocalTools } from "@/components/dev-home/LocalTools";
import { PhoneAccess } from "@/components/dev-home/PhoneAccess";
import { ScreenList } from "@/components/dev-home/ScreenList";
import { TryIt } from "@/components/dev-home/TryIt";
import { TwoParts } from "@/components/dev-home/TwoParts";

export const metadata: Metadata = {
  title: "Dev home",
  robots: { index: false, follow: false },
};

// Development-only index of every screen, demo login and local tool (spec §11).
export default function DevHomePage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 pt-[max(var(--space-8),env(safe-area-inset-top))] pr-[max(var(--space-4),env(safe-area-inset-right))] pb-[max(var(--space-12),env(safe-area-inset-bottom))] pl-[max(var(--space-4),env(safe-area-inset-left))] sm:px-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-lg font-semibold tracking-[0.2em] text-brand uppercase">
            Suatu Rewards
          </p>
          <p className="rounded-[var(--radius-sm)] border border-warning px-2 py-0.5 text-sm font-semibold text-warning">
            Development only
          </p>
        </div>
        <div className="lane-stripe" aria-hidden="true" />
        <h1 className="max-w-2xl font-display text-4xl leading-tight font-bold text-ink sm:text-5xl">
          Test Suatu Rewards: a cashier and a customer, side by side.
        </h1>
        <p className="max-w-2xl text-ink-muted">
          This page exists only while the app runs on your laptop. Production builds show a 404
          here.
        </p>
      </header>

      <PhoneAccess />
      <TwoParts />
      <TryIt />
      <div className="lane-stripe" aria-hidden="true" />
      <ScreenList />
      <LocalTools />
    </main>
  );
}
