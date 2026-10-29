import { afterEach, describe, expect, it, vi } from "vitest";

/* Links in emails (password reset, email confirmation) can't be pointed elsewhere (§8). */

const forged = new Headers({
  host: "evil.example",
  "x-forwarded-host": "evil.example",
  "x-forwarded-proto": "https",
});
vi.mock("next/headers", () => ({ headers: async () => forged }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function origin() {
  const { requestOrigin } = await import("@/server/request");
  return requestOrigin();
}

describe("requestOrigin", () => {
  it("in production: always APP_URL, whatever Host the request claims", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "https://rewards.example.com/");
    expect(await origin()).toBe("https://rewards.example.com");
  });

  it("in production without APP_URL: refuses to start instead of guessing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "");
    await expect(origin()).rejects.toThrow(/APP_URL/);
  });

  it("in development: the address the phone is using", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(await origin()).toBe("https://evil.example");
  });
});
