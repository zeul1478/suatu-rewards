import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/dashboard/PageTitle";
import {
  AddStaffForm,
  ResetStaffPasswordForm,
  StaffActiveButton,
  StaffPhoneForm,
} from "@/components/dashboard/StaffForms";
import { requireManager } from "@/server/dashboard/access";
import { listStaff } from "@/server/dashboard/staffAdmin";
import {
  addStaffAction,
  resetStaffPasswordAction,
  setStaffActiveAction,
  setStaffPhoneAction,
} from "../../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.staff");
  return { title: t("metaTitle") };
}

/** Staff management (§6): add, turn off, reset password. Owners never know a working password. */
export default async function StaffPage({ params }: PageProps<"/dashboard/[storeSlug]/staff">) {
  const { storeSlug } = await params;
  const { store, manager } = await requireManager(storeSlug);
  const [staff, t] = await Promise.all([
    listStaff(store, manager.id),
    getTranslations("dashboard.staff"),
  ]);

  return (
    <>
      <PageTitle title={t("title")} intro={t("intro")} />

      <ul className="flex flex-col gap-4">
        {staff.map((person) => (
          <li key={person.id}>
            <section
              aria-label={person.displayName}
              className={`flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line p-5 ${person.active ? "bg-raised" : "bg-sunken"}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-2xl font-bold">
                  {person.displayName}
                  {person.isYou ? (
                    <span className="ml-2 text-base font-semibold text-ink-muted">{t("you")}</span>
                  ) : null}
                </h2>
                <p className="text-sm text-ink-muted">
                  {t(`roles.${person.role}`)} · {t("userName", { code: person.staffCode })}
                </p>
              </div>
              <p className="text-sm text-ink-muted">
                {!person.active
                  ? t("isOff")
                  : person.mustChangePassword
                    ? t("waitingForPassword")
                    : person.lastLogin
                      ? t("lastLogin", { when: person.lastLogin })
                      : t("neverLoggedIn")}
              </p>
              <StaffPhoneForm
                action={setStaffPhoneAction.bind(null, store.slug, person.id)}
                name={person.displayName}
                phone={person.phone}
                idPrefix={`phone-${person.id.slice(0, 8)}`}
              />
              {person.isYou ? null : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  {person.active ? (
                    <ResetStaffPasswordForm
                      action={resetStaffPasswordAction.bind(null, store.slug, person.id)}
                      name={person.displayName}
                      idPrefix={`staff-${person.id.slice(0, 8)}`}
                    />
                  ) : null}
                  <div className="sm:w-64">
                    <StaffActiveButton
                      action={setStaffActiveAction.bind(
                        null,
                        store.slug,
                        person.id,
                        !person.active,
                      )}
                      active={person.active}
                      name={person.displayName}
                    />
                  </div>
                </div>
              )}
            </section>
          </li>
        ))}
      </ul>

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
        <AddStaffForm action={addStaffAction.bind(null, store.slug)} />
      </section>
    </>
  );
}
