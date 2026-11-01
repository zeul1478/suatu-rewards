"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TextField } from "@/components/ui/TextField";
import { useFocusFirstError } from "@/components/ui/useFocusFirstError";
import { useFormText } from "@/components/ui/useFormText";
import { idleForm, type FormState } from "@/lib/forms";

type Rules = {
  welcomeBonus: number | null;
  birthdayBonus: number | null;
  doubleMultiplier: number | null;
  doubleFrom: string | null;
  doubleTo: string | null;
  expireAfterMonths: number | null;
};

/** Welcome and birthday bonus, double-points days, points expiry (D84). Empty = off. */
export function RewardRulesForm({
  action,
  rules,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  rules: Rules;
}) {
  const t = useTranslations("dashboard.settings");
  const [state, formAction] = useActionState(action, idleForm);
  const text = useFormText(state);
  const formRef = useFocusFirstError(state.status, state);
  const value = (key: keyof Rules) => state.values?.[key] ?? rules[key] ?? "";
  const number = (key: keyof Rules) => ({
    name: key,
    error: text.fieldError(key),
    inputMode: "numeric" as const,
    pattern: "[0-9]*",
    autoComplete: "off",
    defaultValue: value(key),
  });

  return (
    <form
      suppressHydrationWarning
      ref={formRef}
      action={formAction}
      noValidate
      className="flex flex-col gap-4"
    >
      {state.status === "success" ? <FormAlert tone="success">{t("saved")}</FormAlert> : null}
      <p className="text-sm text-ink-muted">{t("rulesIntro")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t("welcomeBonus")}
          hint={t("welcomeBonusHint")}
          {...number("welcomeBonus")}
        />
        <TextField
          label={t("birthdayBonus")}
          hint={t("birthdayBonusHint")}
          {...number("birthdayBonus")}
        />
      </div>
      <fieldset className="flex flex-col gap-4 border-t border-line pt-4">
        <legend className="float-left mb-1 font-display text-lg font-semibold">
          {t("doubleTitle")}
        </legend>
        <p className="clear-left text-sm text-ink-muted">{t("doubleIntro")}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label={t("doubleMultiplier")}
            hint={t("doubleMultiplierHint")}
            {...number("doubleMultiplier")}
          />
          <TextField
            name="doubleFrom"
            label={t("doubleFrom")}
            type="date"
            error={text.fieldError("doubleFrom")}
            defaultValue={value("doubleFrom")}
          />
          <TextField
            name="doubleTo"
            label={t("doubleTo")}
            type="date"
            error={text.fieldError("doubleTo")}
            defaultValue={value("doubleTo")}
          />
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-4 border-t border-line pt-4">
        <legend className="float-left mb-1 font-display text-lg font-semibold">
          {t("expiryTitle")}
        </legend>
        <p className="clear-left text-sm text-ink-muted">{t("expiryIntro")}</p>
        <TextField
          label={t("expireAfterMonths")}
          hint={t("expireAfterMonthsHint")}
          {...number("expireAfterMonths")}
        />
      </fieldset>
      <SubmitButton pendingLabel={t("saving")}>{t("saveRules")}</SubmitButton>
    </form>
  );
}
