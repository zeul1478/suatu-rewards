import { getTranslations } from "next-intl/server";
import type { LegalDocument } from "@/server/legal/documents";
import { LegalHtml } from "./LegalHtml";

/** Full-page legal document with title and version. */
export async function LegalPage({ document }: { document: LegalDocument }) {
  const t = await getTranslations("legal");
  return (
    <main
      data-theme="dark"
      className="screen-gutter mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 bg-page pt-[max(var(--space-8),env(safe-area-inset-top))] pb-[max(var(--space-12),env(safe-area-inset-bottom))] text-ink"
    >
      <h1 className="font-display text-4xl font-bold">{document.title}</h1>
      <p className="text-sm text-ink-muted">{t("version", { version: document.version })}</p>
      <div className="lane-stripe" aria-hidden="true" />
      <LegalHtml html={document.html} />
    </main>
  );
}
