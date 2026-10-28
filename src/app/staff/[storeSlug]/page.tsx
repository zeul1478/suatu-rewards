import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { IdleLogout } from "@/components/staff/IdleLogout";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { TextField } from "@/components/ui/TextField";
import { storeUrl } from "@/lib/storeUrl";
import { getCurrentStaff, STAFF_IDLE_MS } from "@/server/staff/session";
import { getStoreOr404 } from "@/server/stores/getStore";
import { staffLogoutAction } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("staff");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/*
 * Counter screen layout (M2): tablet first, portrait and landscape, fully usable on a phone.
 * The forms are in place; adding visits and redeeming codes are wired up in Milestone 3.
 */
export default async function StaffPage({ params }: PageProps<"/staff/[storeSlug]">) {
  const { storeSlug } = await params;
  const store = await getStoreOr404(storeSlug);
  const staff = await getCurrentStaff(store.id);
  if (!staff) redirect(storeUrl(store.slug, "/login", "staff"));
  const [t, tCommon] = await Promise.all([getTranslations("staff"), getTranslations("common")]);
  const devNote = process.env.NODE_ENV !== "production" ? t("devNotReady") : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <IdleLogout
        timeoutMs={STAFF_IDLE_MS}
        logout={staffLogoutAction.bind(null, store.slug, "idle")}
      />

      <header className="screen-gutter flex flex-wrap items-center justify-between gap-3 border-b border-line bg-raised pt-[max(var(--space-3),env(safe-area-inset-top))] pb-3">
        <div className="flex flex-col">
          <p className="font-display text-xl font-semibold tracking-[0.18em] text-brand uppercase">
            {store.name}
          </p>
          <p className="text-sm text-ink-muted">{t("signedInAs", { name: staff.displayName })}</p>
        </div>
        <LogoutButton
          action={staffLogoutAction.bind(null, store.slug, undefined)}
          label={tCommon("logOut")}
          pendingLabel={tCommon("loggingOut")}
        />
      </header>

      <main className="screen-gutter mx-auto grid w-full max-w-6xl flex-1 content-start gap-6 py-6 md:grid-cols-[3fr_2fr] md:gap-8">
        <section
          aria-labelledby="add-visit-heading"
          className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-raised p-5"
        >
          <h1 id="add-visit-heading" className="font-display text-3xl font-bold">
            {t("addVisitTitle")}
          </h1>
          <form className="flex flex-col gap-4">
            <TextField
              name="phone"
              label={t("phone")}
              hint={t("phoneHint")}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              enterKeyHint="done"
              variant="large"
              required
            />
            <button type="submit" disabled className="glass glass-primary glass-large w-full">
              {t("addVisit", { points: store.pointsPerVisit })}
            </button>
          </form>
          {devNote ? <p className="text-sm text-ink-muted">{devNote}</p> : null}
        </section>

        <div className="flex flex-col gap-6">
          <section
            aria-labelledby="redeem-heading"
            className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-raised p-5"
          >
            <h2 id="redeem-heading" className="font-display text-2xl font-bold">
              {t("redeemTitle")}
            </h2>
            <form className="flex flex-col gap-4">
              <TextField
                name="code"
                label={t("code")}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                enterKeyHint="done"
                variant="large"
              />
              <button type="submit" disabled className="glass w-full">
                {t("redeem")}
              </button>
            </form>
          </section>

          <section aria-labelledby="recent-heading" className="flex flex-col gap-3">
            <h2
              id="recent-heading"
              className="font-display text-xl font-semibold tracking-wide uppercase"
            >
              {t("recentTitle")}
            </h2>
            <p className="text-ink-muted">{t("recentEmpty")}</p>
          </section>
        </div>
      </main>
    </div>
  );
}
