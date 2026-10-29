import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NewStoreForm, type TimezoneGroup } from "@/components/admin/NewStoreForm";
import { PageTitle } from "@/components/dashboard/PageTitle";
import { requireAdmin } from "@/server/admin/access";
import { STORE_COUNTRIES, type StoreCountry } from "@/server/admin/stores";
import { createStoreAction } from "../../../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.newStore");
  return { title: t("metaTitle") };
}

/** Set up a store for a new client: address, time zone, points, and its first owner. */
export default async function NewStorePage() {
  await requireAdmin();
  const t = await getTranslations("admin.newStore");
  const timezoneGroups: TimezoneGroup[] = (Object.keys(STORE_COUNTRIES) as StoreCountry[]).map(
    (country) => ({
      label: t(`countries.${country}`),
      zones: STORE_COUNTRIES[country].timezones.map((zone) => ({
        value: zone,
        label: t(`timezones.${zone.replace("/", "_")}`),
      })),
    }),
  );

  return (
    <>
      <PageTitle title={t("title")} intro={t("intro")} />
      <NewStoreForm action={createStoreAction} timezoneGroups={timezoneGroups} />
    </>
  );
}
