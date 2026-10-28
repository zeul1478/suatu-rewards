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

export function StaffLoginForm({ action, notice }: StaffLoginFormProps) {
  const t = useTranslations("staffLogin");
  const tCommon = useTranslations("common");
  const [state, formAction] = useActionState(action, idleForm);
  const text = useFormText(state);
  const formRef = useFocusFirstError(state.status, state);

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-5">
      {notice && state.status === "idle" ? <FormAlert tone="info">{notice}</FormAlert> : null}
      {text.formError ? <FormAlert tone="error">{text.formError}</FormAlert> : null}
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
        label={t("password")}
        error={text.fieldError("password")}
        autoComplete="current-password"
        showLabel={tCommon("showPassword")}
        hideLabel={tCommon("hidePassword")}
        variant="large"
      />
      <SubmitButton size="large" pendingLabel={t("submitting")}>
        {t("submit")}
      </SubmitButton>
    </form>
  );
}
