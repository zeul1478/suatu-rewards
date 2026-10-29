import "server-only";
import { after } from "next/server";
import { recordAudit } from "@/server/audit";
import type { Store } from "@/server/stores/getStore";
import { supabaseAdmin } from "@/server/supabase/admin";
import type { CurrentCustomer } from "./currentCustomer";
import { sendEmailVerification } from "./emailVerification";
import { redactPii } from "@/lib/mask";

export type ProfileInput = { firstName: string; lastName: string; email: string };

export type ProfileResult =
  { ok: true; emailChanged: boolean } | { ok: false; error: "emailTaken" };

/**
 * Edit name and email (spec §4.4). A new email must be unique, is marked unconfirmed, and gets
 * a confirmation link; the login (Supabase Auth) gets the new email too, so password resets go
 * there. The phone number can't be changed here: it identifies the customer at the counter.
 */
export async function updateProfile(input: {
  store: Store;
  customer: CurrentCustomer;
  profile: ProfileInput;
  origin: string;
}): Promise<ProfileResult> {
  const { customer, profile } = input;
  const admin = supabaseAdmin();
  const emailChanged = profile.email !== customer.email;

  if (emailChanged) {
    const { data: taken } = await admin
      .from("customers")
      .select("id")
      .eq("email", profile.email)
      .neq("id", customer.id)
      .maybeSingle();
    if (taken) return { ok: false, error: "emailTaken" };

    const { error } = await admin.auth.admin.updateUserById(customer.authUserId, {
      email: profile.email,
      email_confirm: false,
    });
    if (error) {
      if (error.message.toLowerCase().includes("email")) return { ok: false, error: "emailTaken" };
      throw new Error(`Auth email update failed: ${error.message}`);
    }
  }

  const { error } = await admin
    .from("customers")
    .update({
      first_name: profile.firstName,
      last_name: profile.lastName,
      email: profile.email,
      ...(emailChanged ? { email_verified_at: null } : {}),
    })
    .eq("id", customer.id);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "emailTaken" };
    throw new Error(`Profile update failed: ${error.message}`);
  }

  await recordAudit({
    storeId: input.store.id,
    actorType: "customer",
    actorId: customer.id,
    action: "customer.profile_updated",
    details: { email_changed: emailChanged },
  });

  if (emailChanged) {
    after(async () => {
      try {
        await sendEmailVerification({
          store: input.store,
          customerId: customer.id,
          email: profile.email,
          firstName: profile.firstName,
          origin: input.origin,
        });
      } catch (error) {
        console.error("Verification email failed", {
          customerId: customer.id,
          error: redactPii(String(error)),
        });
      }
    });
  }
  return { ok: true, emailChanged };
}

export async function getMarketingConsent(
  store: Store,
  customer: CurrentCustomer,
): Promise<boolean> {
  const { data } = await supabaseAdmin()
    .from("store_customers")
    .select("marketing_email_consent")
    .eq("store_id", store.id)
    .eq("customer_id", customer.id)
    .maybeSingle();
  return data?.marketing_email_consent ?? false;
}

/** Offer emails on/off; recorded as a consent event with the screen it came from (§8). */
export async function setMarketingConsent(
  store: Store,
  customer: CurrentCustomer,
  granted: boolean,
): Promise<void> {
  const { error } = await supabaseAdmin().rpc("set_marketing_consent", {
    p_store_id: store.id,
    p_customer_id: customer.id,
    p_granted: granted,
    p_source: "account",
  });
  if (error) throw new Error(`Consent update failed: ${error.message}`);
}
