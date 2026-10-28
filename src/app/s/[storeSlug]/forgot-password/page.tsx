import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brandFor } from "@/brands";
import { AuthScreen } from "@/components/customer/AuthScreen";
import { ForgotPasswordForm } from "@/components/customer/ForgotPasswordForm";
import { storeUrl } from "@/lib/storeUrl";
import { getStoreOr404 } from "@/server/stores/getStore";
import { forgotPasswordAction } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("forgot");
  return { title: t("metaTitle") };
}

export default async function ForgotPasswordPage({
  params,
}: PageProps<"/s/[storeSlug]/forgot-password">) {
  const { storeSlug } = await params;
  const store = await getStoreOr404(storeSlug);
  const t = await getTranslations("forgot");

  return (
    <AuthScreen brand={brandFor(store.slug)} title={t("title")} intro={t("intro")}>
      <ForgotPasswordForm
        action={forgotPasswordAction.bind(null, store.slug)}
        loginHref={storeUrl(store.slug, "/login")}
        showDevNote={process.env.NODE_ENV !== "production"}
      />
    </AuthScreen>
  );
}
