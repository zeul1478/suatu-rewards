import "server-only";
import { after } from "next/server";
import type { z } from "zod";
import { toAuthSecret } from "@/lib/password/authSecret";
import { checkPassword } from "@/lib/password/rules";
import { maskPhone } from "@/lib/phone";
import type { signupSchema } from "@/lib/validation/customer";
import { legalVersions } from "@/server/legal/documents";
import type { Store } from "@/server/stores/getStore";
import { supabaseAdmin } from "@/server/supabase/admin";
import { supabaseForCustomer } from "@/server/supabase/session";
import { sendEmailVerification } from "./emailVerification";
import { redactPii } from "@/lib/mask";

export type SignupInput = z.output<typeof signupSchema>;

export type SignupResult =
  | { ok: true }
  | { ok: false; fieldErrors: Record<string, string> }
  | { ok: false; formError: string };

/**
 * Creates a customer account (§4.1): Supabase Auth user (phone pre-confirmed — no SMS), then the
 * customer row, store membership and consent records in one database transaction. A phone number
 * that staff already entered (status 'unclaimed') is claimed with its points instead of rejected.
 * Then signs the customer in on this device and, after responding, emails a verification link.
 */
export async function signUpCustomer(
  store: Store,
  input: SignupInput,
  context: { origin: string },
): Promise<SignupResult> {
  const passwordIssue = checkPassword(input.password, {
    phoneE164: input.phone,
    email: input.email,
  });
  if (passwordIssue) return { ok: false, fieldErrors: { password: `password.${passwordIssue}` } };

  const admin = supabaseAdmin();

  const [{ data: byPhone }, { data: byEmail }] = await Promise.all([
    admin.from("customers").select("status").eq("phone_e164", input.phone).maybeSingle(),
    admin.from("customers").select("phone_e164").eq("email", input.email).maybeSingle(),
  ]);
  const taken: Record<string, string> = {};
  if (byPhone && byPhone.status !== "unclaimed") taken.phone = "phone.taken";
  if (byEmail && byEmail.phone_e164 !== input.phone) taken.email = "email.taken";
  if (Object.keys(taken).length > 0) return { ok: false, fieldErrors: taken };

  const secret = toAuthSecret(input.password);
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    phone: input.phone,
    password: secret,
    phone_confirm: true,
    email: input.email,
    email_confirm: false,
  });
  if (createError || !created.user) {
    const message = createError?.message.toLowerCase() ?? "";
    if (message.includes("phone")) return { ok: false, fieldErrors: { phone: "phone.taken" } };
    if (message.includes("email")) return { ok: false, fieldErrors: { email: "email.taken" } };
    throw new Error(`Auth user creation failed: ${createError?.message}`);
  }

  const versions = await legalVersions();
  const { data: customerId, error: registerError } = await admin.rpc("register_customer", {
    p_auth_user_id: created.user.id,
    p_store_id: store.id,
    p_phone_e164: input.phone,
    p_email: input.email,
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_program_terms_version: versions.program_terms,
    p_privacy_version: versions.privacy_policy,
    p_terms_of_use_version: versions.terms_of_use,
    p_marketing_email: input.marketingEmail === "on",
    p_source: "signup",
  });
  if (registerError || !customerId) {
    // Undo the Auth user so the phone and email can be used again.
    await admin.auth.admin.deleteUser(created.user.id);
    if (registerError?.message === "phone_taken") {
      return { ok: false, fieldErrors: { phone: "phone.taken" } };
    }
    if (registerError?.message === "email_taken") {
      return { ok: false, fieldErrors: { email: "email.taken" } };
    }
    throw new Error(`Customer registration failed for ${maskPhone(input.phone)}`);
  }

  const supabase = await supabaseForCustomer();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    phone: input.phone,
    password: secret,
  });
  if (signInError) return { ok: false, formError: "signup.createdButNotSignedIn" };

  // Sent after the response, so the customer reaches their home without waiting on email.
  after(async () => {
    try {
      await sendEmailVerification({
        store,
        customerId,
        email: input.email,
        firstName: input.firstName,
        origin: context.origin,
      });
    } catch (error) {
      // The account works without it; the customer can ask for a new link later.
      console.error("Verification email failed", { customerId, error: redactPii(String(error)) });
    }
  });

  return { ok: true };
}
