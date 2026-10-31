import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DeleteButton } from "@/components/dashboard/DeleteButton";
import { PageTitle } from "@/components/dashboard/PageTitle";
import { RewardForm } from "@/components/dashboard/RewardForm";
import { requireManager } from "@/server/dashboard/access";
import { listRewards } from "@/server/dashboard/rewards";
import { deleteRewardAction, saveRewardAction } from "../../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.rewards");
  return { title: t("metaTitle") };
}

/** Rewards (§11 CRUD): what points buy. Customers see active ones, cheapest first. */
export default async function RewardsPage({ params }: PageProps<"/dashboard/[storeSlug]/rewards">) {
  const { storeSlug } = await params;
  const { store } = await requireManager(storeSlug);
  const [rewards, t] = await Promise.all([
    listRewards(store),
    getTranslations("dashboard.rewards"),
  ]);

  return (
    <>
      <PageTitle title={t("title")} intro={t("intro", { points: store.pointsPerVisit })} />

      {rewards.length === 0 ? <p className="text-ink-muted">{t("empty")}</p> : null}
      <ul className="flex flex-col gap-4">
        {rewards.map((reward) => (
          <li key={reward.id}>
            <section aria-label={reward.name} className="panel panel-pad flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-2xl font-bold">{reward.name}</h2>
                <p className="text-sm text-ink-muted">
                  {t("summary", {
                    cost: reward.costPoints,
                    visits: Math.ceil(reward.costPoints / store.pointsPerVisit),
                    redeemed: reward.redeemed,
                  })}
                  {reward.active ? null : ` · ${t("off")}`}
                </p>
              </div>
              <RewardForm
                action={saveRewardAction.bind(null, store.slug, reward.id)}
                reward={reward}
              />
              {reward.redeemed === 0 ? (
                <DeleteButton
                  action={deleteRewardAction.bind(null, store.slug, reward.id)}
                  label={t("delete", { name: reward.name })}
                  explain={t("deleteExplain")}
                  confirmLabel={t("deleteConfirm")}
                  pendingLabel={t("deleting")}
                />
              ) : (
                <p className="text-sm text-ink-muted">{t("cantDelete")}</p>
              )}
            </section>
          </li>
        ))}
      </ul>

      <section
        aria-labelledby="add-reward-heading"
        className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-dashed border-line-strong p-5"
      >
        <h2 id="add-reward-heading" className="section-heading">
          {t("addTitle")}
        </h2>
        <RewardForm action={saveRewardAction.bind(null, store.slug, null)} />
      </section>
    </>
  );
}
