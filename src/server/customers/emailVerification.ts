import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { storeUrl } from "@/lib/storeUrl";
import { verifyEmailEmail } from "@/server/emails/templates";
import { emailSender } from "@/server/integrations/email";
import type { Store } from "@/server/stores/getStore";
import { supabaseAdmin } from "@/server/supabase/admin";

const VALID_FOR_MS = 24 * 60 * 60 * 1000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function sendEmailVerification(input: {
  store: Store;
  customerId: string;
  email: string;
  firstName: string;
  origin: string;
}): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const { error } = await supabaseAdmin()
    .from("email_verifications")
    .insert({
      customer_id: input.customerId,
      email: input.email,
      token_hash: hashToken(token),
      expires_at: new Date(Date.now() + VALID_FOR_MS).toISOString(),
    });
  if (error) throw new Error(`Email verification insert failed: ${error.message}`);

  const url = `${input.origin}${storeUrl(input.store.slug, "/verify-email")}?token=${token}`;
  await emailSender().send(
    verifyEmailEmail({
      to: input.email,
      firstName: input.firstName,
      storeName: input.store.name,
      url,
    }),
  );
}

export type VerifyEmailResult = "verified" | "invalid";

/** Marks the email verified when the token is valid, unused, unexpired and still the current email. */
export async function verifyEmail(token: string): Promise<VerifyEmailResult> {
  const admin = supabaseAdmin();
  const { data: row } = await admin
    .from("email_verifications")
    .select("id, customer_id, email, expires_at, used_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!row || row.used_at || new Date(row.expires_at) < new Date()) return "invalid";

  const { data: customer } = await admin
    .from("customers")
    .update({ email_verified_at: new Date().toISOString() })
    .eq("id", row.customer_id)
    .eq("email", row.email)
    .select("id")
    .maybeSingle();
  await admin
    .from("email_verifications")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id);
  return customer ? "verified" : "invalid";
}
