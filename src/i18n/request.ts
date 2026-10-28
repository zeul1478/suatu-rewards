import { getRequestConfig } from "next-intl/server";

// English only for now; Romanian (ro.json) joins in Milestone 8 without route changes.
export default getRequestConfig(async () => ({
  locale: "en",
  timeZone: "America/New_York",
  messages: (await import("../messages/en.json")).default,
}));
