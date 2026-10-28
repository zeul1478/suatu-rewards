import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brandFor } from "@/brands";
import { PointsCard } from "@/components/customer/PointsCard";
import { ScreenHeader } from "@/components/customer/ScreenHeader";
import { FormAlert } from "@/components/ui/FormAlert";
import { storeUrl } from "@/lib/storeUrl";
import { requireCustomer } from "@/server/customers/currentCustomer";
import { getCustomerStatus } from "@/server/customers/status";
import { getStoreOr404 } from "@/server/stores/getStore";
import { redeemAction } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return { title: t("metaTitle") };
}

// Customer home (§11): greeting, live points card, Redeem when a reward is unlocked.
export default async function CustomerHomePage({
  params,
  searchParams,
}: PageProps<"/s/[storeSlug]">) {
  const { storeSlug } = await params;
  const { passwordChanged } = await searchParams;
  const store = await getStoreOr404(storeSlug);
  const customer = await requireCustomer(store.slug);
  const [status, t, tLogin] = await Promise.all([
    getCustomerStatus(store, customer),
    getTranslations("home"),
    getTranslations("login"),
  ]);

  return (
    <main className="screen-gutter mx-auto flex w-full max-w-md flex-col gap-6 pt-[max(var(--space-8),env(safe-area-inset-top))] pb-[var(--space-8)]">
      <ScreenHeader
        brand={brandFor(store.slug)}
        title={t("greeting", { name: customer.firstName })}
      />

      {passwordChanged ? <FormAlert tone="success">{tLogin("passwordChanged")}</FormAlert> : null}

      <PointsCard
        initialStatus={status}
        statusUrl={`/api${storeUrl(store.slug, "/status")}`}
        redeemHref={storeUrl(store.slug, "/redeem")}
        pointsPerVisit={store.pointsPerVisit}
        redeemAction={redeemAction.bind(null, store.slug)}
      />
    </main>
  );
}
