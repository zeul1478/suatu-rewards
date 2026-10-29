import { storeUrl } from "@/lib/storeUrl";

/** Bump after each milestone ships; screens up to this number become links. */
export const CURRENT_MILESTONE = 7;

export const DEMO_STORE_SLUG = "suatu";

export type DevScreen = {
  name: string;
  who: string;
  href: string;
  milestone: number;
};

export const devScreens: DevScreen[] = [
  {
    name: "Customer sign up",
    who: "Customer · phone",
    href: storeUrl(DEMO_STORE_SLUG, "/signup"),
    milestone: 2,
  },
  {
    name: "Customer log in",
    who: "Customer · phone",
    href: storeUrl(DEMO_STORE_SLUG, "/login"),
    milestone: 2,
  },
  {
    name: "Customer home (points)",
    who: "Customer · phone",
    href: storeUrl(DEMO_STORE_SLUG),
    milestone: 3,
  },
  {
    name: "Rewards · History · Account",
    who: "Customer · phone",
    href: storeUrl(DEMO_STORE_SLUG, "/account"),
    milestone: 5,
  },
  {
    name: "Staff screen",
    who: "Cashier · tablet or phone",
    href: storeUrl(DEMO_STORE_SLUG, "", "staff"),
    milestone: 2,
  },
  {
    name: "Owner dashboard",
    who: "Owner · laptop or phone",
    href: storeUrl(DEMO_STORE_SLUG, "", "dashboard"),
    milestone: 7,
  },
  { name: "Admin", who: "You · laptop", href: "/admin", milestone: 8 },
  {
    name: "Program terms",
    who: "Everyone",
    href: storeUrl(DEMO_STORE_SLUG, "/program-terms", "legal"),
    milestone: 2,
  },
  { name: "Privacy policy", who: "Everyone", href: "/legal/privacy", milestone: 2 },
];
