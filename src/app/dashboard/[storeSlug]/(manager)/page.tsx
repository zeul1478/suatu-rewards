import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PageTitle } from "@/components/dashboard/PageTitle";
import { StatTile } from "@/components/dashboard/StatTile";
import { Icon } from "@/components/ui/icons/Icon";
import { storeUrl } from "@/lib/storeUrl";
import { requireManager } from "@/server/dashboard/access";
import { getOverview } from "@/server/dashboard/overview";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.overview");
  return { title: t("metaTitle") };
}

/** Overview (§11): members, visits today / 7 / 30 days, returning customers, rewards redeemed. */
export default async function OverviewPage({ params }: PageProps<"/dashboard/[storeSlug]">) {
  const { storeSlug } = await params;
  const { store } = await requireManager(storeSlug);
  const [overview, t] = await Promise.all([
    getOverview(store),
    getTranslations("dashboard.overview"),
  ]);

  return (
    <>
      <PageTitle
        title={t("title")}
        intro={t("intro", { store: store.name })}
        actions={
          <>
            <a
              href={`/api${storeUrl(store.slug, "/customers.csv", "dashboard")}`}
              className="glass"
              download
            >
              <Icon name="download" size={22} />
              {t("export")}
            </a>
            <Link href={storeUrl(store.slug, "/sign", "dashboard")} className="glass">
              <Icon name="print" size={22} />
              {t("printSign")}
            </Link>
          </>
        }
      />

      <section aria-labelledby="visits-heading" className="flex flex-col gap-3">
        <h2
          id="visits-heading"
          className="font-display text-xl font-semibold tracking-wide uppercase"
        >
          {t("visitsTitle")}
        </h2>
        <dl className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
          <StatTile label={t("today")} value={overview.visitsToday} />
          <StatTile label={t("last7")} value={overview.visits7Days} />
          <StatTile label={t("last30")} value={overview.visits30Days} />
        </dl>
      </section>

      <section aria-labelledby="customers-heading" className="flex flex-col gap-3">
        <h2
          id="customers-heading"
          className="font-display text-xl font-semibold tracking-wide uppercase"
        >
          {t("customersTitle")}
        </h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile
            label={t("members")}
            value={overview.members}
            detail={t("membersDetail", { signedUp: overview.signedUp })}
          />
          <StatTile
            label={t("returning")}
            value={overview.returning30Days}
            detail={t("returningDetail", { visitors: overview.visitors30Days })}
          />
          <StatTile
            label={t("redeemed")}
            value={overview.redeemedTotal}
            detail={t("redeemedDetail", { last30: overview.redeemed30Days })}
          />
        </dl>
      </section>
    </>
  );
}
