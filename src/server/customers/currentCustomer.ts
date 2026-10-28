import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { storeUrl } from "@/lib/storeUrl";
import { supabaseForCustomer } from "@/server/supabase/session";

export type CurrentCustomer = {
  id: string;
  authUserId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneE164: string;
  emailVerified: boolean;
};

/**
 * The signed-in customer, or null. Uses getUser(), which asks Supabase Auth on every call — so a
 * session signed out elsewhere ("sign out other devices") stops working immediately.
 */
export const getCurrentCustomer = cache(async (): Promise<CurrentCustomer | null> => {
  const supabase = await supabaseForCustomer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS: this client can only read the customer's own row.
  const { data } = await supabase
    .from("customers")
    .select("id, first_name, last_name, email, phone_e164, email_verified_at")
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!data || !data.first_name || !data.last_name || !data.email || !data.phone_e164) return null;

  return {
    id: data.id,
    authUserId: user.id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    phoneE164: data.phone_e164,
    emailVerified: data.email_verified_at !== null,
  };
});

/** For customer-only pages: the customer, or a redirect to the store's login screen. */
export async function requireCustomer(storeSlug: string): Promise<CurrentCustomer> {
  const customer = await getCurrentCustomer();
  if (!customer) redirect(storeUrl(storeSlug, "/login"));
  return customer;
}
