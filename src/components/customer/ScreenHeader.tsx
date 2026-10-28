import Link from "next/link";
import type { Brand } from "@/brands";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Icon } from "@/components/ui/icons/Icon";

type ScreenHeaderProps = {
  brand: Brand;
  title: string;
  back?: { href: string; label: string };
};

/** Top of every signed-in customer screen: wordmark, optional back link, lane stripe, title. */
export function ScreenHeader({ brand, title, back }: ScreenHeaderProps) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex min-h-[var(--target-min)] items-center justify-between gap-4">
        <BrandLogo brand={brand} kind="wordmark" theme="system" height={26} priority />
        {back ? (
          <Link
            href={back.href}
            className="-mr-2 flex min-h-[var(--target-min)] items-center gap-1 px-2 font-semibold text-accent"
          >
            <Icon name="chevron-left" size={20} />
            {back.label}
          </Link>
        ) : null}
      </div>
      <div className="lane-stripe" aria-hidden="true" />
      <h1 className="font-display text-4xl leading-tight font-bold tracking-tight text-ink">
        {title}
      </h1>
    </header>
  );
}
