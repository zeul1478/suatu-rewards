import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brandFor } from "@/brands";
import { AuthScreen } from "@/components/customer/AuthScreen";
import { ResetPasswordForm } from "@/components/customer/ResetPasswordForm";
import { storeUrl } from "@/lib/storeUrl";
import { getStoreOr404 } from "@/server/stores/getStore";
import { resetPasswordAction } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reset");
  return { title: t("metaTitle"), referrer: "no-referrer" };
}

// Opening the page doesn't use the link; only submitting a valid new password does.
export default async function ResetPasswordPage({
  params,
  searchParams,
}: PageProps<"/s/[storeSlug]/reset-password">) {
  const { storeSlug } = await params;
  const { token, c } = await searchParams;
  const store = await getStoreOr404(storeSlug);
  const t = await getTranslations("reset");

  return (
    <AuthScreen brand={brandFor(store.slug)} title={t("title")}>
      <ResetPasswordForm
        action={resetPasswordAction.bind(null, store.slug)}
        token={typeof token === "string" ? token : ""}
        customerId={typeof c === "string" ? c : ""}
        forgotHref={storeUrl(store.slug, "/forgot-password")}
      />
    </AuthScreen>
  );
}
