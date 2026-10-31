import { getTranslations } from "next-intl/server";
import { brandThemeStyle, type Brand } from "@/brands";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BrandHeader, Screen } from "@/components/layout";
import type { LegalDocument } from "@/server/legal/documents";
import { LegalHtml } from "./LegalHtml";

/** Full-page legal document with the brand's logo, title and version; follows the phone's theme. */
export async function LegalPage({ document, brand }: { document: LegalDocument; brand: Brand }) {
  const t = await getTranslations("legal");
  return (
    <div data-theme="system" style={brandThemeStyle(brand)} className="min-h-dvh bg-page text-ink">
      <Screen width="reading" gap="normal">
        <BrandHeader
          logo={<BrandLogo brand={brand} kind="wordmark" theme="system" height={24} />}
          title={document.title}
          intro={<p className="text-sm">{t("version", { version: document.version })}</p>}
        />
        <LegalHtml html={document.html} />
      </Screen>
    </div>
  );
}
