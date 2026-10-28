import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
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
  const [t, tCommon] = await Promise.all([getTranslations("forgot"), getTranslations("common")]);

  return (
    <AuthScreen
      programName={tCommon("programName", { store: store.name })}
      title={t("title")}
      intro={t("intro")}
    >
      <ForgotPasswordForm
        action={forgotPasswordAction.bind(null, store.slug)}
        loginHref={storeUrl(store.slug, "/login")}
        showDevNote={process.env.NODE_ENV !== "production"}
      />
    </AuthScreen>
  );
}
