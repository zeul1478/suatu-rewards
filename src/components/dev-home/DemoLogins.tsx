import { SignDigits } from "@/components/ui/SignDigits";
import { Section } from "./Section";

export function DemoLogins() {
  return (
    <Section title="Demo logins" note="Development only. Production builds refuse 0000.">
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-ink">Staff · Manager · Owner · Admin</p>
        <p className="text-sm text-ink-muted">One account for every non-customer screen.</p>
      </div>
      <dl className="flex flex-wrap gap-x-8 gap-y-4">
        <div className="flex flex-col gap-2">
          <dt className="text-sm text-ink-muted">User name</dt>
          <dd>
            <SignDigits value="0000" label="User name" />
          </dd>
        </div>
        <div className="flex flex-col gap-2">
          <dt className="text-sm text-ink-muted">Password</dt>
          <dd>
            <SignDigits value="0000" label="Password" />
          </dd>
        </div>
      </dl>
      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <p className="font-semibold text-ink">Demo customer</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-ink-muted">Name</dt>
          <dd className="text-ink">Andrei Popescu</dd>
          <dt className="text-ink-muted">Phone</dt>
          <dd className="price-digits text-base text-accent">(954) 555-0142</dd>
          <dt className="text-ink-muted">Password</dt>
          <dd className="text-ink">suatu demo coffee</dd>
        </dl>
        <p className="text-sm text-ink-muted">
          Or sign up with any made-up number, such as (305) 555-0199. Nothing is ever texted.
        </p>
      </div>
    </Section>
  );
}
