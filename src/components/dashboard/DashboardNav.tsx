"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon, type IconName } from "@/components/ui/icons/Icon";

export type DashboardNavItem = { href: string; label: string; icon: IconName };

/**
 * Dashboard sections, inside a rounded box. A side column on wide screens; on a phone, a row
 * that swipes sideways inside the box only (the page itself doesn't move), with the current
 * section scrolled into view. A section stays marked on its sub-pages (customers/…).
 */
export function DashboardNav({ items, label }: { items: DashboardNavItem[]; label: string }) {
  const pathname = usePathname();
  const [home] = items;
  const isCurrent = (href: string) =>
    href === home?.href ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  // Bring the current section into view inside the row, without scrolling the page.
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const list = listRef.current;
    const current = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !current || list.scrollWidth <= list.clientWidth) return;
    list.scrollLeft = current.offsetLeft - (list.clientWidth - current.offsetWidth) / 2;
  }, [pathname]);

  return (
    <nav aria-label={label} className="print:hidden">
      <ul
        ref={listRef}
        className="relative flex snap-x [scrollbar-width:none] gap-1 overflow-x-auto overscroll-x-contain rounded-[var(--radius-xl)] border border-line bg-raised p-1 md:flex-col md:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => {
          const current = isCurrent(item.href);
          return (
            <li key={item.href} className="shrink-0 snap-start">
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-[var(--target-min)] items-center gap-2 rounded-[var(--radius-lg)] px-3 font-semibold whitespace-nowrap ${
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
