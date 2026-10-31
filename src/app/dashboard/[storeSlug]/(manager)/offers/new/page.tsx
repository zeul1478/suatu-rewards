import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OfferForm } from "@/components/dashboard/OfferForm";
import { PageTitle } from "@/components/dashboard/PageTitle";
import { BackLink } from "@/components/ui/BackLink";
import { storeUrl } from "@/lib/storeUrl";
import { requireManager } from "@/server/dashboard/access";
import { saveOfferAction } from "../../../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.offers");
  return { title: t("newTitle") };
}

export default async function NewOfferPage({
  params,
}: PageProps<"/dashboard/[storeSlug]/offers/new">) {
  const { storeSlug } = await params;
  const { store } = await requireManager(storeSlug);
  const t = await getTranslations("dashboard.offers");
  return (
    <>
      <BackLink href={storeUrl(store.slug, "/offers", "dashboard")}>{t("back")}</BackLink>
      <PageTitle title={t("newTitle")} />
      <OfferForm action={saveOfferAction.bind(null, store.slug, null)} locale={store.locale} />
    </>
  );
}
