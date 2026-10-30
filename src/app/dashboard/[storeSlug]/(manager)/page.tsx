import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PageTitle } from "@/components/dashboard/PageTitle";
import { StatTile } from "@/components/dashboard/StatTile";
import { Icon } from "@/components/ui/icons/Icon";
import { storeUrl } from "@/lib/storeUrl";
import { requireManager } from "@/server/dashboard/access";
import { getOverview, getUnusualActivity } from "@/server/dashboard/overview";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.overview");
  return { title: t("metaTitle") };
}

/**
 * Overview (§11): members, visits today / 7 / 30 days, returning customers, rewards redeemed, and
 * unusual activity at the counter (D78).
 */
export default async function OverviewPage({ params }: PageProps<"/dashboard/[storeSlug]">) {
  const { storeSlug } = await params;
  const { store } = await requireManager(storeSlug);
  const [overview, unusual, t] = await Promise.all([
    getOverview(store),
    getUnusualActivity(store),
    getTranslations("dashboard.overview"),
  ]);
  const anythingUnusual = unusual.numbers.length > 0 || unusual.cashiers.length > 0;

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

      <section
        aria-labelledby="unusual-heading"
        className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-raised p-5"
      >
        <h2
          id="unusual-heading"
          className="flex items-center gap-2 font-display text-xl font-semibold tracking-wide uppercase"
        >
          <Icon name={anythingUnusual ? "alert" : "check"} size={22} />
          {t("unusualTitle")}
        </h2>
        {anythingUnusual ? (
          <>
            <p className="text-ink-muted">{t("unusualIntro")}</p>
            {unusual.numbers.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {unusual.numbers.map((n) => (
                  <li key={n.customerId}>
                    <Link
                      href={storeUrl(store.slug, `/customers/${n.customerId}`, "dashboard")}
                      className="font-semibold text-accent underline underline-offset-4"
                    >
                      {n.label}
                    </Link>{" "}
                    <span className="text-ink-muted">
                      {t("unusualNumber", { most: n.mostInADay, days: n.days })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {unusual.cashiers.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {unusual.cashiers.map((c) => (
                  <li key={c.staffId}>
                    <span className="font-semibold">{c.name}</span>{" "}
                    <span className="text-ink-muted">
                      {t("unusualCashier", { visits: c.visits, topThree: c.topThree })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="text-sm text-ink-muted">
              {t.rich("unusualWhatToDo", {
                settings: (chunks) => (
                  <Link
                    href={storeUrl(store.slug, "/settings", "dashboard")}
                    className="font-semibold text-accent underline underline-offset-4"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </>
        ) : (
          <p className="text-ink-muted">{t("unusualNone")}</p>
        )}
      </section>
    </>
  );
}
