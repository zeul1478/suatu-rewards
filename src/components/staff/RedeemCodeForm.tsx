"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TextField } from "@/components/ui/TextField";
import { useFormText } from "@/components/ui/useFormText";
import { idleForm, type FormState } from "@/lib/forms";

type RedeemCodeFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
};

/** The 6-digit code from the customer's phone → Redeem (§0 step 9). */
export function RedeemCodeForm({ action }: RedeemCodeFormProps) {
  const t = useTranslations("staff");
  const [state, formAction] = useActionState(action, idleForm);
  const text = useFormText(state);

  return (
    <form suppressHydrationWarning action={formAction} noValidate className="flex flex-col gap-4">
      <TextField
        name="code"
        label={t("code")}
        error={text.formError}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        enterKeyHint="done"
        variant="large"
      />
      <SubmitButton icon="check" variant="secondary" pendingLabel={t("redeeming")}>
        {t("redeem")}
      </SubmitButton>
      <div aria-live="polite">
        {state.status === "success" && state.values ? (
          <FormAlert tone="success">
            <span data-testid="redeem-banner">
              {t("redeemed", {
                reward: state.values.rewardName ?? "",
                last4: state.values.phoneLast4 ?? "",
              })}
            </span>
          </FormAlert>
        ) : null}
      </div>
    </form>
  );
}
