import { readFile } from "node:fs/promises";
import path from "node:path";
import { getTranslations } from "next-intl/server";
import { brandFor } from "@/brands";
import { storeUrl } from "@/lib/storeUrl";
import { getStoreOr404 } from "@/server/stores/getStore";

/**
 * The page the service worker shows when the phone has no connection. Fully self-contained
 * (inline styles and logo) because nothing else is available offline.
 */
export async function GET(_request: Request, { params }: RouteContext<"/s/[storeSlug]/offline">) {
  const store = await getStoreOr404((await params).storeSlug);
  const brand = brandFor(store.slug);
  const t = await getTranslations("offline");
  const read = (file: string) => readFile(path.join(process.cwd(), "public", file), "utf8");
  const [logoDark, logoLight] = await Promise.all([
    read(brand.logo.wordmark.onDark),
    read(brand.logo.wordmark.onLight),
  ]);
  const { dark, light } = brand.colors;
  const escape = (text: string) =>
    text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="${dark.page}">
<title>${escape(t("metaTitle"))} · ${escape(brand.programName)}</title>
<style>
  :root { color-scheme: dark; --page: ${dark.page}; --text: ${dark.text}; --muted: ${dark.muted}; --accent: ${dark.accent}; }
  @media (prefers-color-scheme: light) {
    :root { color-scheme: light; --page: ${light.page}; --text: ${light.text}; --muted: ${light.muted}; --accent: ${light.accent}; }
    .logo-dark { display: none; } .logo-light { display: block !important; }
  }
  body { margin: 0; min-height: 100dvh; background: var(--page); color: var(--text);
         font: 16px/1.5 system-ui, -apple-system, sans-serif; display: flex; }
  main { margin: auto; padding: 32px max(16px, env(safe-area-inset-left)); max-width: 420px; }
  .logo svg { height: 28px; width: auto; }
  .logo-light { display: none; }
  h1 { font-size: 2rem; line-height: 1.2; margin: 24px 0 8px; }
  p { color: var(--muted); margin: 0 0 24px; }
  a { display: inline-flex; align-items: center; justify-content: center; min-height: 44px;
      padding: 0 24px; border-radius: 10px; border: 1px solid var(--accent); color: var(--text);
      font-weight: 600; text-decoration: none; }
</style>
</head>
<body>
<main>
  <div class="logo"><div class="logo-dark">${logoDark}</div><div class="logo-light">${logoLight}</div></div>
  <h1>${escape(t("title"))}</h1>
  <p>${escape(t("body"))}</p>
  <a href="${storeUrl(store.slug)}">${escape(t("retry"))}</a>
</main>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
