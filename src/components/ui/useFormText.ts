"use client";

import { useTranslations } from "next-intl";
import type { FormState } from "@/lib/forms";

/** Translates a FormState's error keys: field errors live under "errors", form errors are full keys. */
export function useFormText(state: FormState) {
  const t = useTranslations();
  return {
    fieldError: (field: string) => {
      const key = state.fieldErrors?.[field];
      return key ? t(`errors.${key}`) : undefined;
    },
    formError: state.formError ? t(state.formError, state.formErrorValues) : undefined,
    hasFieldErrors: Boolean(state.fieldErrors && Object.keys(state.fieldErrors).length > 0),
  };
}
