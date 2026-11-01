import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icons/Icon";

type SectionProps = {
  /** Used for the heading's id, so the section is announced by its heading. */
  id: string;
  title: string;
  icon?: IconName;
  /** Something on the right of the heading, e.g. a small link. */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
};

/**
 * A titled block of a screen ("VISITS", "YOUR DETAILS", "VISIT US"…): one heading style and one
 * spacing everywhere (.section-heading in globals.css).
 */
export function Section({ id, title, icon, action, className, children }: SectionProps) {
  return (
    <section aria-labelledby={`${id}-heading`} className={`flex flex-col gap-4 ${className ?? ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${id}-heading`} className="section-heading">
          {icon ? <Icon name={icon} /> : null}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
