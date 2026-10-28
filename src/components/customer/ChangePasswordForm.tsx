"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormAlert } from "@/components/ui/FormAlert";
import { PasswordField } from "@/components/ui/PasswordField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useFocusFirstError } from "@/components/ui/useFocusFirstError";
import { useFormText } from "@/components/ui/useFormText";
import { idleForm, type FormState } from "@/lib/forms";

type ChangePasswordFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
};

export function ChangePasswordForm({ action }: ChangePasswordFormProps) {
  const t = useTranslations("account");
  const tCommon = useTranslations("common");
  const [state, formAction] = useActionState(action, idleForm);
  const text = useFormText(state);
  const formRef = useFocusFirstError(state.status, state);

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-5">
      {state.status === "success" ? (
        <FormAlert tone="success">{t("passwordChanged")}</FormAlert>
      ) : null}
      {text.formError ? <FormAlert tone="error">{text.formError}</FormAlert> : null}
      <PasswordField
        name="currentPassword"
        label={t("currentPassword")}
        error={text.fieldError("currentPassword")}
        autoComplete="current-password"
        showLabel={tCommon("showPassword")}
        hideLabel={tCommon("hidePassword")}
      />
      <PasswordField
        name="newPassword"
        label={t("newPassword")}
        hint={t("newPasswordHint")}
        error={text.fieldError("newPassword")}
        autoComplete="new-password"
        showLabel={tCommon("showPassword")}
        hideLabel={tCommon("hidePassword")}
      />
      <SubmitButton pendingLabel={t("savingPassword")}>{t("savePassword")}</SubmitButton>
    </form>
  );
}
