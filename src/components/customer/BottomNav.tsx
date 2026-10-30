"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icons/Icon";

type BottomNavProps = {
  items: { href: string; label: string; icon: IconName }[];
  label: string;
};

/**
 * The customer app's tab bar (spec §11): Home · Rewards · History · Account. A floating pill above
 * the home indicator (depth.css); glass background (small element, so the blur is cheap). Icons per the icon
 * README: active = full colour + accent, inactive = one colour at 60%.
 */
/** A short buzz on Android, like a native tab bar. iPhones don't let websites vibrate. */
function tapFeedback() {
  navigator.vibrate?.(8);
}

export function BottomNav({ items, label }: BottomNavProps) {
  const pathname = usePathname();
  // Home is the shortest path, so match the longest href that the current page starts with.
  const active = [...items]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <nav aria-label={label} className="bottom-nav fixed inset-x-0 bottom-0 z-30">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {items.map((item) => {
          const current = item === active;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                onClick={tapFeedback}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-semibold ${
                  current ? "text-ink" : "bottom-nav-idle text-ink-muted"
                }`}
              >
                <span className="tab-chip grid place-items-center px-3.5 py-0.5">
                  <Icon name={item.icon} size={28} />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
