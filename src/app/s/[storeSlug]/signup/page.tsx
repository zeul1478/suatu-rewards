import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/customer/AuthScreen";
import { SignupForm } from "@/components/customer/SignupForm";
import { storeUrl } from "@/lib/storeUrl";
import { getCurrentCustomer } from "@/server/customers/currentCustomer";
import { getLegalDocument } from "@/server/legal/documents";
import { getStoreOr404 } from "@/server/stores/getStore";
import { signupAction } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("signup");
  return { title: t("metaTitle") };
}

export default async function SignupPage({ params }: PageProps<"/s/[storeSlug]/signup">) {
  const { storeSlug } = await params;
  const store = await getStoreOr404(storeSlug);
  if (await getCurrentCustomer()) redirect(storeUrl(store.slug));

  const [t, tCommon, program, terms, privacy] = await Promise.all([
    getTranslations("signup"),
    getTranslations("common"),
    getLegalDocument("program_terms"),
    getLegalDocument("terms_of_use"),
    getLegalDocument("privacy_policy"),
  ]);

  return (
    <AuthScreen
      programName={tCommon("programName", { store: store.name })}
      title={t("title", { store: store.name })}
      intro={t("intro")}
    >
      <SignupForm
        action={signupAction.bind(null, store.slug)}
        storeName={store.name}
        loginHref={storeUrl(store.slug, "/login")}
        legal={{
          programTerms: { title: program.title, html: program.html },
          termsOfUse: { title: terms.title, html: terms.html },
          privacyPolicy: { title: privacy.title, html: privacy.html },
        }}
      />
    </AuthScreen>
  );
}
