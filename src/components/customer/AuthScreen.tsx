import type { ReactNode } from "react";
import type { Brand } from "@/brands";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BrandHeader, Screen } from "@/components/layout";

type AuthScreenProps = {
  brand: Brand;
  title: string;
  intro?: string;
  children: ReactNode;
};

/**
 * Sign-up, log-in and password screens: the shared Screen and BrandHeader, with the store's full
 * logo and tagline above one column.
 */
export function AuthScreen({ brand, title, intro, children }: AuthScreenProps) {
  return (
    <Screen>
      <BrandHeader
        logo={<BrandLogo brand={brand} kind="lockup" theme="system" height={64} priority />}
        tagline={brand.tagline}
        title={title}
        intro={intro}
      />
      {children}
    </Screen>
  );
}
