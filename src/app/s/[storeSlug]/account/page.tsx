import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ChangePasswordForm } from "@/components/customer/ChangePasswordForm";
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

  const details = [
    { label: t("name"), value: `${customer.firstName} ${customer.lastName}` },
    { label: t("phone"), value: customer.phoneE164 },
    {
      label: t("email"),
      value: customer.email,
      note: customer.emailVerified ? t("emailVerified") : t("emailUnverified"),
    },
  ];

  return (
    <main className="screen-gutter mx-auto flex w-full max-w-md flex-col gap-8 pt-[max(var(--space-8),env(safe-area-inset-top))] pb-[max(var(--space-12),env(safe-area-inset-bottom))]">
      <header className="flex flex-col gap-4">
        <Link
          href={storeUrl(store.slug)}
          className="self-start py-2 font-semibold text-accent underline"
        >
          {t("back")}
        </Link>
        <h1 className="font-display text-4xl font-bold text-ink">{t("title")}</h1>
        <div className="lane-stripe" aria-hidden="true" />
      </header>

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
              <dt className="text-sm text-ink-muted">{item.label}</dt>
              <dd className="break-words text-ink">{item.value}</dd>
              {item.note ? <dd className="text-sm text-ink-muted">{item.note}</dd> : null}
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="password-heading" className="flex flex-col gap-4">
        <h2
          id="password-heading"
          className="font-display text-xl font-semibold tracking-wide uppercase"
        >
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
