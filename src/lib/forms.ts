import type { z } from "zod";

/**
 * State returned by every form's server action. Errors are message keys; values echo back what
 * was typed (never passwords) so the form keeps them after React resets it.
 */
export type FormState = {
  status: "idle" | "error" | "success";
  fieldErrors?: Record<string, string>;
  formError?: string;
  formErrorValues?: Record<string, string | number>;
  values?: Record<string, string>;
};

export const idleForm: FormState = { status: "idle" };

/** Our schemas use message keys like "phone.invalid"; anything else is a schema bug. */
const MESSAGE_KEY = /^[a-zA-Z]+\.[a-zA-Z]+$/;

/** First issue per field, keyed by field name. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    if (!MESSAGE_KEY.test(issue.message)) {
      // Field name and issue code only — never the submitted value.
      console.warn("Validation issue without a message key", { field, code: issue.code });
    }
    errors[field] ??= MESSAGE_KEY.test(issue.message) ? issue.message : "form.checkField";
  }
  return errors;
}

/** Plain-text form fields to echo back, skipping anything password-like. */
export function safeValues(formData: FormData, fields: readonly string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of fields) {
    if (/password/i.test(field)) continue;
    const value = formData.get(field);
    if (typeof value === "string") values[field] = value;
  }
  return values;
}

export function formDataObject(formData: FormData): Record<string, string> {
  const object: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") object[key] = value;
  }
  return object;
}
