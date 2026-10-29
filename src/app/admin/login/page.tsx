import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { StaffLoginForm } from "@/components/staff/StaffLoginForm";
import { getCurrentAdmin } from "@/server/admin/session";
import { adminLoginAction } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminLogin");
  return { title: t("metaTitle") };
}

/** behappy's own accounts, not a store's staff (DECISIONS D64). Same form as the counter. */
export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await getCurrentAdmin()) redirect("/admin");
  const { reason } = await searchParams;
  const [t, tStaff] = await Promise.all([
    getTranslations("adminLogin"),
    getTranslations("staffLogin"),
  ]);

  return (
    <main className="screen-gutter mx-auto flex w-full max-w-lg flex-col gap-6 pt-[max(var(--space-12),env(safe-area-inset-top))] pb-[var(--space-8)]">
      <header className="flex flex-col items-center gap-4 text-center">
        <p className="font-display text-lg font-semibold tracking-wide text-ink-muted uppercase">
          behappy
        </p>
        <div className="lane-stripe self-stretch" aria-hidden="true" />
        <h1 className="font-display text-5xl font-bold">{t("title")}</h1>
        <p className="text-ink-muted">{t("intro")}</p>
      </header>
      <StaffLoginForm
        action={adminLoginAction}
        notice={reason === "idle" ? tStaff("loggedOutIdle") : undefined}
      />
    </main>
  );
}
