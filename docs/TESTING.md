# Testing

## Automated

| Command      | What                                                                  | Where                     |
| ------------ | --------------------------------------------------------------------- | ------------------------- |
| `pnpm test`  | Unit tests (Vitest); DB-function tests join in M3                     | `tests/unit`, `tests/db`  |
| `pnpm e2e`   | End-to-end + accessibility (Playwright + axe) on every device project | `tests/e2e`, `tests/a11y` |
| `pnpm check` | Lint + type-check + format check + unit tests                         | —                         |

`pnpm e2e` starts the dev server itself (or reuses one already running on port 3000). First time only: `pnpm e2e:install` downloads the browsers.

### Device projects (spec §10)

iPhone SE (320 px, WebKit) · iPhone 15 Pro (WebKit) · Pixel 7 (Chromium) · Galaxy S9+ (320 px, Chromium) · iPad (gen 7) landscape (WebKit) · Desktop Chrome · Desktop Safari · Desktop Firefox.

Samsung Internet can't be driven by Playwright → manual checklist below.

### Every screen gets

- Loads and shows its main content.
- No horizontal scroll (checked at 320 px on iPhone SE and Galaxy S9+).
- axe: zero WCAG 2.2 AA violations.

## Status by milestone

| Milestone | Automated tests                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------- |
| M1        | `storeUrl` unit tests (5); dev home e2e + axe + no-overflow on all 8 device projects (24 tests) |

## Manual checklist

Fill in as each milestone ships. ✅ pass · ❌ fail · — not yet applicable.

| Check                         | iPhone Safari | iPhone home-screen | Android Chrome | Samsung Internet | Notes   |
| ----------------------------- | ------------- | ------------------ | -------------- | ---------------- | ------- |
| M1: dev home loads over Wi-Fi |               | —                  |                |                  |         |
| VoiceOver / TalkBack pass     |               |                    |                |                  | from M2 |
| Landscape                     |               |                    |                |                  |         |
| Dark / light                  |               |                    |                |                  |         |
| 200% text size                |               |                    |                |                  |         |
| Slow 3G                       |               |                    |                |                  |         |
| Offline page                  |               |                    |                |                  | from M5 |
| Airplane mode mid-action      |               |                    |                |                  | from M3 |

## Testing on your phone

1. Phone and laptop on the **same Wi-Fi**.
2. On the laptop: `pnpm dev:lan`. It prints an address like `http://10.0.0.157:3000`.
3. On the phone: scan the QR code on the dev home, or type that address.

If it doesn't load: check the Mac's firewall (System Settings → Network → Firewall) allows incoming connections for `node`, and that the phone isn't on a guest network that isolates devices.

HTTPS on the phone (needed from Milestone 2 for secure cookies and the PWA) gets its own steps for iPhone and Android when it's set up.
