"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TextField } from "@/components/ui/TextField";
import { useFocusFirstError } from "@/components/ui/useFocusFirstError";
import { useFormText } from "@/components/ui/useFormText";
import { idleForm, type FormState } from "@/lib/forms";
import { latestAdultBirthday } from "@/lib/validation/customer";

type ProfileFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  current: { firstName: string; lastName: string; email: string; birthday: string | null };
};

/**
 * Edit name, email and the optional birthday. The phone number isn't editable: it identifies the
 * customer at the counter. A missing birthday gets a ★ prompt (birthday rewards).
 */
export function ProfileForm({ action, current }: ProfileFormProps) {
  const t = useTranslations("account");
  const tSignup = useTranslations("signup");
  const [state, formAction] = useActionState(action, idleForm);
  const text = useFormText(state);
  const formRef = useFocusFirstError(state.status, state);
  const values = state.values ?? { ...current, birthday: current.birthday ?? "" };

  return (
    <form
      suppressHydrationWarning
      ref={formRef}
      action={formAction}
      noValidate
      className="flex flex-col gap-5"
    >
      {state.status === "success" && state.formError ? (
        <FormAlert tone="success">{text.formError}</FormAlert>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="firstName"
          label={tSignup("firstName")}
          error={text.fieldError("firstName")}
          autoComplete="given-name"
          autoCapitalize="words"
          required
          defaultValue={values.firstName}
        />
        <TextField
          name="lastName"
          label={tSignup("lastName")}
          error={text.fieldError("lastName")}
          autoComplete="family-name"
          autoCapitalize="words"
          required
          defaultValue={values.lastName}
        />
      </div>
      <TextField
        name="email"
        label={tSignup("email")}
        hint={t("emailHint")}
        error={text.fieldError("email")}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="off"
        required
        defaultValue={values.email}
      />
      {current.birthday ? null : (
        <p className="flex items-start gap-2 rounded-[var(--radius-md)] border border-accent bg-sunken px-4 py-3 font-semibold text-ink">
          <span aria-hidden="true" className="text-accent">
            ★
          </span>
          {t("birthdayPrompt")}
        </p>
      )}
      <TextField
        name="birthday"
        label={tSignup("birthday")}
        hint={t("birthdayHint")}
        error={text.fieldError("birthday")}
        type="date"
        autoComplete="bday"
        min="1900-01-01"
        max={latestAdultBirthday()}
        defaultValue={values.birthday}
      />
      <SubmitButton icon="check" variant="secondary" pendingLabel={t("saving")}>
        {t("saveDetails")}
      </SubmitButton>
    </form>
  );
}
