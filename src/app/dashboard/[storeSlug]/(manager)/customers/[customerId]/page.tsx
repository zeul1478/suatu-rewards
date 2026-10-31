import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { AdjustPointsForm } from "@/components/dashboard/AdjustPointsForm";
import { PageTitle } from "@/components/dashboard/PageTitle";
import { ReleaseNumberForm } from "@/components/dashboard/ReleaseNumberForm";
import { BackLink } from "@/components/ui/BackLink";
import { storeUrl } from "@/lib/storeUrl";
import { requireManager } from "@/server/dashboard/access";
import { getCustomerDetail, type LedgerEntry } from "@/server/dashboard/customers";
import { adjustPointsAction, releaseNumberAction } from "../../../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.customer");
  return { title: t("metaTitle") };
}

/** One customer (§11): masked details, balance, history, adjust with a note, release number. */
export default async function CustomerPage({
  params,
}: PageProps<"/dashboard/[storeSlug]/customers/[customerId]">) {
  const { storeSlug, customerId } = await params;
  const { store } = await requireManager(storeSlug);
  const [customer, t] = await Promise.all([
    getCustomerDetail(store, customerId),
    getTranslations("dashboard.customer"),
  ]);
  if (!customer) notFound();

  const entryLabel = (entry: LedgerEntry) => t(`entry.${entry.type}`, { note: entry.note ?? "" });

  return (
    <>
      <BackLink href={storeUrl(store.slug, "/customers", "dashboard")}>{t("back")}</BackLink>
      <PageTitle
        title={customer.name ?? t("notSignedUp")}
        intro={customer.status === "unclaimed" ? t("unclaimedIntro") : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section aria-labelledby="details-heading" className="panel panel-pad flex flex-col gap-4">
          <h2 id="details-heading" className="section-heading">
            {t("detailsTitle")}
          </h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
            <dt className="text-ink-muted">{t("points")}</dt>
            <dd className="price-digits text-2xl" data-testid="customer-points">
              {customer.points}
            </dd>
            <dt className="text-ink-muted">{t("visits")}</dt>
            <dd className="price-digits">{customer.visits}</dd>
            <dt className="text-ink-muted">{t("phone")}</dt>
            <dd className="price-digits">{customer.phone}</dd>
            {customer.status === "active" ? (
              <>
                <dt className="text-ink-muted">{t("email")}</dt>
                <dd className="break-all">
                  {customer.email}{" "}
                  <span className="text-sm text-ink-muted">
                    {customer.emailConfirmed ? t("emailConfirmed") : t("emailNotConfirmed")}
                  </span>
                </dd>
                <dt className="text-ink-muted">{t("offerEmails")}</dt>
                <dd>{customer.offerEmails ? t("yes") : t("no")}</dd>
              </>
            ) : null}
            <dt className="text-ink-muted">{t("joined")}</dt>
            <dd>{customer.joined}</dd>
            <dt className="text-ink-muted">{t("lastVisit")}</dt>
            <dd>{customer.lastVisit ?? "—"}</dd>
          </dl>
          <p className="text-sm text-ink-muted">{t("maskedNote")}</p>
        </section>

        <section aria-labelledby="adjust-heading" className="panel panel-pad flex flex-col gap-4">
          <h2 id="adjust-heading" className="section-heading">
            {t("adjustTitle")}
          </h2>
          <AdjustPointsForm
            action={adjustPointsAction.bind(null, store.slug, customer.id)}
            initialKey={randomUUID()}
          />
        </section>
      </div>

      <section aria-labelledby="history-heading" className="flex flex-col gap-3">
        <h2 id="history-heading" className="section-heading">
          {t("historyTitle")}
        </h2>
        {customer.history.length === 0 ? (
          <p className="text-ink-muted">{t("historyEmpty")}</p>
        ) : (
          <ul className="list-divided">
            {customer.history.map((entry) => (
              <li
                key={entry.id}
                className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 py-2"
              >
                <span className="min-w-0 flex-1 basis-48">
                  {entryLabel(entry)}
                  {entry.staff ? (
                    <span className="block text-sm text-ink-muted">
                      {t("by", { name: entry.staff })}
                    </span>
                  ) : null}
                </span>
                <span className="text-sm whitespace-nowrap text-ink-muted">{entry.when}</span>
                <span
                  className={`price-digits w-16 text-right text-lg ${entry.points > 0 ? "text-accent" : "text-ink"}`}
                >
                  {entry.points > 0 ? `+${entry.points}` : `−${Math.abs(entry.points)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ReleaseNumberForm
        action={releaseNumberAction.bind(null, store.slug, customer.id)}
        phone={customer.phone}
      />
    </>
  );
}
