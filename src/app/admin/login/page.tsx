import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { BrandHeader, Screen } from "@/components/layout";
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
    <Screen>
      <BrandHeader
        logo={
          <p className="font-display text-lg font-semibold tracking-wide text-ink-muted uppercase">
            behappy
          </p>
        }
        title={t("title")}
        intro={t("intro")}
      />
      <StaffLoginForm
        action={adminLoginAction}
        notice={reason === "idle" ? tStaff("loggedOutIdle") : undefined}
      />
    </Screen>
  );
}
