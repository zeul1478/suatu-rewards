import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icons/Icon";

/** "‹ Back to …": the one way back on every screen, with a thumb-sized tap area. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="-ml-2 flex min-h-[var(--target-min)] w-fit items-center gap-1 px-2 font-semibold text-accent"
    >
      <Icon name="chevron-left" size={20} />
      {children}
    </Link>
  );
}
