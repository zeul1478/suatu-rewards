"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormAlert } from "@/components/ui/FormAlert";
import { PasswordField } from "@/components/ui/PasswordField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TextField } from "@/components/ui/TextField";
import { useFocusFirstError } from "@/components/ui/useFocusFirstError";
import { useFormText } from "@/components/ui/useFormText";
import { idleForm, type FormState } from "@/lib/forms";

type StaffLoginFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  notice?: string;
};

/**
 * User name + password. When the account still has a temporary password (or, in production, the
 * development one), the server answers with step "newPassword": the same form then also asks
 * for a new password, and logs in once it's set.
 */
export function StaffLoginForm({ action, notice }: StaffLoginFormProps) {
  const t = useTranslations("staffLogin");
  const tCommon = useTranslations("common");
  const [state, formAction] = useActionState(action, idleForm);
  const text = useFormText(state);
  const formRef = useFocusFirstError(state.status, state);
  const newPasswordStep = state.values?.step === "newPassword";

  return (
    <form
      suppressHydrationWarning
      ref={formRef}
      action={formAction}
      noValidate
      className="flex flex-col gap-5"
    >
      {notice && state.status === "idle" ? <FormAlert tone="info">{notice}</FormAlert> : null}
      {text.formError ? (
        <FormAlert tone={newPasswordStep ? "info" : "error"}>{text.formError}</FormAlert>
      ) : null}
      <TextField
        name="staffCode"
        label={t("staffCode")}
        error={text.fieldError("staffCode")}
        autoComplete="username"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="next"
        variant="large"
        required
        defaultValue={state.values?.staffCode}
      />
      <PasswordField
        name="password"
        label={newPasswordStep ? t("currentPassword") : t("password")}
        error={text.fieldError("password")}
        autoComplete="current-password"
        showLabel={tCommon("showPassword")}
        hideLabel={tCommon("hidePassword")}
        variant="large"
      />
      {newPasswordStep ? (
        <PasswordField
          name="newPassword"
          label={t("newPassword")}
          hint={t("newPasswordHint")}
          error={text.fieldError("newPassword")}
          autoComplete="new-password"
          showLabel={tCommon("showPassword")}
          hideLabel={tCommon("hidePassword")}
          variant="large"
        />
      ) : null}
      <SubmitButton size="large" pendingLabel={t("submitting")}>
        {newPasswordStep ? t("submitNewPassword") : t("submit")}
      </SubmitButton>
    </form>
  );
}
