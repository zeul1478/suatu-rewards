"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/ui/icons/Icon";
import { useWarmRoutes } from "@/components/layout/useWarmRoutes";

export type DashboardNavItem = { href: string; label: string; icon: IconName };

/**
 * Dashboard sections, inside a rounded box. A side column on wide screens; on a phone, a row
 * that swipes sideways inside the box only (the page itself doesn't move), with the current
 * section scrolled into view. A section stays marked on its sub-pages (customers/…).
 *
 * Feels like an app: the tapped section lights up at once, before its page arrives from the
 * server, and presses in slightly. The keyboard focus ring sits inside the box.
 */
export function DashboardNav({ items, label }: { items: DashboardNavItem[]; label: string }) {
  const pathname = usePathname();
  // Every section ready in memory, so a click shows it at once (D87).
  useWarmRoutes(items.map((item) => item.href));
  const [home] = items;
  const isCurrent = (href: string) =>
    href === home?.href ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  // The section just tapped, until the page changes: marked straight away.
  const [tapped, setTapped] = useState<{ href: string; from: string } | null>(null);
  const marked = (href: string) =>
    tapped && tapped.from === pathname ? tapped.href === href : isCurrent(href);

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
          const lit = marked(item.href);
          return (
            <li key={item.href} className="shrink-0 snap-start">
              <Link
                href={item.href}
                // Preloaded and kept fresh by useWarmRoutes instead.
                prefetch={false}
                aria-current={current ? "page" : undefined}
                onClick={(event) => {
                  // A new tab or window (Cmd/Ctrl-click) leaves this page as it is.
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  if (!current) setTapped({ href: item.href, from: pathname });
                }}
                className={`flex min-h-[var(--target-min)] items-center gap-2 rounded-[var(--radius-lg)] px-3 font-semibold whitespace-nowrap transition-[background-color,color,transform] duration-150 focus-visible:outline-offset-[-3px] active:scale-[0.97] motion-reduce:transition-none ${
                  lit ? "bg-sunken text-ink" : "text-ink-muted hover:bg-sunken/50 hover:text-ink"
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
