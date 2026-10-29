"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormAlert } from "@/components/ui/FormAlert";
import { Icon } from "@/components/ui/icons/Icon";
import { PasswordField } from "@/components/ui/PasswordField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TextField } from "@/components/ui/TextField";
import { useFocusFirstError } from "@/components/ui/useFocusFirstError";
import { useFormText } from "@/components/ui/useFormText";
import { idleForm, type FormState } from "@/lib/forms";

type FormAction = (state: FormState, formData: FormData) => Promise<FormState>;

/** Add a person (§6). The password typed here is temporary: they choose their own at first login. */
export function AddStaffForm({ action }: { action: FormAction }) {
  const t = useTranslations("dashboard.staff");
  const tCommon = useTranslations("common");
  const [state, formAction] = useActionState(action, idleForm);
  const text = useFormText(state);
  const formRef = useFocusFirstError(state.status, state);
  const values = state.status === "error" ? state.values : undefined;

  return (
    <form
      suppressHydrationWarning
      ref={formRef}
      action={formAction}
      noValidate
      className="flex flex-col gap-4"
    >
      {state.status === "success" ? (
        <FormAlert tone="success">{t("added", state.formErrorValues)}</FormAlert>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="displayName"
          label={t("displayName")}
          hint={t("displayNameHint")}
          error={text.fieldError("displayName")}
          maxLength={40}
          autoComplete="off"
          required
          defaultValue={values?.displayName}
        />
        <TextField
          name="staffCode"
          label={t("staffCode")}
          hint={t("staffCodeHint")}
          error={text.fieldError("staffCode")}
          maxLength={32}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          required
          defaultValue={values?.staffCode}
        />
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 font-semibold">{t("role")}</legend>
        <div className="flex flex-col gap-x-6 sm:flex-row">
          {(["cashier", "manager"] as const).map((role) => (
            <label key={role} className="flex min-h-[var(--target-min)] items-center gap-3">
              <input
                suppressHydrationWarning
                type="radio"
                name="role"
                value={role}
                defaultChecked={(values?.role ?? "cashier") === role}
                className="checkbox-input"
              />
              <span>
                <span className="font-semibold">{t(`roles.${role}`)}</span>
                <span className="block text-sm text-ink-muted">{t(`roles.${role}Hint`)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <PasswordField
        name="password"
        label={t("tempPassword")}
        hint={t("tempPasswordHint")}
        error={text.fieldError("password")}
        autoComplete="new-password"
        showLabel={tCommon("showPassword")}
        hideLabel={tCommon("hidePassword")}
      />
      <SubmitButton icon="plus" pendingLabel={t("adding")}>
        {t("add")}
      </SubmitButton>
    </form>
  );
}

/** Turn a person off (their sessions end at once) or back on. */
export function StaffActiveButton({
  action,
  active,
  name,
}: {
  action: () => Promise<FormState>;
  active: boolean;
  name: string;
}) {
  const t = useTranslations("dashboard.staff");
  const [state, formAction] = useActionState(action, idleForm);
  const text = useFormText(state);
  return (
    <form suppressHydrationWarning action={formAction} className="flex flex-col gap-2">
      {text.formError ? <FormAlert tone="error">{text.formError}</FormAlert> : null}
      <SubmitButton
        variant={active ? "danger" : "secondary"}
        pendingLabel={t("saving")}
        icon={active ? "lock" : "check"}
      >
        {active ? t("turnOff", { name }) : t("turnOn", { name })}
      </SubmitButton>
    </form>
  );
}

/** New temporary password for someone who forgot theirs. */
export function ResetStaffPasswordForm({
  action,
  name,
  idPrefix,
}: {
  action: FormAction;
  name: string;
  idPrefix: string;
}) {
  const t = useTranslations("dashboard.staff");
  const tCommon = useTranslations("common");
  const [state, formAction] = useActionState(action, idleForm);
  const text = useFormText(state);
  const formRef = useFocusFirstError(state.status, state);

  return (
    <details className="group" open={state.status === "error" || undefined}>
      <summary className="flex min-h-[var(--target-min)] w-fit cursor-pointer list-none items-center gap-2 font-semibold text-accent">
        <Icon name="lock" size={20} />
        {t("resetTitle", { name })}
      </summary>
      <form
        suppressHydrationWarning
        ref={formRef}
        action={formAction}
        noValidate
        className="mt-2 flex flex-col gap-3"
      >
        {state.status === "success" ? (
          <FormAlert tone="success">{t("resetDone", { name })}</FormAlert>
        ) : null}
        {text.formError ? <FormAlert tone="error">{text.formError}</FormAlert> : null}
        <PasswordField
          idPrefix={idPrefix}
          name="password"
          label={t("tempPassword")}
          hint={t("resetHint")}
          error={text.fieldError("password")}
          autoComplete="new-password"
          showLabel={tCommon("showPassword")}
          hideLabel={tCommon("hidePassword")}
        />
        <SubmitButton pendingLabel={t("saving")}>{t("resetSubmit")}</SubmitButton>
      </form>
    </details>
  );
}
