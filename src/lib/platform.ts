/**
 * The company that makes these apps. Unlike store brands it's the same in every store's app and
 * appears only as the "Powered by behappy" credit (spec §5): dark badge in the customer app
 * footer and Account page, light badge on the staff screen. Files copied from brand/behappy/ by
 * `pnpm brand:sync`.
 */
export const platform = {
  name: "behappy",
  poweredBy: {
    onDark: "/platform/behappy/powered-by-dark.svg",
    onLight: "/platform/behappy/powered-by-light.svg",
    width: 157.62,
    height: 24,
  },
} as const;
