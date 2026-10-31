"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { type ReactNode, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { CustomerStatus } from "@/server/customers/status";
import { FuelGauge } from "./FuelGauge";
import { usePolling } from "./usePolling";
import { announceDataChanged } from "@/components/layout/useWarmRoutes";

type PointsCardProps = {
  initialStatus: CustomerStatus;
  statusUrl: string;
  redeemHref: string;
  pointsPerVisit: number;
  redeemAction: (rewardId: string) => Promise<void>;
  /** The brand's mascot (Suatu: Bambi the deer), hopping in when a reward is unlocked. */
  mascot?: ReactNode;
};

/**
 * The customer's balance inside a round fuel gauge (E to F), kept live by polling (§0 step 5).
 * Fixed-width digits and reserved space mean the layout doesn't move when the number changes.
 */
export function PointsCard({
  initialStatus,
  statusUrl,
  redeemHref,
  pointsPerVisit,
  redeemAction,
  mascot,
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
      // History and Rewards change too: refresh their preloaded copies (useWarmRoutes).
      if (next.progress.balance !== shownBalance.current) announceDataChanged();
      shownBalance.current = next.progress.balance;
      setStatus(next);
    },
    { afterMs: 120_000, intervalMs: 15_000 },
  );

  const { progress, pendingRedemption, lastVisit } = status;
  const target = progress.target;

  return (
    <section aria-labelledby="points-heading" className="card panel panel-pad flex flex-col gap-5">
      <h2
        id="points-heading"
        className="flex items-center gap-2 font-display text-lg font-semibold tracking-[0.18em] text-ink-muted uppercase"
      >
        <Icon name="gauge" />
        {t("yourPoints")}
      </h2>

      {/* The dial with the balance in its open bottom, like a car's fuel gauge. */}
      <div className="mx-auto flex w-full max-w-[18rem] flex-col items-center">
        {target ? (
          <FuelGauge percent={progress.percent} label={t("gaugeLabel", { reward: target.name })} />
        ) : null}
        <p
          className={`flex flex-col items-center ${target ? "-mt-[18%]" : ""}`}
          aria-live="polite"
          aria-atomic="true"
        >
          <span
            key={bumps}
            data-testid="points-balance"
            className={`price-digits text-6xl leading-none text-accent ${bumps ? "points-bump" : ""}`}
          >
            {progress.balance}
          </span>
          {target ? (
            <span className="price-digits text-2xl text-ink-muted">
              <span aria-hidden="true">/ </span>
              <span className="sr-only">{t("outOf")} </span>
              {target.costPoints}
            </span>
          ) : null}
        </p>
      </div>

      <div className="min-h-[var(--target-min)]">
        {progress.unlocked && target ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {mascot ? (
                <span aria-hidden="true" className="mascot-hop shrink-0">
                  {mascot}
                </span>
              ) : null}
              <p className="flex items-center gap-2 font-display text-2xl font-bold text-accent">
                <Icon name="coffee" size={28} />
                {t("unlocked", { reward: target.name })}
              </p>
            </div>
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
