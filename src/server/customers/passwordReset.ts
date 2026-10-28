import "server-only";
import { toAuthSecret } from "@/lib/password/authSecret";
import { checkPassword, type PasswordIssue } from "@/lib/password/rules";
import { storeUrl } from "@/lib/storeUrl";
import { recordAudit } from "@/server/audit";
import { passwordResetEmail } from "@/server/emails/templates";
import { emailSender } from "@/server/integrations/email";
import type { Store } from "@/server/stores/getStore";
import { supabaseAdmin, supabaseDetached } from "@/server/supabase/admin";
import { supabaseForCustomer } from "@/server/supabase/session";
import { clearFailures, lockedUntil, recordFailure } from "@/server/throttle";

/**
 * "Forgot password?" asks for the phone only (DECISIONS D3); the link goes to the email on file.
 * The answer is always the same, so the form never reveals whether a number has an account.
 * Links are Supabase recovery tokens: single use, valid 60 minutes (auth.email.otp_expiry).
 */
export async function requestPasswordReset(input: {
  store: Store;
  phoneE164: string;
  ip: string;
  origin: string;
}): Promise<void> {
  // Each request counts against the IP so the form can't be used to spam inboxes.
  if (await lockedUntil("ip", input.ip)) return;
  await recordFailure("ip", input.ip);

  const admin = supabaseAdmin();
  const { data: customer } = await admin
    .from("customers")
    .select("id, email, first_name")
    .eq("phone_e164", input.phoneE164)
    .eq("status", "active")
    .maybeSingle();
  if (!customer?.email || !customer.first_name) return;

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: customer.email,
  });
  if (error || !data.properties?.hashed_token) {
    throw new Error(`Recovery link failed: ${error?.message ?? "no token"}`);
  }

  const params = new URLSearchParams({ token: data.properties.hashed_token, c: customer.id });
  const url = `${input.origin}${storeUrl(input.store.slug, "/reset-password")}?${params}`;
  await emailSender().send(
    passwordResetEmail({
      to: customer.email,
      firstName: customer.first_name,
      storeName: input.store.name,
      url,
    }),
  );
  await recordAudit({
    storeId: input.store.id,
    actorType: "customer",
    actorId: customer.id,
    action: "customer.password_reset_requested",
  });
}

export type ResetResult =
  { ok: true } | { ok: false; error: "linkInvalid" } | { ok: false; error: PasswordIssue };

/**
 * Sets a new password from a reset link, signs out every other session, and signs in here.
 * Password rules are checked before the token is used, so a rejected password doesn't burn the link.
 */
export async function resetPassword(input: {
  store: Store;
  customerId: string;
  token: string;
  password: string;
}): Promise<ResetResult> {
  const admin = supabaseAdmin();
  const { data: customer } = await admin
    .from("customers")
    .select("id, auth_user_id, phone_e164, email")
    .eq("id", input.customerId)
    .eq("status", "active")
    .maybeSingle();
  if (!customer?.auth_user_id || !customer.phone_e164) return { ok: false, error: "linkInvalid" };

  const issue = checkPassword(input.password, {
    phoneE164: customer.phone_e164,
    email: customer.email,
  });
  if (issue) return { ok: false, error: issue };

  const detached = supabaseDetached();
  const { data: verified, error: verifyError } = await detached.auth.verifyOtp({
    token_hash: input.token,
    type: "recovery",
  });
  if (verifyError || verified.user?.id !== customer.auth_user_id) {
    return { ok: false, error: "linkInvalid" };
  }

  const secret = toAuthSecret(input.password);
  const { error: updateError } = await detached.auth.updateUser({ password: secret });
  if (updateError) throw new Error(`Password update failed: ${updateError.message}`);
  await detached.auth.signOut({ scope: "global" });

  // Clicking the emailed link proves the address is theirs.
  await admin
    .from("customers")
    .update({ email_verified_at: new Date().toISOString() })
    .eq("id", customer.id)
    .is("email_verified_at", null);
  await clearFailures("customer_phone", customer.phone_e164);
  await recordAudit({
    storeId: input.store.id,
    actorType: "customer",
    actorId: customer.id,
    action: "customer.password_reset",
  });

  const supabase = await supabaseForCustomer();
  await supabase.auth.signInWithPassword({ phone: customer.phone_e164, password: secret });
  return { ok: true };
}
