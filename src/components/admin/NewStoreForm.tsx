"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormAlert } from "@/components/ui/FormAlert";
import { PasswordField } from "@/components/ui/PasswordField";
import { RequiredMark } from "@/components/ui/RequiredMark";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TextField } from "@/components/ui/TextField";
import { useFocusFirstError } from "@/components/ui/useFocusFirstError";
import { useFormText } from "@/components/ui/useFormText";
import { idleForm, type FormState } from "@/lib/forms";
import { FieldError } from "@/components/ui/FieldError";

export type TimezoneGroup = { label: string; zones: { value: string; label: string }[] };

/**
 * A new store and its first owner. The owner's password is temporary, like every password
 * someone else types: they choose their own at their first login.
 */
export function NewStoreForm({
  action,
  timezoneGroups,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  timezoneGroups: TimezoneGroup[];
}) {
  const t = useTranslations("admin.newStore");
  const tCommon = useTranslations("common");
  const [state, formAction] = useActionState(action, idleForm);
  const text = useFormText(state);
  const formRef = useFocusFirstError(state.status, state);
  const values = state.status === "error" ? state.values : undefined;
  const timezoneError = text.fieldError("timezone");

  return (
    <form
      suppressHydrationWarning
      ref={formRef}
      action={formAction}
      noValidate
      className="flex flex-col gap-8"
    >
      {text.formError ? <FormAlert tone="error">{text.formError}</FormAlert> : null}

      <fieldset className="flex flex-col gap-4">
        <legend className="section-heading mb-3">{t("storeTitle")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="name"
            label={t("name")}
            hint={t("nameHint")}
            error={text.fieldError("name")}
            maxLength={60}
            autoComplete="off"
            required
            defaultValue={values?.name}
          />
          <TextField
            name="slug"
            label={t("slug")}
            hint={t("slugHint")}
            error={text.fieldError("slug")}
            maxLength={40}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            required
            defaultValue={values?.slug}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-0.5">
              <label htmlFor="field-timezone" className="font-semibold text-ink">
                {t("timezone")}
              </label>
              <RequiredMark />
            </div>
            <p id="field-timezone-hint" className="text-sm text-ink-muted">
              {t("timezoneHint")}
            </p>
            <select
              suppressHydrationWarning
              id="field-timezone"
              name="timezone"
              required
              defaultValue={values?.timezone ?? ""}
              aria-invalid={timezoneError ? true : undefined}
              aria-describedby={
                timezoneError ? "field-timezone-hint field-timezone-error" : "field-timezone-hint"
              }
              className="field-input"
            >
              <option value="" disabled>
                {t("timezoneChoose")}
              </option>
              {timezoneGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.zones.map((zone) => (
                    <option key={zone.value} value={zone.value}>
                      {zone.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <FieldError id="field-timezone-error" message={timezoneError} />
          </div>
          <TextField
            name="pointsPerVisit"
            label={t("pointsPerVisit")}
            hint={t("pointsPerVisitHint")}
            error={text.fieldError("pointsPerVisit")}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            required
            defaultValue={values?.pointsPerVisit ?? "5"}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="section-heading mb-3">{t("ownerTitle")}</legend>
        <p className="text-ink-muted">{t("ownerIntro")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="ownerName"
            label={t("ownerName")}
            error={text.fieldError("ownerName")}
            maxLength={40}
            autoComplete="off"
            required
            defaultValue={values?.ownerName}
          />
          <TextField
            name="ownerCode"
            label={t("ownerCode")}
            hint={t("ownerCodeHint")}
            error={text.fieldError("ownerCode")}
            maxLength={32}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            required
            defaultValue={values?.ownerCode}
          />
        </div>
        <PasswordField
          name="ownerPassword"
          label={t("ownerPassword")}
          hint={t("ownerPasswordHint")}
          error={text.fieldError("ownerPassword")}
          autoComplete="new-password"
          showLabel={tCommon("showPassword")}
          hideLabel={tCommon("hidePassword")}
        />
      </fieldset>

      <SubmitButton icon="plus" pendingLabel={t("creating")}>
        {t("create")}
      </SubmitButton>
    </form>
  );
}
