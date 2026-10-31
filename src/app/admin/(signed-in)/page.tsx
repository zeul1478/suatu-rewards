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
        <div className="panel overflow-x-auto">
          <table className="data-table min-w-[40rem]">
            <thead>
              <tr>
                <th scope="col">{t("colStore")}</th>
                <th scope="col">{t("colStatus")}</th>
                <th scope="col" className="num">
                  {t("colMembers")}
                </th>
                <th scope="col" className="num">
                  {t("colVisits")}
                </th>
                <th scope="col" className="num">
                  {t("colStaff")}
                </th>
                <th scope="col">{t("colLastVisit")}</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store.id}>
                  <td>
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
                  <td>{t(`status.${store.status}`)}</td>
                  <td className="price-digits num">{store.members}</td>
                  <td className="price-digits num">{store.visits30Days}</td>
                  <td className="price-digits num">{store.staff}</td>
                  <td className="whitespace-nowrap text-ink-muted">{store.lastVisit ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
