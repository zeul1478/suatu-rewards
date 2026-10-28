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

| Who                             | Log in with                                             |
| ------------------------------- | ------------------------------------------------------- |
| Staff · manager · owner · admin | user name `0000`, password `0000`                       |
| Customers                       | phone + password (demo customers arrive in Milestone 2) |

`0000` is refused by production builds.

## Scripts

| Command                                             | Does                                                            |
| --------------------------------------------------- | --------------------------------------------------------------- |
| `pnpm dev` / `pnpm dev:lan`                         | Dev server on this laptop / on the Wi-Fi network                |
| `pnpm db:start` · `db:stop` · `db:reset` · `db:env` | Local Supabase; `db:env` rewrites `.env.local`                  |
| `pnpm test`                                         | Unit tests                                                      |
| `pnpm e2e`                                          | Browser tests on all device profiles (`pnpm e2e:install` first) |
| `pnpm check`                                        | Lint, types, formatting, unit tests                             |
| `pnpm build`                                        | Production build                                                |

## Local tools

- Mailpit (test emails): http://127.0.0.1:55324
- Supabase Studio (database): http://127.0.0.1:55323

## Docs

[Architecture](docs/ARCHITECTURE.md) · [Decisions](docs/DECISIONS.md) · [Design](docs/DESIGN.md) · [Testing](docs/TESTING.md)
