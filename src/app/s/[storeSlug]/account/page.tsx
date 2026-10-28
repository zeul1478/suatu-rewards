import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { brandFor } from "@/brands";
import { ChangePasswordForm } from "@/components/customer/ChangePasswordForm";
import { ScreenHeader } from "@/components/customer/ScreenHeader";
import { Icon, type IconName } from "@/components/ui/icons/Icon";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { storeUrl } from "@/lib/storeUrl";
import { requireCustomer } from "@/server/customers/currentCustomer";
import { getStoreOr404 } from "@/server/stores/getStore";
import { changePasswordAction, logoutAction } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("metaTitle") };
}

// Account basics (M2). Editing details, data export and deletion arrive in Milestone 5.
export default async function AccountPage({ params }: PageProps<"/s/[storeSlug]/account">) {
  const { storeSlug } = await params;
  const store = await getStoreOr404(storeSlug);
  const customer = await requireCustomer(store.slug);
  const [t, tCommon] = await Promise.all([getTranslations("account"), getTranslations("common")]);

  const details: { icon: IconName; label: string; value: string; note?: string }[] = [
    { icon: "user", label: t("name"), value: `${customer.firstName} ${customer.lastName}` },
    { icon: "phone", label: t("phone"), value: customer.phoneE164 },
    {
      icon: "mail",
      label: t("email"),
      value: customer.email,
      note: customer.emailVerified ? t("emailVerified") : t("emailUnverified"),
    },
  ];

  return (
    <main className="screen-gutter mx-auto flex w-full max-w-md flex-col gap-8 pt-[max(var(--space-8),env(safe-area-inset-top))] pb-[var(--space-8)]">
      <ScreenHeader
        brand={brandFor(store.slug)}
        title={t("title")}
        back={{ href: storeUrl(store.slug), label: t("back") }}
      />

      <section aria-labelledby="details-heading" className="flex flex-col gap-3">
        <h2
          id="details-heading"
          className="font-display text-xl font-semibold tracking-wide uppercase"
        >
          {t("details")}
        </h2>
        <dl className="flex flex-col divide-y divide-line border-y border-line">
          {details.map((item) => (
            <div key={item.label} className="flex flex-col gap-0.5 py-3">
              <dt className="flex items-center gap-2 text-sm text-ink-muted">
                <Icon name={item.icon} size={20} />
                {item.label}
              </dt>
              <dd className="pl-7 break-words text-ink">{item.value}</dd>
              {item.note ? <dd className="pl-7 text-sm text-ink-muted">{item.note}</dd> : null}
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="password-heading" className="flex flex-col gap-4">
        <h2
          id="password-heading"
          className="flex items-center gap-2 font-display text-xl font-semibold tracking-wide uppercase"
        >
          <Icon name="lock" />
          {t("changePassword")}
        </h2>
        <ChangePasswordForm action={changePasswordAction.bind(null, store.slug)} />
      </section>

      <LogoutButton
        action={logoutAction.bind(null, store.slug)}
        label={tCommon("logOut")}
        pendingLabel={tCommon("loggingOut")}
      />
    </main>
  );
}
