"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRef, useState } from "react";
import { Icon } from "@/components/ui/icons/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { CustomerStatus } from "@/server/customers/status";
import { FuelGauge } from "./FuelGauge";
import { usePolling } from "./usePolling";

type PointsCardProps = {
  initialStatus: CustomerStatus;
  statusUrl: string;
  redeemHref: string;
  pointsPerVisit: number;
  redeemAction: (rewardId: string) => Promise<void>;
};

/**
 * The customer's balance as a fuel-price sign plus fuel gauge, kept live by polling (§0 step 5).
 * Fixed-width digits and reserved space mean the layout doesn't move when the number changes.
 */
export function PointsCard({
  initialStatus,
  statusUrl,
  redeemHref,
  pointsPerVisit,
  redeemAction,
}: PointsCardProps) {
  const t = useTranslations("home");
  const [status, setStatus] = useState(initialStatus);
  // Each rise in the balance replays a short "pump tick" on the number (off with reduced motion).
  const [bumps, setBumps] = useState(0);
  const shownBalance = useRef(initialStatus.progress.balance);
  // Every 3 s while things happen at the counter; every 15 s after 2 quiet minutes.
  usePolling<CustomerStatus>(
    statusUrl,
    3000,
    (next) => {
      if (next.progress.balance > shownBalance.current) setBumps((count) => count + 1);
      shownBalance.current = next.progress.balance;
      setStatus(next);
    },
    { afterMs: 120_000, intervalMs: 15_000 },
  );

  const { progress, pendingRedemption, lastVisit } = status;
  const target = progress.target;

  return (
    <section
      aria-labelledby="points-heading"
      className="flex flex-col gap-5 rounded-[var(--radius-lg)] border border-line bg-raised p-5"
    >
      <h2
        id="points-heading"
        className="flex items-center gap-2 font-display text-lg font-semibold tracking-[0.18em] text-ink-muted uppercase"
      >
        <Icon name="gauge" />
        {t("yourPoints")}
      </h2>

      <p className="flex items-baseline gap-2" aria-live="polite" aria-atomic="true">
        <span
          key={bumps}
          data-testid="points-balance"
          className={`price-digits text-7xl leading-none text-accent ${bumps ? "points-bump" : ""}`}
        >
          {progress.balance}
        </span>
        {target ? (
          <span className="price-digits text-3xl text-ink-muted">
            <span aria-hidden="true">/ </span>
            <span className="sr-only">{t("outOf")} </span>
            {target.costPoints}
          </span>
        ) : null}
      </p>

      {target ? (
        <FuelGauge percent={progress.percent} label={t("gaugeLabel", { reward: target.name })} />
      ) : null}

      <div className="min-h-[var(--target-min)]">
        {progress.unlocked && target ? (
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 font-display text-2xl font-bold text-accent">
              <Icon name="coffee" size={28} />
              {t("unlocked", { reward: target.name })}
            </p>
            {pendingRedemption ? (
              <Link href={redeemHref} className="glass glass-primary glass-large w-full">
                {t("showCode")}
              </Link>
            ) : (
              <form suppressHydrationWarning action={redeemAction.bind(null, target.id)}>
                <SubmitButton size="large" pendingLabel={t("redeeming")}>
                  {t("redeem")}
                </SubmitButton>
              </form>
            )}
          </div>
        ) : target ? (
          <p className="flex items-center gap-2 text-lg text-ink">
            <Icon name="coffee" className="text-ink-muted" />
            {t("visitsToGo", { visits: progress.visitsToNext, reward: target.name })}
          </p>
        ) : (
          <p className="text-ink-muted">{t("noRewards")}</p>
        )}
      </div>

      <p data-testid="last-visit" className="border-t border-line pt-4 text-sm text-ink-muted">
        {lastVisit
          ? t("lastVisit", { date: lastVisit })
          : t("noVisitsYet", { points: pointsPerVisit })}
      </p>
    </section>
  );
}
