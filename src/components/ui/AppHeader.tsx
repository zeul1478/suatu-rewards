import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icons/Icon";

type AppHeaderProps = {
  /** The logo (and an optional caption under it). Always centred. */
  logo: ReactNode;
  signedInAs: string;
  actions: ReactNode;
};

/**
 * Top bar of the counter, dashboard and admin screens. Phone: logo, name and buttons stacked and
 * centred. Wider: name left, logo centre, buttons right — three columns keep the logo centred
 * whatever the sides hold.
 */
export function AppHeader({ logo, signedInAs, actions }: AppHeaderProps) {
  return (
    <header className="screen-gutter grid grid-cols-1 items-center justify-items-center gap-3 border-b border-line bg-raised pt-[max(var(--space-3),env(safe-area-inset-top))] pb-3 text-center md:grid-cols-[1fr_auto_1fr] print:hidden">
      <div className="flex flex-col items-center gap-1 md:col-start-2 md:row-start-1">{logo}</div>
      <p className="flex items-center gap-1.5 text-sm text-ink-muted md:col-start-1 md:row-start-1 md:justify-self-start md:text-left">
        <Icon name="user" size={20} />
        {signedInAs}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2 md:col-start-3 md:row-start-1 md:justify-self-end">
        {actions}
      </div>
    </header>
  );
}
