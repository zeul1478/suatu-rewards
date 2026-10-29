import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import QRCode from "qrcode";
import { brandFor } from "@/brands";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PageTitle } from "@/components/dashboard/PageTitle";
import { PrintButton } from "@/components/dashboard/PrintButton";
import { storeUrl } from "@/lib/storeUrl";
import { requireManager } from "@/server/dashboard/access";
import { shareableOrigin } from "@/server/request";
import { getActiveRewards } from "@/server/rewards/activeRewards";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.sign");
  return { title: t("metaTitle") };
}

/**
 * Printable "Join Suatu Rewards" counter sign (§11) with a QR code to sign-up. It is also the
 * notice customers see before a cashier saves their number (DECISIONS D5).
 */
export default async function SignPage({ params }: PageProps<"/dashboard/[storeSlug]/sign">) {
  const { storeSlug } = await params;
  const { store } = await requireManager(storeSlug);
  const [t, rewards, origin] = await Promise.all([
    getTranslations("dashboard.sign"),
    getActiveRewards(store.id),
    shareableOrigin(),
  ]);
  const brand = brandFor(store.slug);
  const signupUrl = `${origin}${storeUrl(store.slug, "/signup")}`;
  const termsUrl = `${origin}${storeUrl(store.slug, "/program-terms", "legal")}`;
  const qrSvg = await QRCode.toString(signupUrl, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: brand.colors.light.text, light: "#ffffff" },
  });
  const [reward] = rewards;

  return (
    <>
      <div className="print:hidden">
        <PageTitle
          title={t("title")}
          intro={t("intro")}
          actions={<PrintButton label={t("print")} />}
        />
      </div>

      <article
        aria-label={t("signLabel")}
        className="counter-sign mx-auto flex w-full max-w-[34rem] flex-col items-center gap-6 rounded-[var(--radius-lg)] border border-line bg-white p-8 text-center text-[#07231A] print:max-w-none print:border-0 print:p-0"
      >
        <BrandLogo brand={brand} kind="lockup" theme="light" height={72} />
        <div className="lane-stripe w-full" aria-hidden="true" />
        <h2 className="font-display text-5xl leading-none font-bold tracking-tight">
          {t("headline", { program: brand.programName })}
        </h2>
        {reward ? (
          <p className="font-display text-2xl font-semibold">
            {t("offer", {
              reward: reward.name,
              visits: Math.ceil(reward.costPoints / store.pointsPerVisit),
            })}
          </p>
        ) : null}
        <div
          role="img"
          aria-label={t("qrLabel", { url: signupUrl })}
          className="w-56 max-w-full"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <ol className="flex w-full flex-col gap-2 text-left text-lg">
          <li>{t("step1")}</li>
          <li>{t("step2")}</li>
          <li>{t("step3", { points: store.pointsPerVisit })}</li>
        </ol>
        <p className="text-sm break-all text-[#3D5C4E]">{signupUrl}</p>
        <p className="text-xs text-[#3D5C4E]">
          {t("notice", { store: store.name, terms: termsUrl })}
        </p>
      </article>
    </>
  );
}
