import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PageTitle } from "@/components/dashboard/PageTitle";
import { FormAlert } from "@/components/ui/FormAlert";
import { Icon } from "@/components/ui/icons/Icon";
import { storeUrl } from "@/lib/storeUrl";
import { requireManager } from "@/server/dashboard/access";
import { listOffers, storeToday, type Offer } from "@/server/offers/offers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.offers");
  return { title: t("metaTitle") };
}

/** Offers (§11 CRUD): what customers see under their points on the home screen. */
export default async function OffersPage({
  params,
  searchParams,
}: PageProps<"/dashboard/[storeSlug]/offers">) {
  const { storeSlug } = await params;
  const { saved, deleted } = await searchParams;
  const { store } = await requireManager(storeSlug);
  const [offers, t] = await Promise.all([listOffers(store), getTranslations("dashboard.offers")]);
  const today = storeToday(store);
  const day = new Intl.DateTimeFormat(store.locale, { dateStyle: "medium", timeZone: "UTC" });
  const showDate = (date: string) => day.format(new Date(`${date}T00:00:00Z`));
  const state = (offer: Offer) => {
    if (!offer.active) return t("stateOff");
    if (offer.startsOn && offer.startsOn > today) return t("stateScheduled");
    if (offer.endsOn && offer.endsOn < today) return t("stateEnded");
    return t("stateLive");
  };

  return (
    <>
      <PageTitle
        title={t("title")}
        intro={t("intro")}
        actions={
          <Link
            href={storeUrl(store.slug, "/offers/new", "dashboard")}
            className="glass glass-primary"
          >
            <Icon name="plus" size={22} />
            {t("new")}
          </Link>
        }
      />
      {saved ? <FormAlert tone="success">{t("savedNotice")}</FormAlert> : null}
      {deleted ? <FormAlert tone="success">{t("deletedNotice")}</FormAlert> : null}

      {offers.length === 0 ? (
        <p className="text-ink-muted">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line border-y border-line">
          {offers.map((offer) => (
            <li key={offer.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
              <Link
                href={storeUrl(store.slug, `/offers/${offer.id}`, "dashboard")}
                className="flex min-h-[var(--target-min)] min-w-0 flex-1 basis-56 items-center gap-2 font-semibold text-accent underline-offset-4 hover:underline"
              >
                <Icon name="edit" size={20} className="shrink-0" />
                <span className="truncate">{offer.title}</span>
              </Link>
              <span className="text-sm text-ink-muted">
                {offer.startsOn || offer.endsOn
                  ? t("dates", {
                      from: offer.startsOn ? showDate(offer.startsOn) : t("now"),
                      to: offer.endsOn ? showDate(offer.endsOn) : t("noEnd"),
                    })
                  : t("always")}
              </span>
              <span className="rounded-[var(--radius-sm)] bg-sunken px-2 py-1 text-sm font-semibold">
                {state(offer)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
