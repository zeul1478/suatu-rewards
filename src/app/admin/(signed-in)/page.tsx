import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PageTitle } from "@/components/dashboard/PageTitle";
import { Icon } from "@/components/ui/icons/Icon";
import { requireAdmin } from "@/server/admin/access";
import { listStores } from "@/server/admin/stores";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.stores");
  return { title: t("metaTitle") };
}

/** Every store, whatever its status, with the numbers that show whether it's being used. */
export default async function AdminStoresPage() {
  await requireAdmin();
  const [stores, t] = await Promise.all([listStores(), getTranslations("admin.stores")]);

  return (
    <>
      <PageTitle
        title={t("title")}
        intro={t("intro")}
        actions={
          <Link href="/admin/stores/new" className="glass">
            <Icon name="plus" size={22} />
            {t("add")}
          </Link>
        }
      />

      {stores.length === 0 ? (
        <p className="text-ink-muted">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-raised">
          <table className="w-full min-w-[40rem] text-left">
            <thead className="border-b border-line text-sm text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  {t("colStore")}
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  {t("colStatus")}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  {t("colMembers")}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  {t("colVisits")}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  {t("colStaff")}
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  {t("colLastVisit")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {stores.map((store) => (
                <tr key={store.id}>
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/stores/${store.id}`}
                      className="flex min-h-[var(--target-min)] flex-col justify-center font-semibold text-accent underline-offset-4 hover:underline"
                    >
                      {store.name}
                      <span className="text-sm font-normal text-ink-muted">
                        /{store.slug} · {store.country}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-2">{t(`status.${store.status}`)}</td>
                  <td className="price-digits px-4 py-2 text-right">{store.members}</td>
                  <td className="price-digits px-4 py-2 text-right">{store.visits30Days}</td>
                  <td className="price-digits px-4 py-2 text-right">{store.staff}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-ink-muted">
                    {store.lastVisit ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
