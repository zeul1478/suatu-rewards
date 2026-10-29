import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/dashboard/DeleteButton";
import { OfferForm } from "@/components/dashboard/OfferForm";
import { PageTitle } from "@/components/dashboard/PageTitle";
import { Icon } from "@/components/ui/icons/Icon";
import { storeUrl } from "@/lib/storeUrl";
import { requireManager } from "@/server/dashboard/access";
import { getOffer } from "@/server/offers/offers";
import { deleteOfferAction, saveOfferAction } from "../../../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.offers");
  return { title: t("editTitle") };
}

export default async function EditOfferPage({
  params,
}: PageProps<"/dashboard/[storeSlug]/offers/[offerId]">) {
  const { storeSlug, offerId } = await params;
  const { store } = await requireManager(storeSlug);
  const [offer, t] = await Promise.all([
    getOffer(store, offerId),
    getTranslations("dashboard.offers"),
  ]);
  if (!offer) notFound();
  return (
    <>
      <Link
        href={storeUrl(store.slug, "/offers", "dashboard")}
        className="-ml-2 flex min-h-[var(--target-min)] w-fit items-center gap-1 px-2 font-semibold text-accent"
      >
        <Icon name="chevron-left" size={20} />
        {t("back")}
      </Link>
      <PageTitle title={t("editTitle")} />
      <OfferForm
        action={saveOfferAction.bind(null, store.slug, offer.id)}
        offer={offer}
        locale={store.locale}
      />
      <DeleteButton
        action={deleteOfferAction.bind(null, store.slug, offer.id)}
        label={t("delete")}
        explain={t("deleteExplain")}
        confirmLabel={t("deleteConfirm")}
        pendingLabel={t("deleting")}
      />
    </>
  );
}
