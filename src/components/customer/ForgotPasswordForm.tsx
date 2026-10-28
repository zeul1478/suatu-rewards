"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TextField } from "@/components/ui/TextField";
import { useFocusFirstError } from "@/components/ui/useFocusFirstError";
import { useFormText } from "@/components/ui/useFormText";
import { idleForm, type FormState } from "@/lib/forms";

type ForgotPasswordFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  loginHref: string;
  showDevNote: boolean;
};

export function ForgotPasswordForm({ action, loginHref, showDevNote }: ForgotPasswordFormProps) {
  const t = useTranslations("forgot");
  const [state, formAction] = useActionState(action, idleForm);
  const text = useFormText(state);
  const formRef = useFocusFirstError(state.status, state);

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-5">
      {state.status === "success" ? (
        <FormAlert tone="success">
          {t("sent")}
          {showDevNote ? <span className="mt-2 block font-normal">{t("devMailpit")}</span> : null}
        </FormAlert>
      ) : null}

      <TextField
        name="phone"
        label={t("phone")}
        error={text.fieldError("phone")}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        enterKeyHint="send"
        required
        defaultValue={state.values?.phone}
      />
      <SubmitButton pendingLabel={t("submitting")}>{t("submit")}</SubmitButton>
      <Link href={loginHref} className="self-start py-2 font-semibold text-accent underline">
        {t("back")}
      </Link>
    </form>
  );
}
