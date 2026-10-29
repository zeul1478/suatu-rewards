"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormAlert } from "@/components/ui/FormAlert";
import { Icon } from "@/components/ui/icons/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TextField } from "@/components/ui/TextField";
import { useFocusFirstError } from "@/components/ui/useFocusFirstError";
import { useFormText } from "@/components/ui/useFormText";
import { idleForm, type FormState } from "@/lib/forms";

/**
 * Release a phone number (DECISIONS D4). Folded away and confirmed with a reason and a tick,
 * because it erases the account's personal data and can't be undone.
 */
export function ReleaseNumberForm({
  action,
  phone,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  phone: string;
}) {
  const t = useTranslations("dashboard.release");
  const [state, formAction] = useActionState(action, idleForm);
  const text = useFormText(state);
  const formRef = useFocusFirstError(state.status, state);

  return (
    <details
      className="group rounded-[var(--radius-lg)] border border-line p-4"
      open={state.status === "error" || undefined}
    >
      <summary className="flex min-h-[var(--target-min)] cursor-pointer list-none items-center gap-2 font-semibold text-danger">
        <Icon name="phone" />
        {t("title")}
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
        <p>{t("explain", { phone })}</p>
        {text.formError ? <FormAlert tone="error">{text.formError}</FormAlert> : null}
        <TextField
          name="reason"
          label={t("reason")}
          hint={t("reasonHint")}
          error={text.fieldError("reason")}
          maxLength={200}
          autoComplete="off"
          required
          defaultValue={state.values?.reason}
        />
        <Checkbox name="confirm" required error={text.fieldError("confirm")}>
          {t("confirm")}
        </Checkbox>
        <SubmitButton icon="trash" variant="danger" pendingLabel={t("releasing")}>
          {t("submit")}
        </SubmitButton>
      </form>
    </details>
  );
}
