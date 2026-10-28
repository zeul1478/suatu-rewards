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

Later: `pnpm db:reset` rebuilds the database from migrations + seed.

## On your phone

```bash
pnpm dev:lan          # prints http://<laptop-ip>:3000
```

Open that address on a phone on the same Wi-Fi, or scan the QR code on the dev home page.

## Demo logins (development only)

| Who                             | Log in with                                              |
| ------------------------------- | -------------------------------------------------------- |
| Staff · manager · owner · admin | user name `0000`, password `0000`                        |
| Customer                        | sign up with your own details (any made-up number works) |

`0000` is refused by production builds.

## Try the golden path (§0)

1. Phone: open the app (QR on the dev home) → **Customer sign up** with any made-up number.
2. Tablet or second phone: **Staff screen** → `0000` / `0000` → type that number → **Add visit (+5)**.
3. Watch the phone go to 5 / 100 within ~3 seconds. Repeat to 100 → **Redeem** → type the 6-digit code at the counter.

## Scripts

| Command                                             | Does                                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `pnpm dev:cert`                                     | Once: HTTPS certificate so phones can install the app (needs `brew install mkcert && mkcert -install`) |
| `pnpm dev` / `pnpm dev:lan`                         | Dev server on this laptop / on the Wi-Fi network                                                       |
| `pnpm db:start` · `db:stop` · `db:reset` · `db:env` | Local Supabase; `db:env` rewrites `.env.local`                                                         |
| `pnpm test`                                         | Unit tests                                                                                             |
| `pnpm e2e`                                          | Browser tests on all device profiles (`pnpm e2e:install` first)                                        |
| `pnpm check`                                        | Lint, types, formatting, unit tests                                                                    |
| `pnpm e2e:prod`                                     | Production build + its guards (0000 refused, dev home 404)                                             |
| `pnpm db:types`                                     | Regenerate `src/types/database.ts` after a migration                                                   |
| `pnpm build`                                        | Production build                                                                                       |

## Local tools

- Mailpit (test emails — password resets, email confirmations): http://127.0.0.1:55324
- Supabase Studio (database): http://127.0.0.1:55323

## Branding

The store's look is `src/brands/suatu.ts` (names, colours, fonts, which logo/icon file is which). Original files stay in `brand/`; run `pnpm brand:sync` after changing them, then `pnpm test` (checks files exist and colours stay readable). See `docs/DESIGN.md` → Brand system.

## Docs

[Architecture](docs/ARCHITECTURE.md) · [Decisions](docs/DECISIONS.md) · [Design](docs/DESIGN.md) · [Testing](docs/TESTING.md)
