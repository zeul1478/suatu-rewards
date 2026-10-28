import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/customer/AuthScreen";
import { LoginForm } from "@/components/customer/LoginForm";
import { storeUrl } from "@/lib/storeUrl";
import { getCurrentCustomer } from "@/server/customers/currentCustomer";
import { getStoreOr404 } from "@/server/stores/getStore";
import { loginAction } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("login");
  return { title: t("metaTitle") };
}

export default async function LoginPage({ params }: PageProps<"/s/[storeSlug]/login">) {
  const { storeSlug } = await params;
  const store = await getStoreOr404(storeSlug);
  if (await getCurrentCustomer()) redirect(storeUrl(store.slug));

  const [t, tCommon] = await Promise.all([getTranslations("login"), getTranslations("common")]);

  return (
    <AuthScreen programName={tCommon("programName", { store: store.name })} title={t("title")}>
      <LoginForm
        action={loginAction.bind(null, store.slug)}
        forgotHref={storeUrl(store.slug, "/forgot-password")}
        signupHref={storeUrl(store.slug, "/signup")}
      />
    </AuthScreen>
  );
}
