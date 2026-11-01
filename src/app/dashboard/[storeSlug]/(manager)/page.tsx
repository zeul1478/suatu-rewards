import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PageTitle } from "@/components/dashboard/PageTitle";
import { Section } from "@/components/layout";
import { StatTile } from "@/components/dashboard/StatTile";
import { VisitsChart } from "@/components/dashboard/VisitsChart";
import { Icon } from "@/components/ui/icons/Icon";
import { storeUrl } from "@/lib/storeUrl";
import { requireManager } from "@/server/dashboard/access";
import { getInsights, getOverview, getUnusualActivity } from "@/server/dashboard/overview";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.overview");
  return { title: t("metaTitle") };
}

/**
 * Overview (§11): visits today / 7 / 30 days with a 30-day chart, customers (members, coming back,
 * visits each, rewards), who hasn't been back and rewards waiting (D79), cashiers this week, and
 * unusual activity at the counter (D78).
 */
export default async function OverviewPage({ params }: PageProps<"/dashboard/[storeSlug]">) {
  const { storeSlug } = await params;
  const { store } = await requireManager(storeSlug);
  const [overview, unusual, insights, t] = await Promise.all([
    getOverview(store),
    getUnusualActivity(store),
    getInsights(store),
    getTranslations("dashboard.overview"),
  ]);
  const dayFormat = new Intl.DateTimeFormat(store.locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC", // the days are already the store's calendar days
  });
  const formatDay = (day: string) => dayFormat.format(new Date(`${day}T00:00:00Z`));
  const busiest = insights.daily.reduce(
    (best, d) => (d.visits > best.visits ? d : best),
    insights.daily[0] ?? { day: "", visits: 0 },
  );
  const comeBackRate =
    overview.visitors30Days > 0
      ? `${Math.round((overview.returning30Days / overview.visitors30Days) * 100)}%`
      : "—";
  const visitsEach =
    overview.visitors30Days > 0
      ? (overview.visits30Days / overview.visitors30Days).toLocaleString(store.locale, {
          maximumFractionDigits: 1,
        })
      : "—";
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

      <Section id="visits" title={t("visitsTitle")}>
        <dl className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
          <StatTile label={t("today")} value={overview.visitsToday} />
          <StatTile label={t("last7")} value={overview.visits7Days} />
          <StatTile label={t("last30")} value={overview.visits30Days} />
        </dl>
        <div className="panel panel-pad">
          <VisitsChart
            days={insights.daily}
            formatDay={formatDay}
            title={t("chartTitle")}
            summary={
              busiest.visits > 0
                ? t("chartSummary", {
                    total: overview.visits30Days,
                    day: formatDay(busiest.day),
                    most: busiest.visits,
                  })
                : t("chartEmpty")
            }
            tableLabel={t("chartTable")}
            dayHeader={t("chartDay")}
            visitsHeader={t("chartVisits")}
            barLabel={(visits) => t("chartBar", { visits })}
          />
        </div>
      </Section>

      <Section id="customers" title={t("customersTitle")}>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile
            label={t("members")}
            value={overview.members}
            detail={t("membersDetail", { signedUp: overview.signedUp })}
          />
          <StatTile
            label={t("comeBack")}
            value={comeBackRate}
            detail={t("comeBackDetail", {
              returning: overview.returning30Days,
              visitors: overview.visitors30Days,
            })}
          />
          <StatTile label={t("visitsEach")} value={visitsEach} detail={t("visitsEachDetail")} />
          <StatTile
            label={t("redeemed")}
            value={overview.redeemedTotal}
            detail={t("redeemedDetail", { last30: overview.redeemed30Days })}
          />
        </dl>
      </Section>

      <Section id="back" title={t("backTitle")}>
        <p className="text-ink-muted">{t("backIntro")}</p>
        <dl className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
          <StatTile label={t("lapsed30")} value={insights.lapsed30} />
          <StatTile label={t("lapsed60")} value={insights.lapsed60} />
          <StatTile label={t("lapsed90")} value={insights.lapsed90} />
        </dl>
        {insights.rewardsWaiting > 0 ? (
          <p className="flex items-start gap-2 rounded-[var(--radius-md)] bg-sunken px-4 py-3">
            <Icon name="gift" size={22} className="mt-0.5 shrink-0 text-accent" />
            <span>{t("rewardsWaiting", { count: insights.rewardsWaiting })}</span>
          </p>
        ) : null}
      </Section>

      {insights.cashiers.length > 0 ? (
        <Section id="cashiers" title={t("cashiersTitle")}>
          <ul className="panel flex flex-col divide-y divide-line">
            {insights.cashiers.map((c) => (
              <li key={c.name} className="flex items-baseline justify-between gap-3 px-4 py-3">
                <span className="font-semibold">{c.name}</span>
                <span className="price-digits text-lg">
                  {t("cashierVisits", { visits: c.visits })}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <section aria-labelledby="unusual-heading" className="panel panel-pad flex flex-col gap-3">
        <h2 id="unusual-heading" className="section-heading">
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
