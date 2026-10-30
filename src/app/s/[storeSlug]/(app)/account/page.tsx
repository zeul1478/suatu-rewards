import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { brandFor } from "@/brands";
import { ChangePasswordForm } from "@/components/customer/ChangePasswordForm";
import { DeleteAccountForm } from "@/components/customer/DeleteAccountForm";
import { InstallHelper } from "@/components/customer/InstallHelper";
import { ProfileForm } from "@/components/customer/ProfileForm";
import { ScreenHeader } from "@/components/customer/ScreenHeader";
import { Icon, type IconName } from "@/components/ui/icons/Icon";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { storeUrl } from "@/lib/storeUrl";
import { requireCustomer } from "@/server/customers/currentCustomer";
import { getMarketingConsent } from "@/server/customers/profile";
import { getStoreOr404 } from "@/server/stores/getStore";
import {
  changePasswordAction,
  deleteAccountAction,
  logoutAction,
  marketingConsentAction,
  updateProfileAction,
} from "../../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("metaTitle") };
}

function AccountSection({
  id,
  icon,
  title,
  children,
}: {
  id: string;
  icon: IconName;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-4">
      <h2
        id={`${id}-heading`}
        className="flex items-center gap-2 font-display text-xl font-semibold tracking-wide uppercase"
      >
        <Icon name={icon} />
        {title}
      </h2>
      {children}
    </section>
  );
}

// Account (§4.4): details, offer emails, password, my data, install, log out, delete.
export default async function AccountPage({ params }: PageProps<"/s/[storeSlug]/account">) {
  const { storeSlug } = await params;
  const store = await getStoreOr404(storeSlug);
  const customer = await requireCustomer(store.slug);
  const [marketing, t, tCommon] = await Promise.all([
    getMarketingConsent(store, customer),
    getTranslations("account"),
    getTranslations("common"),
  ]);

  return (
    <main className="screen-gutter mx-auto flex w-full max-w-md flex-col gap-10 pt-[max(var(--space-8),env(safe-area-inset-top))] pb-[var(--space-8)]">
      <ScreenHeader brand={brandFor(store.slug)} title={t("title")} />

      <AccountSection id="details" icon="user" title={t("details")}>
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-sunken px-4 py-3">
          <Icon name="phone" className="text-ink-muted" />
          <div className="flex flex-col">
            <span className="text-sm text-ink-muted">{t("phone")}</span>
            <span className="text-ink">{customer.phoneE164}</span>
          </div>
        </div>
        <p className="-mt-2 text-sm text-ink-muted">{t("phoneFixed")}</p>
        <p className="text-sm text-ink-muted">
          {customer.emailVerified ? t("emailVerified") : t("emailUnverified")}
        </p>
        <ProfileForm
          action={updateProfileAction.bind(null, store.slug)}
          current={{
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            birthday: customer.birthday,
          }}
        />
      </AccountSection>

      <AccountSection id="offers" icon="mail" title={t("offersTitle")}>
        <p className="text-ink-muted">
          {t(marketing ? "offersOn" : "offersOff", { store: store.name })}
        </p>
        <form
          suppressHydrationWarning
          action={marketingConsentAction.bind(null, store.slug, !marketing)}
        >
          <SubmitButton variant="secondary" pendingLabel={t("saving")}>
            {t(marketing ? "offersTurnOff" : "offersTurnOn")}
          </SubmitButton>
        </form>
      </AccountSection>

      <AccountSection id="password" icon="lock" title={t("changePassword")}>
        <ChangePasswordForm action={changePasswordAction.bind(null, store.slug)} />
      </AccountSection>

      <AccountSection id="data" icon="download" title={t("dataTitle")}>
        <p className="text-ink-muted">{t("dataExplain")}</p>
        <a
          href={`/api${storeUrl(store.slug, "/account/export")}`}
          download
          className="glass w-full"
        >
          <Icon name="download" />
          {t("dataDownload")}
        </a>
      </AccountSection>

      <AccountSection id="install" icon="install" title={t("installTitle")}>
        <InstallHelper />
      </AccountSection>

      <LogoutButton
        action={logoutAction.bind(null, store.slug)}
        label={tCommon("logOut")}
        pendingLabel={tCommon("loggingOut")}
      />

      <DeleteAccountForm action={deleteAccountAction.bind(null, store.slug)} />
    </main>
  );
}
