"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TextField } from "@/components/ui/TextField";
import { useFocusFirstError } from "@/components/ui/useFocusFirstError";
import { useFormText } from "@/components/ui/useFormText";
import { idleForm, type FormState } from "@/lib/forms";

type AdjustPointsFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  /** Idempotency key for the first adjustment; the server hands out the next one. */
  initialKey: string;
};

/** Add or remove points by hand (§7 adjust_points): a note is required, kept in the history. */
export function AdjustPointsForm({ action, initialKey }: AdjustPointsFormProps) {
  const t = useTranslations("dashboard.adjust");
  const [state, formAction] = useActionState(action, idleForm);
  const text = useFormText(state);
  const formRef = useFocusFirstError(state.status, state);
  const values = state.status === "error" ? state.values : undefined;
  const direction = values?.direction ?? "add";

  return (
    <form
      suppressHydrationWarning
      ref={formRef}
      action={formAction}
      noValidate
      className="flex flex-col gap-4"
    >
      <input
        type="hidden"
        name="idempotencyKey"
        value={state.values?.idempotencyKey ?? initialKey}
      />
      {state.status === "success" ? (
        <FormAlert tone="success">{t("done", state.formErrorValues)}</FormAlert>
      ) : null}
      {text.formError ? <FormAlert tone="error">{text.formError}</FormAlert> : null}

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 font-semibold">{t("direction")}</legend>
        <div className="flex flex-wrap gap-x-6">
          {(["add", "remove"] as const).map((option) => (
            <label key={option} className="flex min-h-[var(--target-min)] items-center gap-3">
              <input
                suppressHydrationWarning
                type="radio"
                name="direction"
                value={option}
                defaultChecked={direction === option}
                className="checkbox-input"
              />
              {t(option)}
            </label>
          ))}
        </div>
      </fieldset>
      <TextField
        name="points"
        label={t("points")}
        error={text.fieldError("points")}
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        required
        defaultValue={values?.points}
      />
      <TextField
        name="note"
        label={t("note")}
        hint={t("noteHint")}
        error={text.fieldError("note")}
        maxLength={200}
        autoComplete="off"
        required
        defaultValue={values?.note}
      />
      <SubmitButton pendingLabel={t("saving")}>{t("submit")}</SubmitButton>
    </form>
  );
}
