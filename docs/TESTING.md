# Testing

## Automated

| Command         | What                                                                              | Where                     |
| --------------- | --------------------------------------------------------------------------------- | ------------------------- |
| `pnpm test`     | Unit tests (Vitest); DB-function tests join in M3                                 | `tests/unit`, `tests/db`  |
| `pnpm e2e`      | End-to-end + accessibility (Playwright + axe) on every device project             | `tests/e2e`, `tests/a11y` |
| `pnpm check`    | Lint + type-check + format check + unit tests                                     | —                         |
| `pnpm e2e:prod` | Builds the app for production and proves its guards (0000 refused, dev home gone) | `tests/prod`              |

`pnpm e2e` starts the dev server itself (or reuses one already running on port 3000). First time only: `pnpm e2e:install` downloads the browsers.

### Device projects (spec §10)

iPhone SE (320 px, WebKit) · iPhone 15 Pro (WebKit) · Pixel 7 (Chromium) · Galaxy S9+ (320 px, Chromium) · iPad (gen 7) landscape (WebKit) · Desktop Chrome · Desktop Safari · Desktop Firefox.

Samsung Internet can't be driven by Playwright → manual checklist below.

### Every screen gets

- Loads and shows its main content.
- No horizontal scroll (checked at 320 px on iPhone SE and Galaxy S9+).
- axe: zero WCAG 2.2 AA violations.

## Status by milestone

| Milestone | Automated tests                                                                                                                                                        |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1        | `storeUrl` unit tests (5); dev home e2e + axe + no-overflow on all 8 device projects (24 tests)                                                                        |
| M2        | Unit 28 (incl. 5 from M1) · DB 11 (throttle functions, sign-up function, RLS, append-only consents) · e2e + a11y 45 per device × 8 projects = 360 · production build 2 |

### §4.3b coverage (M2)

| Case                                                                                                               | Where                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 7 rejected, 8 / 64 accepted, 65 rejected                                                                           | `tests/unit/password.test.ts`, `tests/e2e/passwords.spec.ts`                                                                       |
| Spaces, emoji, diacritics; leading/trailing spaces kept                                                            | both                                                                                                                               |
| `password123`, phone number, email as password rejected                                                            | both                                                                                                                               |
| Show/hide keeps cursor; copy/cut blocked; paste allowed                                                            | `passwords.spec.ts`                                                                                                                |
| Generic error; 5 wrong → locked 15 min; right password refused while locked; unlock after time (DB clock)          | `passwords.spec.ts`, `tests/db/accounts.test.ts`                                                                                   |
| Password not in HTML, URL, storage, cookies or responses                                                           | `passwords.spec.ts`                                                                                                                |
| Password not in server logs                                                                                        | checked by scanning the dev server log after the full run (0 hits). Automated in CI in M9, where the test owns the server's output |
| Change password needs the current one; other devices signed out                                                    | `passwords.spec.ts`                                                                                                                |
| Reset link works once, expires at 60 min, old password stops working                                               | `passwords.spec.ts`                                                                                                                |
| Staff 0000/0000 works in dev, refused in production; 5 wrong → lock; idle logout at 15 min (server + screen timer) | `staff.spec.ts`, `tests/prod`, `tests/unit/staffPasswordPolicy.test.ts`                                                            |
| Redemption code cases                                                                                              | Milestone 3 (the feature doesn't exist yet)                                                                                        |

"Fake clock": lock and link expiry are moved into the past in the database; the screen's idle timer uses Playwright's clock.

## Manual checklist

Fill in as each milestone ships. ✅ pass · ❌ fail · — not yet applicable.

| Check                           | iPhone Safari | iPhone home-screen | Android Chrome | Samsung Internet | Notes   |
| ------------------------------- | ------------- | ------------------ | -------------- | ---------------- | ------- |
| M1: dev home loads over Wi-Fi   | ✅            | —                  |                |                  |         |
| M2: sign up, log out, log in    |               | —                  |                |                  |         |
| M2: forgot password via Mailpit |               | —                  |                |                  |         |
| M2: staff 0000 on tablet/phone  |               | —                  |                |                  |         |
| VoiceOver / TalkBack pass       |               |                    |                |                  | from M2 |
| Landscape                       |               |                    |                |                  |         |
| Dark / light                    |               |                    |                |                  |         |
| 200% text size                  |               |                    |                |                  |         |
| Slow 3G                         |               |                    |                |                  |         |
| Offline page                    |               |                    |                |                  | from M5 |
| Airplane mode mid-action        |               |                    |                |                  | from M3 |

## Testing on your phone

1. Phone and laptop on the **same Wi-Fi**.
2. On the laptop: `pnpm dev:lan`. It prints an address like `http://10.0.0.157:3000`.
3. On the phone: scan the QR code on the dev home, or type that address.

If it doesn't load: check the Mac's firewall (System Settings → Network → Firewall) allows incoming connections for `node`, and that the phone isn't on a guest network that isolates devices.

HTTPS on the phone (needed for the PWA in Milestone 5) gets its own steps for iPhone and Android when it's set up.
