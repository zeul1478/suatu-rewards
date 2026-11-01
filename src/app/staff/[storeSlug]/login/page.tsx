import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { brandFor } from "@/brands";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BrandHeader, Screen } from "@/components/layout";
import { StaffLoginForm } from "@/components/staff/StaffLoginForm";
import { storeUrl } from "@/lib/storeUrl";
import { getCurrentStaff } from "@/server/staff/session";
import { getStoreOr404 } from "@/server/stores/getStore";
import { staffLoginAction } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("staffLogin");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function StaffLoginPage({
  params,
  searchParams,
}: PageProps<"/staff/[storeSlug]/login">) {
  const { storeSlug } = await params;
  const { reason } = await searchParams;
  const store = await getStoreOr404(storeSlug);
  if (await getCurrentStaff(store.id)) redirect(storeUrl(store.slug, "", "staff"));
  const t = await getTranslations("staffLogin");

  return (
    <Screen>
      <BrandHeader
        logo={
          <BrandLogo
            brand={brandFor(store.slug)}
            kind="wordmark"
            theme="light"
            height={30}
            priority
          />
        }
        title={t("title")}
        intro={t("intro")}
      />
      <StaffLoginForm
        action={staffLoginAction.bind(null, store.slug, "staff")}
        notice={reason === "idle" ? t("loggedOutIdle") : undefined}
      />
    </Screen>
  );
}
