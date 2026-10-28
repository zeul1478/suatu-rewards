import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
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
    <main className="screen-gutter mx-auto flex w-full max-w-lg flex-col gap-6 pt-[max(var(--space-12),env(safe-area-inset-top))] pb-[max(var(--space-12),env(safe-area-inset-bottom))]">
      <header className="flex flex-col gap-4">
        <p className="font-display text-lg font-semibold tracking-[0.2em] text-brand uppercase">
          {store.name}
        </p>
        <div className="lane-stripe" aria-hidden="true" />
        <h1 className="font-display text-5xl font-bold">{t("title")}</h1>
        <p className="text-ink-muted">{t("intro")}</p>
      </header>
      <StaffLoginForm
        action={staffLoginAction.bind(null, store.slug)}
        notice={reason === "idle" ? t("loggedOutIdle") : undefined}
      />
    </main>
  );
}
