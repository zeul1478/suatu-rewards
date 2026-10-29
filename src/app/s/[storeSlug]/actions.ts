"use server";

import { redirect } from "next/navigation";
import { fieldErrorsFrom, formDataObject, safeValues, type FormState } from "@/lib/forms";
import { storeUrl } from "@/lib/storeUrl";
import {
  changePasswordSchema,
  deleteAccountSchema,
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validation/customer";
import { changePassword } from "@/server/customers/changePassword";
import { requireCustomer } from "@/server/customers/currentCustomer";
import { deleteAccount } from "@/server/customers/deleteAccount";
import { logInCustomer, logOutCustomer } from "@/server/customers/login";
import { requestPasswordReset, resetPassword } from "@/server/customers/passwordReset";
import { setMarketingConsent, updateProfile } from "@/server/customers/profile";
import { signUpCustomer } from "@/server/customers/signup";
import { startRedemption } from "@/server/rewards/redemptions";
import { clientIp, requestOrigin } from "@/server/request";
import { getStoreOr404 } from "@/server/stores/getStore";
import { lockedUntil, minutesLeft, recordFailure } from "@/server/throttle";

/*
 * Customer form actions. Thin: parse the form, call src/server, map the result to FormState.
 * Every action re-checks who is asking; nothing trusts the browser.
 */

const SIGNUP_ECHO = [
  "phone",
  "firstName",
  "lastName",
  "email",
  "acceptTerms",
  "confirmAdult",
  "marketingEmail",
];

export async function signupAction(
  storeSlug: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const store = await getStoreOr404(storeSlug);
  const values = safeValues(formData, SIGNUP_ECHO);
  const parsed = signupSchema.safeParse(formDataObject(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  // Sign-ups per network (§8): fake accounts and "is this number registered?" probing.
  const ip = await clientIp();
  const lock = await lockedUntil("signup_ip", ip);
  if (lock) {
    return {
      status: "error",
      formError: "signup.tooMany",
      formErrorValues: { minutes: minutesLeft(lock) },
      values,
    };
  }
  await recordFailure("signup_ip", ip);

  const result = await signUpCustomer(store, parsed.data, { origin: await requestOrigin() });
  if (!result.ok) {
    return "fieldErrors" in result
      ? { status: "error", fieldErrors: result.fieldErrors, values }
      : { status: "error", formError: result.formError, values };
  }
  redirect(storeUrl(storeSlug));
}

export async function loginAction(
  storeSlug: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await getStoreOr404(storeSlug);
  const values = safeValues(formData, ["phone"]);
  const parsed = loginSchema.safeParse(formDataObject(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  const result = await logInCustomer({ ...parsed.data, ip: await clientIp() });
  if (!result.ok) {
    return {
      status: "error",
      formError: `login.${result.error}`,
      formErrorValues: "minutes" in result ? { minutes: result.minutes } : undefined,
      values,
    };
  }
  redirect(storeUrl(storeSlug));
}

export async function logoutAction(storeSlug: string): Promise<void> {
  await logOutCustomer();
  redirect(storeUrl(storeSlug, "/login"));
}

export async function forgotPasswordAction(
  storeSlug: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const store = await getStoreOr404(storeSlug);
  const values = safeValues(formData, ["phone"]);
  const parsed = forgotPasswordSchema.safeParse(formDataObject(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  await requestPasswordReset({
    store,
    phoneE164: parsed.data.phone,
    ip: await clientIp(),
    origin: await requestOrigin(),
  });
  // Same answer whether or not the number has an account.
  return { status: "success" };
}

export async function resetPasswordAction(
  storeSlug: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const store = await getStoreOr404(storeSlug);
  const parsed = resetPasswordSchema.safeParse(formDataObject(formData));
  if (!parsed.success) {
    const fieldErrors = fieldErrorsFrom(parsed.error);
    if (fieldErrors.token || fieldErrors.customerId) {
      return { status: "error", formError: "reset.linkInvalid" };
    }
    return { status: "error", fieldErrors };
  }

  const result = await resetPassword({
    store,
    customerId: parsed.data.customerId,
    token: parsed.data.token,
    password: parsed.data.password,
  });
  if (!result.ok) {
    return result.error === "linkInvalid"
      ? { status: "error", formError: "reset.linkInvalid" }
      : { status: "error", fieldErrors: { password: `password.${result.error}` } };
  }
  redirect(`${storeUrl(storeSlug)}?passwordChanged=1`);
}

export async function changePasswordAction(
  storeSlug: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const customer = await requireCustomer(storeSlug);
  const parsed = changePasswordSchema.safeParse(formDataObject(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const result = await changePassword({ customer, ...parsed.data });
  if (result.ok) return { status: "success" };
  if (result.error === "currentWrong") {
    return { status: "error", fieldErrors: { currentPassword: "currentPassword.wrong" } };
  }
  if (result.error === "locked") {
    return {
      status: "error",
      formError: "account.locked",
      formErrorValues: { minutes: result.minutes },
    };
  }
  return { status: "error", fieldErrors: { newPassword: `newPassword.${result.error}` } };
}

/** Redeem button (§0 step 8): creates a 5-minute code, then shows it full screen. */
export async function redeemAction(storeSlug: string, rewardId: string): Promise<void> {
  const store = await getStoreOr404(storeSlug);
  const customer = await requireCustomer(store.slug);
  const result = await startRedemption({ store, customer, rewardId });
  // Not enough points (balance changed meanwhile): back home, which shows the current balance.
  redirect(storeUrl(store.slug, result.ok ? "/redeem" : ""));
}

/** Account → edit name and email (§4.4). */
export async function updateProfileAction(
  storeSlug: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const store = await getStoreOr404(storeSlug);
  const customer = await requireCustomer(store.slug);
  const values = safeValues(formData, ["firstName", "lastName", "email"]);
  const parsed = profileSchema.safeParse(formDataObject(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  const result = await updateProfile({
    store,
    customer,
    profile: parsed.data,
    origin: await requestOrigin(),
  });
  if (!result.ok) return { status: "error", fieldErrors: { email: "email.taken" }, values };
  return {
    status: "success",
    formError: result.emailChanged ? "account.savedCheckEmail" : "account.saved",
    values,
  };
}

/** Account → offer emails on/off (§4.4, §8). */
export async function marketingConsentAction(storeSlug: string, granted: boolean): Promise<void> {
  const store = await getStoreOr404(storeSlug);
  const customer = await requireCustomer(store.slug);
  await setMarketingConsent(store, customer, granted);
  redirect(storeUrl(store.slug, "/account"));
}

/** Account → delete my account, confirmed with the password (§4.4). */
export async function deleteAccountAction(
  storeSlug: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const store = await getStoreOr404(storeSlug);
  const customer = await requireCustomer(store.slug);
  const parsed = deleteAccountSchema.safeParse(formDataObject(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const result = await deleteAccount({ customer, password: parsed.data.password });
  if (!result.ok) {
    return result.error === "locked"
      ? {
          status: "error",
          formError: "account.locked",
          formErrorValues: { minutes: result.minutes },
        }
      : { status: "error", fieldErrors: { password: "currentPassword.wrong" } };
  }
  redirect(`${storeUrl(store.slug, "/signup")}?deleted=1`);
}
