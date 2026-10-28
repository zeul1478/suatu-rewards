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
      <p className="border-t border-line pt-4 text-sm text-ink-muted">
        Demo customers with made-up 555 numbers arrive in Milestone 2.
      </p>
    </Section>
  );
}
