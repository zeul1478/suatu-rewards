import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { brandFor } from "@/brands";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PageTitle } from "@/components/dashboard/PageTitle";
import { SettingsForm } from "@/components/dashboard/SettingsForm";
import { Icon } from "@/components/ui/icons/Icon";
import { storeUrl } from "@/lib/storeUrl";
import { requireManager } from "@/server/dashboard/access";
import { listRewards } from "@/server/dashboard/rewards";
import { saveSettingsAction } from "../../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.settings");
  return { title: t("metaTitle") };
}

/**
 * Settings (§11): points per visit, limits at the counter (D78), reward costs (edited on
 * Rewards), branding preview. The look
 * itself lives in code (src/brands/<store>.ts, DECISIONS D33), so here it's shown, not edited.
 */
export default async function SettingsPage({
  params,
}: PageProps<"/dashboard/[storeSlug]/settings">) {
  const { storeSlug } = await params;
  const { store } = await requireManager(storeSlug);
  const [rewards, t] = await Promise.all([
    listRewards(store),
    getTranslations("dashboard.settings"),
  ]);
  const brand = brandFor(store.slug);
  const swatches = [
    ["page", brand.colors.dark.page],
    ["brand", brand.colors.dark.brand],
    ["accent", brand.colors.dark.accent],
    ["text", brand.colors.dark.text],
    ["lightBrand", brand.colors.light.brand],
  ] as const;

  return (
    <>
      <PageTitle title={t("title")} />

      <section
        aria-labelledby="points-heading"
        className="flex max-w-xl flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-raised p-5"
      >
        <h2
          id="points-heading"
          className="font-display text-xl font-semibold tracking-wide uppercase"
        >
          {t("pointsTitle")}
        </h2>
        <SettingsForm
          action={saveSettingsAction.bind(null, store.slug)}
          pointsPerVisit={store.pointsPerVisit}
          maxVisitsPerDay={store.maxVisitsPerDay}
          minMinutesBetweenVisits={store.minMinutesBetweenVisits}
        />
      </section>

      <section
        aria-labelledby="costs-heading"
        className="flex max-w-xl flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-raised p-5"
      >
        <h2
          id="costs-heading"
          className="font-display text-xl font-semibold tracking-wide uppercase"
        >
          {t("costsTitle")}
        </h2>
        <ul className="flex flex-col gap-1">
          {rewards.map((reward) => (
            <li key={reward.id} className="flex justify-between gap-4">
              <span>{reward.name}</span>
              <span className="price-digits">
                {t("cost", {
                  points: reward.costPoints,
                  visits: Math.ceil(reward.costPoints / store.pointsPerVisit),
                })}
              </span>
            </li>
          ))}
        </ul>
        <Link href={storeUrl(store.slug, "/rewards", "dashboard")} className="glass w-fit">
          <Icon name="rewards" size={22} />
          {t("editRewards")}
        </Link>
      </section>

      <section
        aria-labelledby="brand-heading"
        className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-raised p-5"
      >
        <h2
          id="brand-heading"
          className="font-display text-xl font-semibold tracking-wide uppercase"
        >
          {t("brandTitle")}
        </h2>
        <p className="text-ink-muted">{t("brandIntro", { program: brand.programName })}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div
            data-theme="dark"
            className="app-backdrop flex flex-col gap-3 rounded-[var(--radius-md)] p-5 text-ink"
          >
            <BrandLogo brand={brand} kind="wordmark" theme="dark" height={28} />
            <p className="font-display text-2xl font-bold">{brand.programName}</p>
            <p className="text-sm text-ink-muted">{brand.tagline}</p>
          </div>
          <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-line bg-page p-5">
            <BrandLogo brand={brand} kind="wordmark" theme="light" height={28} />
            <p className="font-display text-2xl font-bold">{brand.programName}</p>
            <p className="text-sm text-ink-muted">{brand.tagline}</p>
          </div>
        </div>
        <ul className="flex flex-wrap gap-3">
          {swatches.map(([name, color]) => (
            <li key={name} className="flex items-center gap-2 text-sm">
              <span
                aria-hidden="true"
                className="size-8 rounded-[var(--radius-sm)] border border-line"
                style={{ background: color }}
              />
              <span>
                {t(`swatch.${name}`)} <span className="price-digits text-ink-muted">{color}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-ink-muted">{t("brandHowToChange")}</p>
      </section>
    </>
  );
}
