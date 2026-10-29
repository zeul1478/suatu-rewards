import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { brandFor } from "@/brands";
import { BrandLogo } from "@/components/brand/BrandLogo";
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
    <main className="screen-gutter mx-auto flex w-full max-w-lg flex-col gap-6 pt-[max(var(--space-12),env(safe-area-inset-top))] pb-[var(--space-8)]">
      <header className="flex flex-col gap-4">
        <BrandLogo
          brand={brandFor(store.slug)}
          kind="wordmark"
          theme="light"
          height={30}
          priority
        />
        <div className="lane-stripe" aria-hidden="true" />
        <h1 className="font-display text-5xl font-bold">{t("title")}</h1>
        <p className="text-ink-muted">{t("intro")}</p>
      </header>
      <StaffLoginForm
        action={staffLoginAction.bind(null, store.slug, "dashboard")}
        notice={notice}
      />
    </main>
  );
}
