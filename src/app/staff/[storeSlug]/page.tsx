import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { brandFor } from "@/brands";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { AddVisitForm } from "@/components/staff/AddVisitForm";
import { IdleLogout } from "@/components/staff/IdleLogout";
import { RecentEntries } from "@/components/staff/RecentEntries";
import { RedeemCodeForm } from "@/components/staff/RedeemCodeForm";
import { AppHeader } from "@/components/ui/AppHeader";
import { Icon } from "@/components/ui/icons/Icon";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { storeUrl } from "@/lib/storeUrl";
import { getRecentEntries } from "@/server/points/recentEntries";
import { getCurrentStaff, STAFF_IDLE_MS } from "@/server/staff/session";
import { getStoreOr404 } from "@/server/stores/getStore";
import { addVisitAction, redeemCodeAction, staffLogoutAction, voidEntryAction } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("staff");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/*
 * Counter screen (§11): tablet first, portrait and landscape, fully usable on a phone.
 * Add visit on the left (the main job), redeem codes and recent entries on the right.
 */
export default async function StaffPage({ params }: PageProps<"/staff/[storeSlug]">) {
  const { storeSlug } = await params;
  const store = await getStoreOr404(storeSlug);
  const staff = await getCurrentStaff(store.id);
  if (!staff) redirect(storeUrl(store.slug, "/login", "staff"));
  const [t, tCommon, recent] = await Promise.all([
    getTranslations("staff"),
    getTranslations("common"),
    getRecentEntries(store, staff),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <IdleLogout
        timeoutMs={STAFF_IDLE_MS}
        logout={staffLogoutAction.bind(null, store.slug, "idle")}
      />

      <AppHeader
        logo={
          <BrandLogo
            brand={brandFor(store.slug)}
            kind="wordmark"
            theme="light"
            height={26}
            priority
          />
        }
        signedInAs={t("signedInAs", { name: staff.displayName })}
        actions={
          <>
            {staff.role === "manager" ? (
              <Link href={storeUrl(store.slug, "", "dashboard")} className="glass">
                <Icon name="chart" size={22} />
                {t("dashboardLink")}
              </Link>
            ) : null}
            <LogoutButton
              action={staffLogoutAction.bind(null, store.slug, undefined)}
              label={tCommon("logOut")}
              pendingLabel={tCommon("loggingOut")}
            />
          </>
        }
      />

      <main className="screen-gutter mx-auto grid w-full max-w-6xl flex-1 content-start gap-6 py-6 md:grid-cols-[3fr_2fr] md:gap-8">
        <section
          aria-labelledby="add-visit-heading"
          className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-raised p-5"
        >
          <h1
            id="add-visit-heading"
            className="flex items-center gap-2 font-display text-3xl font-bold"
          >
            <Icon name="add-visit" size={32} />
            {t("addVisitTitle")}
          </h1>
          <AddVisitForm
            action={addVisitAction.bind(null, store.slug)}
            initialKey={randomUUID()}
            pointsPerVisit={store.pointsPerVisit}
          />
        </section>

        <div className="flex flex-col gap-6">
          <section
            aria-labelledby="redeem-heading"
            className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-raised p-5"
          >
            <h2
              id="redeem-heading"
              className="flex items-center gap-2 font-display text-2xl font-bold"
            >
              <Icon name="ticket" size={28} />
              {t("redeemTitle")}
            </h2>
            <RedeemCodeForm action={redeemCodeAction.bind(null, store.slug)} />
          </section>

          <section aria-labelledby="recent-heading" className="flex flex-col gap-3">
            <h2
              id="recent-heading"
              className="font-display text-xl font-semibold tracking-wide uppercase"
            >
              {t("recentTitle")}
            </h2>
            <RecentEntries entries={recent} voidAction={voidEntryAction.bind(null, store.slug)} />
          </section>
        </div>
      </main>
    </div>
  );
}
