"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState, type ClipboardEvent } from "react";
import { Icon } from "@/components/ui/icons/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { PendingRedemption } from "@/server/rewards/redemptions";
import { usePolling } from "./usePolling";

type RedeemCodeProps = {
  redemption: PendingRedemption;
  statusUrl: string;
  homeHref: string;
  newCodeAction: () => Promise<void>;
};

type StatusResponse = { redeemed: boolean; progress: { balance: number } };

const block = (event: ClipboardEvent) => event.preventDefault();

/**
 * Full-screen code for the cashier (§0 step 8, §11): 6 digits, 5-minute countdown, screen kept
 * awake where the browser allows. Switches to a confirmation when the cashier redeems it.
 */
export function RedeemCode({ redemption, statusUrl, homeHref, newCodeAction }: RedeemCodeProps) {
  const t = useTranslations("redeem");
  const [secondsLeft, setSecondsLeft] = useState(redemption.secondsLeft);
  const [redeemedBalance, setRedeemedBalance] = useState<number | null>(null);
  const expired = secondsLeft === 0;

  // Count down from the server's figure using this device's elapsed time, not its wall clock.
  useEffect(() => {
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((performance.now() - startedAt) / 1000);
      setSecondsLeft(Math.max(0, redemption.secondsLeft - elapsed));
    }, 250);
    return () => window.clearInterval(timer);
  }, [redemption.secondsLeft]);

  usePolling<StatusResponse>(`${statusUrl}?redemption=${redemption.id}`, 3000, (data) => {
    if (data.redeemed) setRedeemedBalance(data.progress.balance);
  });

  useScreenAwake(redeemedBalance === null && !expired);

  if (redeemedBalance !== null) {
    return (
      <div role="status" className="flex flex-col items-start gap-6">
        <p className="flex items-center gap-3 font-display text-5xl font-bold text-accent">
          <Icon name="check" size={44} />
          {t("done", { reward: redemption.rewardName })}
        </p>
        <p className="text-lg text-ink">{t("balanceNow", { balance: redeemedBalance })}</p>
        <Link href={homeHref} className="glass glass-primary glass-large w-full">
          {t("back")}
        </Link>
      </div>
    );
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg text-ink">{t("instructions", { reward: redemption.rewardName })}</p>
      <p
        role="img"
        aria-label={t("codeLabel", { code: redemption.code.split("").join(" ") })}
        className={`redeem-code flex justify-between gap-1.5 ${expired ? "opacity-40" : ""}`}
        onCopy={block}
        onCut={block}
        onContextMenu={(event) => event.preventDefault()}
      >
        {redemption.code.split("").map((digit, index) => (
          <span
            key={index}
            aria-hidden="true"
            className="digit-tile price-digits grid h-20 flex-1 place-items-center rounded-[var(--radius-md)] border border-line-strong bg-sunken text-5xl text-accent"
          >
            {digit}
          </span>
        ))}
      </p>
      {expired ? (
        <div className="flex flex-col gap-4">
          <p role="alert" className="font-semibold text-warning">
            {t("expired")}
          </p>
          <form suppressHydrationWarning action={newCodeAction}>
            <SubmitButton size="large" pendingLabel={t("gettingCode")}>
              {t("newCode")}
            </SubmitButton>
          </form>
        </div>
      ) : (
        <p className="text-ink-muted">
          <Icon name="timer" size={20} className="mr-1 inline-block align-[-4px]" />
          {t("expiresIn")}{" "}
          <span className="price-digits text-2xl text-ink" aria-hidden="true">
            {minutes}:{seconds}
          </span>
          <span className="sr-only">{t("timeLeft", { minutes, seconds: secondsLeft % 60 })}</span>
        </p>
      )}
      <Link href={homeHref} className="self-start py-2 font-semibold text-accent underline">
        {t("back")}
      </Link>
    </div>
  );
}

/** Keeps the screen on while the cashier reads the code (Wake Lock API; needs HTTPS, else a no-op). */
function useScreenAwake(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | undefined;
    const request = () =>
      navigator.wakeLock
        .request("screen")
        .then((lock) => (sentinel = lock))
        .catch(() => undefined);
    const onVisibility = () => document.visibilityState === "visible" && void request();
    void request();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release();
    };
  }, [active]);
}
