import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { OfferForm } from "@/components/dashboard/OfferForm";
import { PageTitle } from "@/components/dashboard/PageTitle";
import { Icon } from "@/components/ui/icons/Icon";
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
      <Link
        href={storeUrl(store.slug, "/offers", "dashboard")}
        className="-ml-2 flex min-h-[var(--target-min)] w-fit items-center gap-1 px-2 font-semibold text-accent"
      >
        <Icon name="chevron-left" size={20} />
        {t("back")}
      </Link>
      <PageTitle title={t("newTitle")} />
      <OfferForm action={saveOfferAction.bind(null, store.slug, null)} locale={store.locale} />
    </>
  );
}
