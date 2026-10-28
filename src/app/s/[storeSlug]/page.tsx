import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PointsCard } from "@/components/customer/PointsCard";
import { FormAlert } from "@/components/ui/FormAlert";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { storeUrl } from "@/lib/storeUrl";
import { requireCustomer } from "@/server/customers/currentCustomer";
import { getCustomerStatus } from "@/server/customers/status";
import { getStoreOr404 } from "@/server/stores/getStore";
import { logoutAction, redeemAction } from "./actions";

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
  const [status, t, tCommon, tLogin] = await Promise.all([
    getCustomerStatus(store, customer),
    getTranslations("home"),
    getTranslations("common"),
    getTranslations("login"),
  ]);

  return (
    <main className="screen-gutter mx-auto flex w-full max-w-md flex-col gap-6 pt-[max(var(--space-8),env(safe-area-inset-top))] pb-[max(var(--space-12),env(safe-area-inset-bottom))]">
      <header className="flex flex-col gap-4">
        <p className="font-display text-lg font-semibold tracking-[0.2em] text-brand uppercase">
          {tCommon("programName", { store: store.name })}
        </p>
        <div className="lane-stripe" aria-hidden="true" />
        <h1 className="font-display text-4xl font-bold text-ink">
          {t("greeting", { name: customer.firstName })}
        </h1>
      </header>

      {passwordChanged ? <FormAlert tone="success">{tLogin("passwordChanged")}</FormAlert> : null}

      <PointsCard
        initialStatus={status}
        statusUrl={`/api${storeUrl(store.slug, "/status")}`}
        redeemHref={storeUrl(store.slug, "/redeem")}
        pointsPerVisit={store.pointsPerVisit}
        redeemAction={redeemAction.bind(null, store.slug)}
      />

      <nav className="flex flex-col gap-3">
        <Link href={storeUrl(store.slug, "/account")} className="glass">
          {t("account")}
        </Link>
        <LogoutButton
          action={logoutAction.bind(null, store.slug)}
          label={tCommon("logOut")}
          pendingLabel={tCommon("loggingOut")}
        />
      </nav>
    </main>
  );
}
