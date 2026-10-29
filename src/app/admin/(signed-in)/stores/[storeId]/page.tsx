import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StoreStatusButton } from "@/components/admin/StoreStatusButton";
import { PageTitle } from "@/components/dashboard/PageTitle";
import {
  AddStaffForm,
  ResetStaffPasswordForm,
  StaffActiveButton,
} from "@/components/dashboard/StaffForms";
import { FormAlert } from "@/components/ui/FormAlert";
import { Icon } from "@/components/ui/icons/Icon";
import { storeUrl } from "@/lib/storeUrl";
import { requireAdmin } from "@/server/admin/access";
import { getStoreForAdmin } from "@/server/admin/stores";
import { listStaff } from "@/server/dashboard/staffAdmin";
import {
  adminAddStaffAction,
  adminResetStaffPasswordAction,
  adminSetStaffActiveAction,
  setStoreStatusAction,
} from "../../../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.store");
  return { title: t("metaTitle") };
}

/** One store: its details, pause / resume, and its owners and staff (§11 "stores, owners"). */
export default async function AdminStorePage({
  params,
  searchParams,
}: PageProps<"/admin/stores/[storeId]">) {
  await requireAdmin();
  const { storeId } = await params;
  const { created } = await searchParams;
  const store = await getStoreForAdmin(storeId);
  if (!store) notFound();
  const [staff, t, tStaff, tStores] = await Promise.all([
    listStaff(store, null),
    getTranslations("admin.store"),
    getTranslations("dashboard.staff"),
    getTranslations("admin.stores"),
  ]);
  const owners = staff.filter((person) => person.role === "manager");
  const cashiers = staff.filter((person) => person.role === "cashier");
  const active = store.status === "active";

  return (
    <>
      <PageTitle
        title={store.name}
        intro={t("intro", { slug: store.slug })}
        actions={
          active ? (
            <>
              <Link href={storeUrl(store.slug)} className="glass">
                <Icon name="phone" size={22} />
                {t("openApp")}
              </Link>
              <Link href={storeUrl(store.slug, "", "dashboard")} className="glass">
                <Icon name="chart" size={22} />
                {t("openDashboard")}
              </Link>
            </>
          ) : null
        }
      />

      {created ? <FormAlert tone="success">{t("created")}</FormAlert> : null}

      <section
        aria-labelledby="details-heading"
        className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-raised p-5"
      >
        <h2
          id="details-heading"
          className="font-display text-xl font-semibold tracking-wide uppercase"
        >
          {t("detailsTitle")}
        </h2>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {(
            [
              [t("status"), tStores(`status.${store.status}`)],
              [t("address"), `/s/${store.slug}`],
              [t("country"), store.country],
              [t("timezone"), store.timezone],
              [t("language"), store.locale],
              [t("currency"), store.currency],
              [t("pointsPerVisit"), String(store.pointsPerVisit)],
              [t("createdAt"), store.createdAt],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex flex-col">
              <dt className="text-sm font-semibold text-ink-muted">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-ink-muted">{t("brandNote", { slug: store.slug })}</p>
        {store.status === "closed" ? null : (
          <div className="flex flex-col gap-2 sm:max-w-sm">
            <p className="text-sm text-ink-muted">{active ? t("pauseHint") : t("resumeHint")}</p>
            <StoreStatusButton
              action={setStoreStatusAction.bind(null, store.id, active ? "paused" : "active")}
              pause={active}
              name={store.name}
            />
          </div>
        )}
      </section>

      {[
        { id: "owners", title: t("ownersTitle"), intro: t("ownersIntro"), people: owners },
        { id: "cashiers", title: t("cashiersTitle"), intro: undefined, people: cashiers },
      ].map((group) => (
        <section
          key={group.id}
          aria-labelledby={`${group.id}-heading`}
          className="flex flex-col gap-3"
        >
          <h2
            id={`${group.id}-heading`}
            className="font-display text-xl font-semibold tracking-wide uppercase"
          >
            {group.title}
          </h2>
          {group.intro ? <p className="text-ink-muted">{group.intro}</p> : null}
          {group.people.length === 0 ? (
            <p className="text-ink-muted">{t("nobody")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {group.people.map((person) => (
                <li key={person.id}>
                  <section
                    aria-label={person.displayName}
                    className={`flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line p-5 ${person.active ? "bg-raised" : "bg-sunken"}`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-display text-2xl font-bold">{person.displayName}</h3>
                      <p className="text-sm text-ink-muted">
                        {tStaff(`roles.${person.role}`)} ·{" "}
                        {tStaff("userName", { code: person.staffCode })}
                      </p>
                    </div>
                    <p className="text-sm text-ink-muted">
                      {!person.active
                        ? tStaff("isOff")
                        : person.mustChangePassword
                          ? tStaff("waitingForPassword")
                          : person.lastLogin
                            ? tStaff("lastLogin", { when: person.lastLogin })
                            : tStaff("neverLoggedIn")}
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      {person.active ? (
                        <ResetStaffPasswordForm
                          action={adminResetStaffPasswordAction.bind(null, store.id, person.id)}
                          name={person.displayName}
                          idPrefix={`staff-${person.id.slice(0, 8)}`}
                        />
                      ) : null}
                      <div className="sm:w-64">
                        <StaffActiveButton
                          action={adminSetStaffActiveAction.bind(
                            null,
                            store.id,
                            person.id,
                            !person.active,
                          )}
                          active={person.active}
                          name={person.displayName}
                        />
                      </div>
                    </div>
                  </section>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <section
        aria-labelledby="add-staff-heading"
        className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-dashed border-line-strong p-5"
      >
        <h2
          id="add-staff-heading"
          className="font-display text-xl font-semibold tracking-wide uppercase"
        >
          {t("addTitle")}
        </h2>
        <AddStaffForm action={adminAddStaffAction.bind(null, store.id)} defaultRole="manager" />
      </section>
    </>
  );
}
