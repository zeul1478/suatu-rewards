"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TextField } from "@/components/ui/TextField";
import { useFocusFirstError } from "@/components/ui/useFocusFirstError";
import { useFormText } from "@/components/ui/useFormText";
import { idleForm, type FormState } from "@/lib/forms";

/** Points per visit and the limits at the counter (§11 settings, D78). */
export function SettingsForm({
  action,
  pointsPerVisit,
  maxVisitsPerDay,
  minMinutesBetweenVisits,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  pointsPerVisit: number;
  maxVisitsPerDay: number | null;
  minMinutesBetweenVisits: number | null;
}) {
  const t = useTranslations("dashboard.settings");
  const [state, formAction] = useActionState(action, idleForm);
  const text = useFormText(state);
  const formRef = useFocusFirstError(state.status, state);

  return (
    <form
      suppressHydrationWarning
      ref={formRef}
      action={formAction}
      noValidate
      className="flex flex-col gap-4"
    >
      {state.status === "success" ? <FormAlert tone="success">{t("saved")}</FormAlert> : null}
      <TextField
        name="pointsPerVisit"
        label={t("pointsPerVisit")}
        hint={t("pointsPerVisitHint")}
        error={text.fieldError("pointsPerVisit")}
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        required
        defaultValue={state.values?.pointsPerVisit ?? pointsPerVisit}
      />
      <fieldset className="flex flex-col gap-4 border-t border-line pt-4">
        <legend className="float-left mb-1 font-display text-lg font-semibold">
          {t("limitsTitle")}
        </legend>
        <p className="clear-left text-sm text-ink-muted">{t("limitsIntro")}</p>
        <TextField
          name="maxVisitsPerDay"
          label={t("maxVisitsPerDay")}
          hint={t("maxVisitsPerDayHint")}
          error={text.fieldError("maxVisitsPerDay")}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          defaultValue={state.values?.maxVisitsPerDay ?? maxVisitsPerDay ?? ""}
        />
        <TextField
          name="minMinutesBetweenVisits"
          label={t("minMinutesBetweenVisits")}
          hint={t("minMinutesBetweenVisitsHint")}
          error={text.fieldError("minMinutesBetweenVisits")}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          defaultValue={state.values?.minMinutesBetweenVisits ?? minMinutesBetweenVisits ?? ""}
        />
      </fieldset>
      <SubmitButton pendingLabel={t("saving")}>{t("save")}</SubmitButton>
    </form>
  );
}
