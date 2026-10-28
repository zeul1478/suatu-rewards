"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";
import { FormAlert } from "@/components/ui/FormAlert";
import { PasswordField } from "@/components/ui/PasswordField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TextField } from "@/components/ui/TextField";
import { useFocusFirstError } from "@/components/ui/useFocusFirstError";
import { useFormText } from "@/components/ui/useFormText";
import { idleForm, type FormState } from "@/lib/forms";

type LoginFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  forgotHref: string;
  signupHref: string;
};

export function LoginForm({ action, forgotHref, signupHref }: LoginFormProps) {
  const t = useTranslations("login");
  const tCommon = useTranslations("common");
  const [state, formAction] = useActionState(action, idleForm);
  const text = useFormText(state);
  const formRef = useFocusFirstError(state.status, state);

  return (
    <form
      suppressHydrationWarning
      ref={formRef}
      action={formAction}
      noValidate
      className="flex flex-col gap-5"
    >
      {text.formError ? <FormAlert tone="error">{text.formError}</FormAlert> : null}

      <TextField
        name="phone"
        label={t("phone")}
        error={text.fieldError("phone")}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        enterKeyHint="next"
        required
        defaultValue={state.values?.phone}
      />
      <PasswordField
        name="password"
        label={t("password")}
        error={text.fieldError("password")}
        autoComplete="current-password"
        showLabel={tCommon("showPassword")}
        hideLabel={tCommon("hidePassword")}
      />
      <Link href={forgotHref} className="-mt-2 self-start py-2 font-semibold text-accent underline">
        {t("forgot")}
      </Link>

      <SubmitButton pendingLabel={t("submitting")}>{t("submit")}</SubmitButton>

      <p className="text-ink-muted">
        {t("noAccount")}{" "}
        <Link href={signupHref} className="font-semibold text-accent underline">
          {t("createAccount")}
        </Link>
      </p>
    </form>
  );
}
