import Link from "next/link";
import type { Brand } from "@/brands";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Icon } from "@/components/ui/icons/Icon";

type ScreenHeaderProps = {
  brand: Brand;
  title: string;
  back?: { href: string; label: string };
};

/** Top of every signed-in customer screen: centred logo and title, optional back link. */
export function ScreenHeader({ brand, title, back }: ScreenHeaderProps) {
  return (
    <header className="flex flex-col gap-4">
      {/* Three columns keep the logo centred whether or not there's a back link. */}
      <div className="grid min-h-[var(--target-min)] grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div>
          {back ? (
            <Link
              href={back.href}
              className="-ml-2 flex min-h-[var(--target-min)] w-fit items-center gap-1 px-2 font-semibold text-accent"
            >
              <Icon name="chevron-left" size={20} />
              {back.label}
            </Link>
          ) : null}
        </div>
        <BrandLogo brand={brand} kind="wordmark" theme="system" height={26} priority />
      </div>
      <div className="lane-stripe" aria-hidden="true" />
      <h1 className="text-center font-display text-4xl leading-tight font-bold tracking-tight text-ink">
        {title}
      </h1>
    </header>
  );
}
