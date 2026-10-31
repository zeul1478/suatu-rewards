import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ChangePasswordForm } from "@/components/customer/ChangePasswordForm";
import { DeleteAccountForm } from "@/components/customer/DeleteAccountForm";
import { InstallHelper } from "@/components/customer/InstallHelper";
import { ProfileForm } from "@/components/customer/ProfileForm";
import { Section, TabPage } from "@/components/layout";
import { Icon } from "@/components/ui/icons/Icon";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { storeUrl } from "@/lib/storeUrl";
import { requireCustomer } from "@/server/customers/currentCustomer";
import { getMarketingConsent, getSmsConsents } from "@/server/customers/profile";
import { getStoreOr404 } from "@/server/stores/getStore";
import {
  changePasswordAction,
  deleteAccountAction,
  logoutAction,
  marketingConsentAction,
  smsConsentAction,
  updateProfileAction,
} from "../../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("metaTitle") };
}

// Account (§4.4): details, offer emails, text messages (D84), password, my data, install, log out,
// delete.
export default async function AccountPage({ params }: PageProps<"/s/[storeSlug]/account">) {
  const { storeSlug } = await params;
  const store = await getStoreOr404(storeSlug);
  const customer = await requireCustomer(store.slug);
  const [marketing, texts, t, tCommon] = await Promise.all([
    getMarketingConsent(store, customer),
    getSmsConsents(store, customer),
    getTranslations("account"),
    getTranslations("common"),
  ]);

  return (
    <TabPage gap="loose" title={t("title")}>
      <Section id="details" icon="user" title={t("details")}>
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
      </Section>

      <Section id="offers" icon="mail" title={t("offersTitle")}>
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
      </Section>

      <Section id="texts" icon="phone" title={t("textsTitle")}>
        <p className="text-ink-muted">{t("textsExplain", { store: store.name })}</p>
        {(
          [
            ["sms_updates", texts.updates, "smsUpdates"],
            ["sms_marketing", texts.marketing, "smsMarketing"],
          ] as const
        ).map(([kind, on, key]) => (
          <div key={kind} className="flex flex-col gap-2">
            <p className="text-ink-muted">{t(on ? `${key}On` : `${key}Off`)}</p>
            <form
              suppressHydrationWarning
              action={smsConsentAction.bind(null, store.slug, kind, !on)}
            >
              <SubmitButton variant="secondary" pendingLabel={t("saving")}>
                {t(on ? `${key}TurnOff` : `${key}TurnOn`)}
              </SubmitButton>
            </form>
          </div>
        ))}
      </Section>

      <Section id="password" icon="lock" title={t("changePassword")}>
        <ChangePasswordForm action={changePasswordAction.bind(null, store.slug)} />
      </Section>

      <Section id="data" icon="download" title={t("dataTitle")}>
        <p className="text-ink-muted">{t("dataExplain")}</p>
        <a
          href={`/api${storeUrl(store.slug, "/account/export")}`}
          download
          className="glass w-full"
        >
          <Icon name="download" />
          {t("dataDownload")}
        </a>
      </Section>

      <Section id="install" icon="install" title={t("installTitle")}>
        <InstallHelper />
      </Section>

      <LogoutButton
        action={logoutAction.bind(null, store.slug)}
        label={tCommon("logOut")}
        pendingLabel={tCommon("loggingOut")}
      />

      <DeleteAccountForm action={deleteAccountAction.bind(null, store.slug)} />
    </TabPage>
  );
}
