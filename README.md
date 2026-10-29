# Suatu Rewards

Loyalty web app for **Suatu**, a gas station with a shop: +5 points per visit, a free coffee at 100. A working MVP/demo (fictional data only). The full spec is [`MVP_SPEC.md`](MVP_SPEC.md).

## Requirements

- macOS (Apple Silicon) — other systems work but aren't documented
- [nvm](https://github.com/nvm-sh/nvm) with Node 24 (`nvm install 24`)
- Docker Desktop, running
- pnpm via corepack: `corepack enable pnpm`

The Supabase CLI and Playwright come with the project; nothing else is installed globally.

## Start from a clean clone

```bash
nvm use               # Node 24, from .nvmrc
pnpm install
pnpm db:start         # first time: downloads Supabase images (a few minutes), writes .env.local
pnpm dev              # http://localhost:3000
```

Later: `pnpm db:reset` rebuilds the database from migrations + seed (it erases everything typed by hand; `pnpm db:start` keeps it).

## On your phone

```bash
pnpm dev:lan          # prints http://<laptop-ip>:3000
```

Open that address on a phone on the same Wi-Fi, or scan the QR code on the dev home page.

## Demo logins (development only)

| Who                             | Log in with                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| Staff · manager · owner · admin | user name `0000`, password `0000` (admin is its own account with the same name and password) |
| Customer                        | sign up with your own details (any made-up number works)                                     |

`0000` is refused by production builds.

## Try the golden path (§0)

1. Phone: open the app (QR on the dev home) → **Customer sign up** with any made-up number.
2. Tablet or second phone: **Staff screen** → `0000` / `0000` → type that number → **Add visit (+5)**.
3. Watch the phone go to 5 / 100 within ~3 seconds. Repeat to 100 → **Redeem** → type the 6-digit code at the counter.

## Owner dashboard

`/dashboard/suatu`, same `0000` / `0000` (managers only). Overview numbers, customers (masked phones/emails, adjust points with a note, release a number), rewards, offers with picture and live preview, staff (add / turn off / reset — passwords set here are temporary), settings (points per visit), CSV export and the printable counter sign with a QR code.

## Admin (behappy)

`/admin`, `0000` / `0000` (a separate admin account, not a store's staff). Every store with its numbers; **Add a store** (address, location → language and currency, points per visit, first owner with a temporary password); pause / switch back on; a store's owners and cashiers; the audit log of every store. Stores in Romania show their screens in Romanian (`src/messages/ro.json`, a draft for a native speaker to review).

## Security

Content-Security-Policy with a fresh nonce on every page (`src/proxy.ts`, `src/lib/securityHeaders.ts`), plus nosniff, no framing, referrer and permissions policies, and HSTS in production. Rate limits on logins, redemption codes, sign-ups and reset emails (`src/server/throttle.ts`). Details and what to revisit before launch: `docs/DECISIONS.md` D67.

## Scripts

| Command                                             | Does                                                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev:cert`                                     | Once: HTTPS certificate so phones can install the app (needs `brew install mkcert && mkcert -install`)                    |
| `pnpm dev` / `pnpm dev:lan`                         | Dev server on this laptop / on the Wi-Fi network                                                                          |
| `pnpm dev:share`                                    | Like `dev:lan` plus a temporary public link (Cloudflare) for testers elsewhere; dies on Ctrl+C. Dev only: cashier is 0000 |
| `pnpm db:start` · `db:stop` · `db:reset` · `db:env` | Local Supabase; `db:env` rewrites `.env.local`                                                                            |
| `pnpm test`                                         | Unit and database tests                                                                                                   |
| `pnpm e2e`                                          | Browser tests on all device profiles (`pnpm e2e:install` first)                                                           |
| `pnpm check`                                        | Lint, types, formatting, unit tests                                                                                       |
| `pnpm e2e:prod`                                     | Production build + its guards (0000 refused, dev home 404)                                                                |
| `pnpm e2e:visual`                                   | Screenshot comparisons (macOS)                                                                                            |
| `pnpm lighthouse`                                   | Production build scored by Lighthouse (speed, accessibility, best practices)                                              |
| `pnpm admin:create <name> "<Display name>"`         | Adds a platform admin with a temporary password, printed once (production: see `docs/DEPLOY.md`)                          |
| `pnpm db:types`                                     | Regenerate `src/types/database.ts` after a migration                                                                      |
| `pnpm build`                                        | Production build                                                                                                          |

## Local tools

- Mailpit (test emails — password resets, email confirmations): http://127.0.0.1:55324
- Supabase Studio (database): http://127.0.0.1:55323

## Branding

The store's look is `src/brands/suatu.ts` (names, colours, fonts, which logo/icon file is which). Original files stay in `brand/`; run `pnpm brand:sync` after changing them, then `pnpm test` (checks files exist and colours stay readable). See `docs/DESIGN.md` → Brand system.

## Docs

[Architecture](docs/ARCHITECTURE.md) · [Decisions](docs/DECISIONS.md) · [Design](docs/DESIGN.md) · [Testing](docs/TESTING.md) · [Deploying](docs/DEPLOY.md)

Every push to GitHub runs the checks in `.github/workflows/ci.yml`.
