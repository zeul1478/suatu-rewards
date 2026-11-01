import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brandFor } from "@/brands";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { OfferCard } from "@/components/customer/OfferCard";
import { PlaceCard } from "@/components/customer/PlaceCard";
import { PointsCard } from "@/components/customer/PointsCard";
import { Section, TabPage } from "@/components/layout";
import { FormAlert } from "@/components/ui/FormAlert";
import { storeUrl } from "@/lib/storeUrl";
import { requireCustomer } from "@/server/customers/currentCustomer";
import { getCustomerStatus } from "@/server/customers/status";
import { getCurrentOffers } from "@/server/offers/offers";
import { getStoreOr404 } from "@/server/stores/getStore";
import { redeemAction } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return { title: t("metaTitle") };
}

// Customer home (§11): greeting, live points card, Redeem when a reward is unlocked, offers, and
// the brand's "Visit us" cards (station, restaurant) when its brand file has them.
export default async function CustomerHomePage({
  params,
  searchParams,
}: PageProps<"/s/[storeSlug]">) {
  const { storeSlug } = await params;
  const { passwordChanged } = await searchParams;
  const store = await getStoreOr404(storeSlug);
  const customer = await requireCustomer(store.slug);
  const brand = brandFor(store.slug);
  const [status, offers, t, tLogin] = await Promise.all([
    getCustomerStatus(store, customer),
    getCurrentOffers(store),
    getTranslations("home"),
    getTranslations("login"),
  ]);

  // Offer dates are calendar days; formatted here so phones don't reformat them (D39).
  const untilDate = new Intl.DateTimeFormat(store.locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <TabPage title={t("greeting", { name: customer.firstName })}>
      {passwordChanged ? <FormAlert tone="success">{tLogin("passwordChanged")}</FormAlert> : null}

      <PointsCard
        initialStatus={status}
        statusUrl={`/api${storeUrl(store.slug, "/status")}`}
        redeemHref={storeUrl(store.slug, "/redeem")}
        pointsPerVisit={store.pointsPerVisit}
        redeemAction={redeemAction.bind(null, store.slug)}
        mascot={<BrandLogo brand={brand} kind="mark" theme="system" height={56} />}
      />

      {offers.length > 0 ? (
        <Section id="offers" title={t("offersTitle")}>
          {offers.map((offer) => (
            <OfferCard
              key={offer.id}
              title={offer.title}
              body={offer.body}
              imageUrl={offer.imageUrl}
              until={
                offer.endsOn
                  ? t("offerUntil", {
                      date: untilDate.format(new Date(`${offer.endsOn}T00:00:00Z`)),
                    })
                  : null
              }
            />
          ))}
        </Section>
      ) : null}

      {brand.places ? (
        <Section id="visit" title={t("visitTitle")}>
          {(
            [
              ["station", brand.places.station, "fuel"],
              ["restaurant", brand.places.restaurant, "coffee"],
            ] as const
          ).map(([kind, place, icon]) =>
            place ? (
              <PlaceCard
                key={kind}
                place={place}
                title={t(kind === "station" ? "stationTitle" : "restaurantTitle")}
                icon={icon}
                labels={{
                  openDaily: t("openDaily", { hours: place.hours }),
                  tryHere: place.highlights?.length
                    ? t("tryHere", { items: place.highlights.join(" · ") })
                    : null,
                  directions: t("directions"),
                  waze: t("waze"),
                  call: t("call"),
                  whatsapp: t("whatsapp"),
                }}
              />
            ) : null,
          )}
        </Section>
      ) : null}
    </TabPage>
  );
}
