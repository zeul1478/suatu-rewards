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
import { staffLoginAction } from "@/app/staff/[storeSlug]/actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboardLogin");
  return { title: t("metaTitle") };
}

/** Same accounts as the staff screen (§6); only managers get in. */
export default async function DashboardLoginPage({
  params,
  searchParams,
}: PageProps<"/dashboard/[storeSlug]/login">) {
  const { storeSlug } = await params;
  const { reason } = await searchParams;
  const store = await getStoreOr404(storeSlug);
  const staff = await getCurrentStaff(store.id);
  if (staff?.role === "manager") redirect(storeUrl(store.slug, "", "dashboard"));
  const [t, tStaff] = await Promise.all([
    getTranslations("dashboardLogin"),
    getTranslations("staffLogin"),
  ]);
  const notice =
    reason === "idle"
      ? tStaff("loggedOutIdle")
      : reason === "managersOnly"
        ? tStaff("managersOnly")
        : undefined;

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
        action={staffLoginAction.bind(null, store.slug, "dashboard")}
        notice={notice}
      />
    </Screen>
  );
}
