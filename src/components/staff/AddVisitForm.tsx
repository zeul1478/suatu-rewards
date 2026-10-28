"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TextField } from "@/components/ui/TextField";
import type { AddVisitState, VisitBanner } from "@/app/staff/[storeSlug]/actions";

type AddVisitFormProps = {
  action: (state: AddVisitState, formData: FormData) => Promise<AddVisitState>;
  initialKey: string;
  pointsPerVisit: number;
};

/**
 * Phone field → Add visit (§0 steps 4, 6, 10). The hidden idempotency key changes after every
 * success, so each new entry counts and a double tap of the same entry doesn't. After a success
 * the field empties and keeps focus for the next customer.
 */
export function AddVisitForm({ action, initialKey, pointsPerVisit }: AddVisitFormProps) {
  const t = useTranslations("staff");
  const tAll = useTranslations();
  const [state, formAction] = useActionState(action, { status: "idle", nextKey: initialKey });
  const phoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.status !== "idle") phoneRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="idempotencyKey" value={state.nextKey} />
      <TextField
        ref={phoneRef}
        name="phone"
        label={t("phone")}
        hint={t("phoneHint")}
        error={state.status === "error" && state.error ? tAll(state.error) : undefined}
        type="tel"
        inputMode="tel"
        autoComplete="off"
        enterKeyHint="done"
        variant="large"
        required
        defaultValue={state.status === "error" ? state.phone : undefined}
      />
      <SubmitButton size="large" pendingLabel={t("adding")}>
        {t("addVisit", { points: pointsPerVisit })}
      </SubmitButton>
      <div aria-live="polite" className="min-h-[5.5rem]">
        {state.status === "success" && state.banner ? <VisitResult banner={state.banner} /> : null}
      </div>
    </form>
  );
}

function VisitResult({ banner }: { banner: VisitBanner }) {
  const t = useTranslations("staff");
  if (banner.duplicate) return <FormAlert tone="info">{t("duplicate")}</FormAlert>;

  const who = banner.customerName ?? `••• ${banner.phoneLast4}`;
  const score =
    banner.targetCost === null ? `${banner.balance}` : `${banner.balance} / ${banner.targetCost}`;
  const parts = banner.isNewCustomer
    ? [t("newCustomer"), t("pointsAdded", { points: banner.added }), score]
    : [t("pointsAdded", { points: banner.added }), who, score];
  if (banner.rewardName && !banner.unlocked) {
    parts.push(t("visitsToGo", { visits: banner.visitsToNext, reward: banner.rewardName }));
  }

  return (
    <FormAlert tone="success">
      <span data-testid="visit-banner" className="block text-lg">
        {parts.join(" · ")}
      </span>
      {banner.unlocked && banner.rewardName ? (
        <span className="mt-1 block text-accent">
          {t("rewardAvailable", { reward: banner.rewardName })}
        </span>
      ) : null}
      {banner.isNewCustomer ? (
        <span className="mt-1 block font-normal">{t("newCustomerHint")}</span>
      ) : null}
    </FormAlert>
  );
}
