"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";
import { FormAlert } from "@/components/ui/FormAlert";
import { PasswordField } from "@/components/ui/PasswordField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useFocusFirstError } from "@/components/ui/useFocusFirstError";
import { useFormText } from "@/components/ui/useFormText";
import { idleForm, type FormState } from "@/lib/forms";

type ResetPasswordFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  token: string;
  customerId: string;
  forgotHref: string;
};

export function ResetPasswordForm({
  action,
  token,
  customerId,
  forgotHref,
}: ResetPasswordFormProps) {
  const t = useTranslations("reset");
  const tCommon = useTranslations("common");
  const [state, formAction] = useActionState(action, idleForm);
  const text = useFormText(state);
  const formRef = useFocusFirstError(state.status, state);

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-5">
      {text.formError ? (
        <FormAlert tone="error">
          {text.formError}{" "}
          <Link href={forgotHref} className="underline">
            {t("requestNew")}
          </Link>
        </FormAlert>
      ) : null}
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="customerId" value={customerId} />
      <PasswordField
        name="password"
        label={t("password")}
        hint={t("passwordHint")}
        error={text.fieldError("password")}
        autoComplete="new-password"
        showLabel={tCommon("showPassword")}
        hideLabel={tCommon("hidePassword")}
      />
      <SubmitButton pendingLabel={t("submitting")}>{t("submit")}</SubmitButton>
    </form>
  );
}
