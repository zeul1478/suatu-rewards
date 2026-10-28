import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { brandFor } from "@/brands";
import { AuthScreen } from "@/components/customer/AuthScreen";
import { FormAlert } from "@/components/ui/FormAlert";
import { storeUrl } from "@/lib/storeUrl";
import { verifyEmail } from "@/server/customers/emailVerification";
import { getStoreOr404 } from "@/server/stores/getStore";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("verifyEmail");
  return { title: t("metaTitle"), referrer: "no-referrer" };
}

export default async function VerifyEmailPage({
  params,
  searchParams,
}: PageProps<"/s/[storeSlug]/verify-email">) {
  const { storeSlug } = await params;
  const { token } = await searchParams;
  const store = await getStoreOr404(storeSlug);
  const result = typeof token === "string" && token ? await verifyEmail(token) : "invalid";
  const t = await getTranslations("verifyEmail");

  return (
    <AuthScreen brand={brandFor(store.slug)} title={t("metaTitle")}>
      <FormAlert tone={result === "verified" ? "success" : "error"}>{t(result)}</FormAlert>
      <Link href={storeUrl(store.slug)} className="glass glass-primary">
        {t("continue")}
      </Link>
    </AuthScreen>
  );
}
