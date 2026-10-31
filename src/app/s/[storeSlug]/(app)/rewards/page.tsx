import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { TabPage } from "@/components/layout";
import { Icon } from "@/components/ui/icons/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { storeUrl } from "@/lib/storeUrl";
import { requireCustomer } from "@/server/customers/currentCustomer";
import { getCustomerStatus } from "@/server/customers/status";
import { getActiveRewards } from "@/server/rewards/activeRewards";
import { getStoreOr404 } from "@/server/stores/getStore";
import { redeemAction } from "../../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rewards");
  return { title: t("title") };
}

// Every reward the store offers, what it costs, and Redeem when the balance allows (§11).
export default async function RewardsPage({ params }: PageProps<"/s/[storeSlug]/rewards">) {
  const { storeSlug } = await params;
  const store = await getStoreOr404(storeSlug);
  const customer = await requireCustomer(store.slug);
  const [rewards, status, t] = await Promise.all([
    getActiveRewards(store.id),
    getCustomerStatus(store, customer),
    getTranslations("rewards"),
  ]);
  const balance = status.progress.balance;

  return (
    <TabPage title={t("title")}>
      <p className="text-ink-muted">{t("balance", { balance })}</p>

      {rewards.length === 0 ? (
        <p className="text-ink-muted">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {rewards.map((reward) => {
            const affordable = balance >= reward.costPoints;
            const pointsShort = reward.costPoints - balance;
            return (
              <li key={reward.id} className="card panel panel-pad flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Icon
                    name="coffee"
                    size={32}
                    className={affordable ? "text-accent" : "text-ink-muted"}
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h2 className="font-display text-2xl font-bold text-ink">{reward.name}</h2>
                    <p className="price-digits text-lg text-ink-muted">
                      {t("cost", { points: reward.costPoints })}
                    </p>
                  </div>
                </div>
                {affordable ? (
                  status.pendingRedemption?.rewardId === reward.id ? (
                    <Link href={storeUrl(store.slug, "/redeem")} className="glass glass-primary">
                      {t("showCode")}
                    </Link>
                  ) : (
                    <form
                      suppressHydrationWarning
                      action={redeemAction.bind(null, store.slug, reward.id)}
                    >
                      <SubmitButton pendingLabel={t("redeeming")}>{t("redeem")}</SubmitButton>
                    </form>
                  )
                ) : (
                  <p className="text-ink">
                    {t("pointsToGo", {
                      points: pointsShort,
                      visits: Math.ceil(pointsShort / store.pointsPerVisit),
                    })}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </TabPage>
  );
}
