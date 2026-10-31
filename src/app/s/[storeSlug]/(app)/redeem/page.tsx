import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { RedeemCode } from "@/components/customer/RedeemCode";
import { TabPage } from "@/components/layout";
import { storeUrl } from "@/lib/storeUrl";
import { requireCustomer } from "@/server/customers/currentCustomer";
import { getPendingRedemption } from "@/server/rewards/redemptions";
import { getStoreOr404 } from "@/server/stores/getStore";
import { redeemAction } from "../../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("redeem");
  return { title: t("title") };
}

// The code screen (§0 step 8). Without a live code there's nothing to show: back home.
export default async function RedeemPage({ params }: PageProps<"/s/[storeSlug]/redeem">) {
  const { storeSlug } = await params;
  const store = await getStoreOr404(storeSlug);
  const customer = await requireCustomer(store.slug);
  const redemption = await getPendingRedemption(store, customer);
  if (!redemption) redirect(storeUrl(store.slug));

  const t = await getTranslations("redeem");

  return (
    <TabPage title={t("title")}>
      <RedeemCode
        redemption={redemption}
        statusUrl={`/api${storeUrl(store.slug, "/status")}`}
        homeHref={storeUrl(store.slug)}
        newCodeAction={redeemAction.bind(null, store.slug, redemption.rewardId)}
      />
    </TabPage>
  );
}
