"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormAlert } from "@/components/ui/FormAlert";
import { LegalHtml } from "@/components/ui/LegalHtml";
import { PasswordField } from "@/components/ui/PasswordField";
import { Sheet } from "@/components/ui/Sheet";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TextField } from "@/components/ui/TextField";
import { useFocusFirstError } from "@/components/ui/useFocusFirstError";
import { useFormText } from "@/components/ui/useFormText";
import { idleForm, type FormState } from "@/lib/forms";
import { latestAdultBirthday } from "@/lib/validation/customer";

type LegalDoc = { title: string; html: string };

type SignupFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  storeName: string;
  loginHref: string;
  legal: { programTerms: LegalDoc; termsOfUse: LegalDoc; privacyPolicy: LegalDoc };
};

export function SignupForm({ action, storeName, loginHref, legal }: SignupFormProps) {
  const t = useTranslations("signup");
  const tCommon = useTranslations("common");
  const [state, formAction] = useActionState(action, idleForm);
  const text = useFormText(state);
  const formRef = useFocusFirstError(state.status, state);
  const values = state.values ?? {};

  const docLink = (doc: LegalDoc) => (
    <Sheet
      title={doc.title}
      closeLabel={tCommon("close")}
      trigger={
        <button type="button" className="min-h-[var(--target-min)] text-accent underline">
          {doc.title}
        </button>
      }
    >
      <LegalHtml html={doc.html} />
    </Sheet>
  );

  return (
    <form
      suppressHydrationWarning
      ref={formRef}
      action={formAction}
      noValidate
      className="flex flex-col gap-5"
    >
      {text.formError ? <FormAlert tone="error">{text.formError}</FormAlert> : null}
      {text.hasFieldErrors ? <FormAlert tone="error">{tCommon("fixFields")}</FormAlert> : null}

      <TextField
        name="phone"
        label={t("phone")}
        hint={t("phoneHint")}
        error={text.fieldError("phone")}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        enterKeyHint="next"
        required
        defaultValue={values.phone}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="firstName"
          label={t("firstName")}
          error={text.fieldError("firstName")}
          autoComplete="given-name"
          autoCapitalize="words"
          enterKeyHint="next"
          required
          defaultValue={values.firstName}
        />
        <TextField
          name="lastName"
          label={t("lastName")}
          error={text.fieldError("lastName")}
          autoComplete="family-name"
          autoCapitalize="words"
          enterKeyHint="next"
          required
          defaultValue={values.lastName}
        />
      </div>
      <TextField
        name="email"
        label={t("email")}
        hint={t("emailHint")}
        error={text.fieldError("email")}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="off"
        enterKeyHint="next"
        required
        defaultValue={values.email}
      />
      {/* Optional, so no "*"; the phone's own date picker (calendar and year). */}
      <TextField
        name="birthday"
        label={t("birthday")}
        hint={t("birthdayHint")}
        error={text.fieldError("birthday")}
        type="date"
        autoComplete="bday"
        min="1900-01-01"
        max={latestAdultBirthday()}
        defaultValue={values.birthday}
      />
      <PasswordField
        name="password"
        label={t("password")}
        hint={t("passwordHint")}
        error={text.fieldError("password")}
        autoComplete="new-password"
        showLabel={tCommon("showPassword")}
        hideLabel={tCommon("hidePassword")}
      />

      <fieldset className="flex flex-col gap-1 border-t border-line pt-4">
        <legend className="sr-only">{t("acceptTerms")}</legend>
        <Checkbox
          name="acceptTerms"
          required
          error={text.fieldError("acceptTerms")}
          defaultChecked={values.acceptTerms === "on"}
        >
          {t("acceptTerms")}
        </Checkbox>
        <p className="flex flex-wrap items-center gap-x-3 pl-9 text-sm text-ink-muted">
          <span>{t("readTerms")}</span>
          {docLink(legal.programTerms)}
          {docLink(legal.termsOfUse)}
          {docLink(legal.privacyPolicy)}
        </p>
        <Checkbox
          name="confirmAdult"
          required
          error={text.fieldError("confirmAdult")}
          defaultChecked={values.confirmAdult === "on"}
        >
          {t("confirmAdult")}
        </Checkbox>
        <Checkbox name="marketingEmail" defaultChecked={values.marketingEmail === "on"}>
          {t("marketingEmail", { store: storeName })}
        </Checkbox>
        <Checkbox name="smsUpdates" defaultChecked={values.smsUpdates === "on"}>
          {t("smsUpdates")}
        </Checkbox>
        <Checkbox name="smsMarketing" defaultChecked={values.smsMarketing === "on"}>
          {t("smsMarketing", { store: storeName })}
        </Checkbox>
        <p className="pl-9 text-sm text-ink-muted">{t("smsLegal")}</p>
      </fieldset>

      <SubmitButton pendingLabel={t("submitting")}>{t("submit")}</SubmitButton>

      <p className="text-ink-muted">
        {t("haveAccount")}{" "}
        <Link href={loginHref} className="font-semibold text-accent underline">
          {t("logIn")}
        </Link>
      </p>
    </form>
  );
}
