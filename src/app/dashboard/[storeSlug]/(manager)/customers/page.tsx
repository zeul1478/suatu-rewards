import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PageTitle } from "@/components/dashboard/PageTitle";
import { FormAlert } from "@/components/ui/FormAlert";
import { Icon } from "@/components/ui/icons/Icon";
import { storeUrl } from "@/lib/storeUrl";
import { requireManager } from "@/server/dashboard/access";
import { CUSTOMERS_PAGE_SIZE, listCustomers } from "@/server/dashboard/customers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.customers");
  return { title: t("metaTitle") };
}

/** Customers (§11): masked phones, search by phone digits or name, newest visit first. */
export default async function CustomersPage({
  params,
  searchParams,
}: PageProps<"/dashboard/[storeSlug]/customers">) {
  const { storeSlug } = await params;
  const { q, page, released } = await searchParams;
  const { store } = await requireManager(storeSlug);
  const query = typeof q === "string" ? q.slice(0, 60) : "";
  const pageNumber = Math.max(1, Number(page) || 1);
  const [{ rows, total }, t] = await Promise.all([
    listCustomers(store, { query, page: pageNumber }),
    getTranslations("dashboard.customers"),
  ]);
  const base = storeUrl(store.slug, "/customers", "dashboard");
  const pageHref = (n: number) =>
    `${base}?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(n) })}`;
  const shownTo = Math.min(total, pageNumber * CUSTOMERS_PAGE_SIZE);

  return (
    <>
      <PageTitle
        title={t("title")}
        intro={t("intro")}
        actions={
          <a
            href={`/api${storeUrl(store.slug, "/customers.csv", "dashboard")}`}
            className="glass"
            download
          >
            <Icon name="download" size={22} />
            {t("export")}
          </a>
        }
      />

      {released ? <FormAlert tone="success">{t("released")}</FormAlert> : null}

      <form role="search" action={base} className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1.5">
          <label htmlFor="customer-search" className="font-semibold">
            {t("search")}
          </label>
          <input
            suppressHydrationWarning
            id="customer-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder={t("searchPlaceholder")}
            className="field-input"
          />
        </div>
        <button type="submit" className="glass">
          <Icon name="search" size={22} />
          {t("searchButton")}
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="text-ink-muted">{query ? t("noMatches", { query }) : t("empty")}</p>
      ) : (
        <>
          <p className="text-sm text-ink-muted" aria-live="polite">
            {t("showing", { from: (pageNumber - 1) * CUSTOMERS_PAGE_SIZE + 1, to: shownTo, total })}
          </p>
          <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-raised">
            <table className="w-full min-w-[36rem] text-left">
              <thead className="border-b border-line text-sm text-ink-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t("colCustomer")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t("colPhone")}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    {t("colPoints")}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    {t("colVisits")}
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    {t("colLastVisit")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-2">
                      <Link
                        href={storeUrl(store.slug, `/customers/${row.id}`, "dashboard")}
                        className="flex min-h-[var(--target-min)] items-center font-semibold text-accent underline-offset-4 hover:underline"
                      >
                        {row.name ?? t("notSignedUp")}
                      </Link>
                    </td>
                    <td className="price-digits px-4 py-2 whitespace-nowrap">{row.phone}</td>
                    <td className="price-digits px-4 py-2 text-right">{row.points}</td>
                    <td className="price-digits px-4 py-2 text-right">{row.visits}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-ink-muted">
                      {row.lastVisit ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            {pageNumber > 1 ? (
              <Link href={pageHref(pageNumber - 1)} className="glass">
                <Icon name="chevron-left" size={20} />
                {t("previous")}
              </Link>
            ) : null}
            {shownTo < total ? (
              <Link href={pageHref(pageNumber + 1)} className="glass">
                {t("next")}
                <Icon name="chevron-right" size={20} />
              </Link>
            ) : null}
          </div>
        </>
      )}
    </>
  );
}
