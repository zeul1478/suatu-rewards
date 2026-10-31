import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { brands } from "@/brands";
import { iconPaths } from "@/components/ui/icons/iconPaths";
import { contrastRatio } from "@/lib/color/contrast";
import { platform } from "@/lib/platform";

/*
 * Every store brand (src/brands/*) must point at files that exist and keep text readable.
 * Changing a brand file and running `pnpm test` is enough to know it's safe (WCAG 2.2 AA).
 */

const publicFile = (url: string) => path.join("public", url);

function filesOf(value: unknown): string[] {
  if (typeof value === "string") return value.startsWith("/") ? [value] : [];
  if (value && typeof value === "object") return Object.values(value).flatMap(filesOf);
  return [];
}

describe.each(Object.values(brands))("brand $slug", (brand) => {
  it("points only at files that exist in public/ (run `pnpm brand:sync` after changing brand/)", () => {
    const files = filesOf({ logo: brand.logo, icons: brand.icons, socialImage: brand.socialImage });
    expect(files.length).toBeGreaterThan(10);
    for (const file of files) expect(existsSync(publicFile(file)), file).toBe(true);
  });

  it("has a home-screen name short enough for phones", () => {
    expect(brand.shortName.length).toBeLessThanOrEqual(12);
  });

  describe.each(["dark", "light"] as const)("%s theme", (theme) => {
    const c = brand.colors[theme];

    it("body and secondary text are readable on every surface (≥ 4.5:1)", () => {
      for (const surface of ["page", "raised", "sunken"] as const) {
        expect(contrastRatio(c.text, c[surface]), `text on ${surface}`).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(c.muted, c[surface]), `muted on ${surface}`).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    });

    it("accent and brand colours work as text on every surface (≥ 4.5:1)", () => {
      for (const surface of ["page", "raised", "sunken"] as const) {
        expect(contrastRatio(c.accent, c[surface]), `accent on ${surface}`).toBeGreaterThanOrEqual(
          4.5,
        );
        expect(contrastRatio(c.brand, c[surface]), `brand on ${surface}`).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    });
  });
});

describe("company credit", () => {
  it("is text only: no company logo is served", () => {
    expect(platform.name).toBe("BeHappy");
    expect(existsSync(publicFile("/platform"))).toBe(false);
  });
});

describe("icon set", () => {
  it("has every icon from the brand kit, and nothing else", () => {
    const kit = readdirSync("brand/suatu/icons/svg").map((file) => file.replace(/\.svg$/, ""));
    expect(Object.keys(iconPaths).sort()).toEqual(kit.sort());
  });

  it("no icon library is installed (spec §3)", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(deps.filter((dep) => /icon|lucide|heroicons|feather/i.test(dep))).toEqual([]);
  });
});
