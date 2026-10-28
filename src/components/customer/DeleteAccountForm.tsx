"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormAlert } from "@/components/ui/FormAlert";
import { Icon } from "@/components/ui/icons/Icon";
import { PasswordField } from "@/components/ui/PasswordField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useFocusFirstError } from "@/components/ui/useFocusFirstError";
import { useFormText } from "@/components/ui/useFormText";
import { idleForm, type FormState } from "@/lib/forms";

type DeleteAccountFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
};

/**
 * Delete my account (§4.4). Folded away behind a disclosure so it can't be tapped by accident,
 * and confirmed with the password.
 */
export function DeleteAccountForm({ action }: DeleteAccountFormProps) {
  const t = useTranslations("account");
  const tCommon = useTranslations("common");
  const [state, formAction] = useActionState(action, idleForm);
  const text = useFormText(state);
  const formRef = useFocusFirstError(state.status, state);

  return (
    <details
      className="group rounded-[var(--radius-lg)] border border-line p-4"
      open={state.status === "error" || undefined}
    >
      <summary className="flex min-h-[var(--target-min)] cursor-pointer list-none items-center gap-2 font-semibold text-danger">
        <Icon name="trash" />
        {t("deleteTitle")}
        <Icon
          name="chevron-right"
          size={20}
          className="ml-auto transition-transform group-open:rotate-90"
        />
      </summary>
      <form
        suppressHydrationWarning
        ref={formRef}
        action={formAction}
        noValidate
        className="mt-4 flex flex-col gap-4"
      >
        <p className="text-ink">{t("deleteExplain")}</p>
        {text.formError ? <FormAlert tone="error">{text.formError}</FormAlert> : null}
        <PasswordField
          name="password"
          label={t("deletePassword")}
          error={text.fieldError("password")}
          autoComplete="current-password"
          showLabel={tCommon("showPassword")}
          hideLabel={tCommon("hidePassword")}
        />
        <SubmitButton icon="trash" variant="danger" pendingLabel={t("deleting")}>
          {t("deleteConfirm")}
        </SubmitButton>
      </form>
    </details>
  );
}
