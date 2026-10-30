import { z } from "zod";
import { checkPasswordLength } from "@/lib/password/length";
import { normalizePhone } from "@/lib/phone";

/*
 * Customer form schemas, shared by the browser and the server. Error messages are message keys
 * (see src/messages/en.json → "errors"), translated where they're shown.
 */

const NAME_PATTERN = /^[\p{L}\p{M}]+(?:[ '’-][\p{L}\p{M}]+)*$/u;

export const nameSchema = (key: "firstName" | "lastName") =>
  z
    .string()
    .transform((value) => value.trim().replace(/\s+/g, " "))
    .pipe(
      z
        .string()
        .min(1, `${key}.required`)
        .max(50, `${key}.tooLong`)
        .regex(NAME_PATTERN, `${key}.invalid`),
    );

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "phone.required")
  .transform((value, ctx) => {
    const e164 = normalizePhone(value);
    if (!e164) {
      ctx.addIssue({ code: "custom", message: "phone.invalid" });
      return z.NEVER;
    }
    return e164;
  });

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "email.required")
  .pipe(z.email("email.invalid").max(254, "email.invalid"));

/** The latest birthday that is 18 or older today, "YYYY-MM-DD" (also the date picker's max). */
export function latestAdultBirthday(today = new Date()): string {
  return new Date(Date.UTC(today.getUTCFullYear() - 18, today.getUTCMonth(), today.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

/**
 * Optional birthday from the phone's date picker ("YYYY-MM-DD"); empty means not given (null).
 * Must be a real date after 1900 and say 18 or older, like the sign-up checkbox.
 */
export const birthdaySchema = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (!value) return null;
    // A real calendar day: "2001-02-30" comes back from Date as March 2nd.
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null;
    if (!date || Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: "custom", message: "birthday.invalid" });
      return z.NEVER;
    }
    if (date.toISOString().slice(0, 10) !== value || value < "1900-01-01") {
      ctx.addIssue({ code: "custom", message: "birthday.invalid" });
      return z.NEVER;
    }
    if (value > latestAdultBirthday()) {
      ctx.addIssue({ code: "custom", message: "birthday.tooYoung" });
      return z.NEVER;
    }
    return value;
  });

/** New passwords: length only here; common/phone/email checks need the server (checkPassword). */
export const newPasswordSchema = z.string().superRefine((value, ctx) => {
  const issue = checkPasswordLength(value);
  if (issue) ctx.addIssue({ code: "custom", message: `password.${issue}` });
});

/** A ticked HTML checkbox submits "on"; an unticked one submits nothing. */
const checked = (key: string) => z.unknown().refine((value) => value === "on", { error: key });

export const signupSchema = z.object({
  phone: phoneSchema,
  firstName: nameSchema("firstName"),
  lastName: nameSchema("lastName"),
  email: emailSchema,
  birthday: birthdaySchema,
  password: newPasswordSchema,
  acceptTerms: checked("acceptTerms.required"),
  confirmAdult: checked("confirmAdult.required"),
  marketingEmail: z.literal("on").optional(),
});

export const loginSchema = z.object({
  phone: z.string().trim().min(1, "phone.required"),
  password: z.string().min(1, "password.required"),
});

export const forgotPasswordSchema = z.object({ phone: phoneSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  customerId: z.uuid(),
  password: newPasswordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "currentPassword.required"),
  newPassword: newPasswordSchema,
});

export const profileSchema = z.object({
  firstName: nameSchema("firstName"),
  lastName: nameSchema("lastName"),
  email: emailSchema,
  birthday: birthdaySchema,
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "password.required"),
});
