"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icons/Icon";

export type DashboardNavItem = { href: string; label: string; icon: IconName };

/**
 * Dashboard sections. A side column on wide screens; on a phone, a row that scrolls sideways
 * under the header. A section stays marked on its sub-pages (customers/…).
 */
export function DashboardNav({ items, label }: { items: DashboardNavItem[]; label: string }) {
  const pathname = usePathname();
  const [home] = items;
  const isCurrent = (href: string) =>
    href === home?.href ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label={label} className="print:hidden">
      <ul className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {items.map((item) => {
          const current = isCurrent(item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-[var(--target-min)] items-center gap-2 rounded-[var(--radius-md)] px-3 font-semibold whitespace-nowrap ${
                  current ? "bg-sunken text-ink" : "text-ink-muted hover:text-ink"
                }`}
              >
                <Icon name={item.icon} size={22} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
