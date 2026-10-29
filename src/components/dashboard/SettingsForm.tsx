"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TextField } from "@/components/ui/TextField";
import { useFocusFirstError } from "@/components/ui/useFocusFirstError";
import { useFormText } from "@/components/ui/useFormText";
import { idleForm, type FormState } from "@/lib/forms";

/** Points per visit (§11 settings). */
export function SettingsForm({
  action,
  pointsPerVisit,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  pointsPerVisit: number;
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
      <SubmitButton pendingLabel={t("saving")}>{t("save")}</SubmitButton>
    </form>
  );
}
