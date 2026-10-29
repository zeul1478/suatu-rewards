import Link from "next/link";
import { Icon } from "@/components/ui/icons/Icon";
import { SignDigits } from "@/components/ui/SignDigits";
import { storeUrl } from "@/lib/storeUrl";
import { DEMO_STORE_SLUG } from "./screens";
import { Section } from "./Section";

/**
 * The app has two sides that talk to each other: the cashier's counter screen and the
 * customer's app. Testing means one device (or browser tab) for each.
 */
export function TwoParts() {
  return (
    <Section
      title="2. Pick a part on each phone"
      note="The app has two parts that work together. Open one on each phone (or each tab)."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <article className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-raised p-5">
          <header className="flex items-center gap-3">
            <Icon name="staff" size={32} />
            <div>
              <h3 className="font-display text-2xl font-bold text-ink">Cashier</h3>
              <p className="text-sm text-ink-muted">The counter screen, on a tablet or phone</p>
            </div>
          </header>
          <div className="flex flex-col gap-2">
            <p className="font-semibold text-ink">Log in with</p>
            <dl className="flex flex-wrap gap-x-6 gap-y-3">
              <div className="flex flex-col gap-1.5">
                <dt className="text-sm text-ink-muted">User name</dt>
                <dd>
                  <SignDigits value="0000" label="User name" />
                </dd>
              </div>
              <div className="flex flex-col gap-1.5">
                <dt className="text-sm text-ink-muted">Password</dt>
                <dd>
                  <SignDigits value="0000" label="Password" />
                </dd>
              </div>
            </dl>
          </div>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink-muted">
            <li>Type the customer&apos;s phone number → Add visit (+5)</li>
            <li>Type the 6-digit code from the customer&apos;s phone → Redeem</li>
            <li>
              The same login opens the owner dashboard: customers, rewards, offers, staff and the
              printable counter sign
            </li>
            <li>
              <code>0000</code> / <code>0000</code> also opens{" "}
              <Link
                href="/admin"
                className="font-semibold text-accent underline underline-offset-4"
              >
                Admin
              </Link>{" "}
              (behappy): every store, adding a store, the audit log
            </li>
          </ul>
          <div className="mt-auto flex flex-wrap gap-3">
            <Link
              href={storeUrl(DEMO_STORE_SLUG, "", "staff")}
              className="glass glass-primary flex-1"
            >
              <Icon name="add-visit" />
              Open the counter screen
            </Link>
            <Link href={storeUrl(DEMO_STORE_SLUG, "", "dashboard")} className="glass flex-1">
              <Icon name="chart" />
              Owner dashboard
            </Link>
          </div>
        </article>

        <article className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-raised p-5">
          <header className="flex items-center gap-3">
            <Icon name="user" size={32} />
            <div>
              <h3 className="font-display text-2xl font-bold text-ink">Customer</h3>
              <p className="text-sm text-ink-muted">
                The Suatu Rewards app, on the driver&apos;s phone
              </p>
            </div>
          </header>
          <div className="flex flex-col gap-2">
            <p className="font-semibold text-ink">Use your own details</p>
            <p className="text-sm text-ink-muted">
              Create an account with a phone number, name, email and password. A made-up number such
              as <span className="text-ink">(305) 555-0199</span> works too — nothing is ever
              texted. Then log in with that phone number and password.
            </p>
          </div>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink-muted">
            <li>Points appear by themselves a few seconds after the cashier adds a visit</li>
            <li>At 100 points: Free coffee unlocked → Redeem shows a 6-digit code</li>
          </ul>
          <div className="mt-auto flex flex-wrap gap-3">
            <Link
              href={storeUrl(DEMO_STORE_SLUG, "/signup")}
              className="glass glass-primary flex-1"
            >
              Create an account
            </Link>
            <Link href={storeUrl(DEMO_STORE_SLUG, "/login")} className="glass flex-1">
              Log in
            </Link>
          </div>
        </article>
      </div>
    </Section>
  );
}
