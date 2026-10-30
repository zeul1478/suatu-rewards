import { getTranslations } from "next-intl/server";
import { brandThemeStyle, type Brand } from "@/brands";
import { BrandLogo } from "@/components/brand/BrandLogo";
import type { LegalDocument } from "@/server/legal/documents";
import { LegalHtml } from "./LegalHtml";

/** Full-page legal document with the brand's logo, title and version; follows the phone's theme. */
export async function LegalPage({ document, brand }: { document: LegalDocument; brand: Brand }) {
  const t = await getTranslations("legal");
  return (
    <div data-theme="system" style={brandThemeStyle(brand)} className="min-h-dvh bg-page text-ink">
      <main className="screen-gutter mx-auto flex w-full max-w-3xl flex-col gap-4 pt-[max(var(--space-8),env(safe-area-inset-top))] pb-[max(var(--space-12),env(safe-area-inset-bottom))]">
        <header className="flex flex-col items-center gap-4 text-center">
          <BrandLogo brand={brand} kind="wordmark" theme="system" height={24} />
          <div className="lane-stripe self-stretch" aria-hidden="true" />
          <h1 className="font-display text-4xl font-bold tracking-tight">{document.title}</h1>
          <p className="text-sm text-ink-muted">{t("version", { version: document.version })}</p>
        </header>
        <LegalHtml html={document.html} />
      </main>
    </div>
  );
}
