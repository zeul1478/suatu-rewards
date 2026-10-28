import { describe, expect, it } from "vitest";
import { storeUrl } from "@/lib/storeUrl";

describe("storeUrl", () => {
  it("builds customer app URLs by default", () => {
    expect(storeUrl("suatu")).toBe("/s/suatu");
    expect(storeUrl("suatu", "/signup")).toBe("/s/suatu/signup");
  });

  it("treats a bare slash as the area home", () => {
    expect(storeUrl("suatu", "/")).toBe("/s/suatu");
  });

  it("builds staff, dashboard and legal URLs", () => {
    expect(storeUrl("suatu", "", "staff")).toBe("/staff/suatu");
    expect(storeUrl("suatu", "/customers", "dashboard")).toBe("/dashboard/suatu/customers");
    expect(storeUrl("suatu", "/program-terms", "legal")).toBe("/legal/suatu/program-terms");
  });

  it("rejects unsafe slugs", () => {
    for (const slug of ["", "Suatu", "su atu", "../admin", "suatu/", "-suatu"]) {
      expect(() => storeUrl(slug)).toThrow("Invalid store slug");
    }
  });

  it("rejects paths without a leading slash", () => {
    expect(() => storeUrl("suatu", "signup")).toThrow('must start with "/"');
  });
});
