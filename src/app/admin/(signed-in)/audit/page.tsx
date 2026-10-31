import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PageTitle } from "@/components/dashboard/PageTitle";
import { Icon } from "@/components/ui/icons/Icon";
import { requireAdmin } from "@/server/admin/access";
import { listAudit } from "@/server/admin/auditLog";
import { listStores } from "@/server/admin/stores";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.audit");
  return { title: t("metaTitle") };
}

/** What the audit log can be narrowed to: the first part of the action name. */
const AREAS = ["customer", "points", "reward", "offer", "staff", "store", "admin"] as const;

/** Audit log (§11): every store's entries, newest first, filtered by store and area. */
export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireAdmin();
  const { store, area, page } = await searchParams;
  const storeId = typeof store === "string" ? store : "";
  const action = AREAS.find((value) => value === area) ?? "";
  const pageNumber = Math.max(1, Number(page) || 1);
  const [{ rows, hasMore }, stores, t] = await Promise.all([
    listAudit({ storeId: storeId || undefined, action: action || undefined, page: pageNumber - 1 }),
    listStores(),
    getTranslations("admin.audit"),
  ]);
  const pageHref = (n: number) =>
    `/admin/audit?${new URLSearchParams({
      ...(storeId ? { store: storeId } : {}),
      ...(action ? { area: action } : {}),
      page: String(n),
    })}`;

  return (
    <>
      <PageTitle title={t("title")} intro={t("intro")} />

      <form action="/admin/audit" className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1.5">
          <label htmlFor="audit-store" className="font-semibold">
            {t("store")}
          </label>
          <select
            suppressHydrationWarning
            id="audit-store"
            name="store"
            defaultValue={storeId}
            className="field-input"
          >
            <option value="">{t("allStores")}</option>
            {stores.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} (/{option.slug})
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1.5">
          <label htmlFor="audit-area" className="font-semibold">
            {t("area")}
          </label>
          <select
            suppressHydrationWarning
            id="audit-area"
            name="area"
            defaultValue={action}
            className="field-input"
          >
            <option value="">{t("allAreas")}</option>
            {AREAS.map((value) => (
              <option key={value} value={value}>
                {t(`areas.${value}`)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="glass">
          <Icon name="search" size={22} />
          {t("filter")}
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="text-ink-muted">{t("empty")}</p>
      ) : (
        // Scrolls sideways on narrow screens; focusable so keyboard users can scroll it too.
        <div
          tabIndex={0}
          role="region"
          aria-label={t("tableLabel")}
          className="panel overflow-x-auto"
        >
          <table className="data-table min-w-[48rem] text-sm">
            <thead>
              <tr>
                <th scope="col">{t("colTime")}</th>
                <th scope="col">{t("colStore")}</th>
                <th scope="col">{t("colWho")}</th>
                <th scope="col">{t("colAction")}</th>
                <th scope="col">{t("colDetails")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="whitespace-nowrap text-ink-muted">{row.time}</td>
                  <td>{row.store ?? t("platform")}</td>
                  <td>
                    {row.actorName
                      ? t("actorNamed", { type: t(`actors.${row.actorType}`), name: row.actorName })
                      : t(`actors.${row.actorType}`)}
                  </td>
                  <td className="font-mono whitespace-nowrap">{row.action}</td>
                  <td className="text-ink-muted">
                    {[row.target, row.details].filter(Boolean).join(" · ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {pageNumber > 1 ? (
          <Link href={pageHref(pageNumber - 1)} className="glass">
            <Icon name="chevron-left" size={20} />
            {t("newer")}
          </Link>
        ) : null}
        {hasMore ? (
          <Link href={pageHref(pageNumber + 1)} className="glass">
            {t("older")}
            <Icon name="chevron-right" size={20} />
          </Link>
        ) : null}
      </div>
    </>
  );
}
