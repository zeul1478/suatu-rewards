# Architecture

One Next.js app, one Postgres database (Supabase, local in Docker). Source of truth for scope: `MVP_SPEC.md`.

```
 Phone / tablet / laptop browser
            │  (HTML, server actions, /api/status poll every 3 s)
            ▼
   Next.js 16 (App Router, server components)      ← the only thing browsers talk to
            │  @supabase/ssr + secret key, server-side only
            ▼
   Supabase (local Docker): Postgres + Auth + Storage + Mailpit
            └─ points engine = Postgres functions, one transaction, row locks
```

Why the browser never talks to Supabase directly: on a phone, `127.0.0.1:55321` points at the phone itself. Keeping all data access on the server also keeps keys out of the browser.

## Areas

| Area                                           | URL                      | Built in   |
| ---------------------------------------------- | ------------------------ | ---------- |
| Dev home (development only, 404 in production) | `/`                      | M1         |
| Customer app                                   | `/s/[storeSlug]`         | M2–M5      |
| Staff screen                                   | `/staff/[storeSlug]`     | M2, M3, M6 |
| Owner dashboard (managers)                     | `/dashboard/[storeSlug]` | M7         |
| Admin                                          | `/admin`                 | M8         |
| Legal pages                                    | `/legal/…`               | M2         |

Every store-scoped URL is built with `storeUrl(slug, path, area)` (`src/lib/storeUrl.ts`), so moving to subdomains later only needs middleware.

## Folders

```
src/
  app/          routes only — thin pages that call server/ and render components/
  components/   ui/ (primitives) + one folder per feature
  server/       business logic: points, rewards, customers, auth, staff …   (from M2)
  lib/          small pure helpers: storeUrl, phone, password, time …
  styles/       tokens.css (design tokens), glass.css
supabase/       config.toml, migrations/, seed.sql
scripts/        dev-lan, write-env, lan-addresses (Node, no build step)
tests/          unit/ (Vitest), db/ (Vitest against local DB), e2e/ + a11y/ (Playwright)
```

Rules: no business logic in React components; small files; data access only from `server/`.

## Accounts and sessions (M2)

| Who                   | Logs in with         | Stored                                                                        | Session                                                                                                              |
| --------------------- | -------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Customer              | phone + password     | Supabase Auth (bcrypt of a SHA-256 pre-hash, DECISIONS D16) + `customers` row | Supabase session in httpOnly cookies (`suatu-auth`), refreshed by `src/proxy.ts`, checked with Auth on every request |
| Staff / owner / admin | user name + password | `staff` (argon2id)                                                            | random token in httpOnly cookie `suatu-staff`, SHA-256 in `staff_sessions`; one store; 15 min idle, 12 h max         |

- Sign-up: Auth user → `register_customer()` (one transaction: claims an `unclaimed` customer or creates one, joins the store, writes 5 consent events, audits) → sign-in → verification email. If the database step fails, the Auth user is deleted again.
- Throttling: `auth_throttles` + `auth_throttle_*()` functions (per phone, per staff account, per IP).
- Emails: `EmailSender` → SMTP → Mailpit locally.
- Legal: Markdown in `/legal`, rendered by `src/server/legal/documents.ts`; versions go into consent records.

## Points engine (M3)

```
Counter tablet ── addVisitAction ──► earn_points(store, phone E.164, staff, idempotency key)
                                       ├─ same key seen? → return the first result (duplicate)
                                       ├─ find or create customer ('unclaimed' for new numbers)
                                       ├─ lock store_customers row (FOR UPDATE)
                                       ├─ insert ledger row (+5), update cached balance
                                       └─ audit
Customer phone ── Redeem ──► create_redemption → 6-digit code, 5 min (no points move yet)
Counter tablet ── code ────► complete_redemption → ledger row (−cost), balance, status completed
Customer phone ── every 3 s ─► GET /api/s/suatu/status → balance, progress, pending code, redeemed?
```

- `store_customers.points_balance` is a cache; the ledger (`point_transactions`, append-only, unique `idempotency_key`) is the truth. Tests check they always agree.
- Progress maths lives once in `src/lib/progress.ts` and serves both screens.
- Codes: unique per store while pending; throttled per staff member.

## Owner dashboard (M7)

```
/dashboard/<store>/login ── staffLoginAction(area "dashboard") ── managers only, same staff session
/dashboard/<store>/(manager)/…  layout: requireManager() → header, section nav, idle logout
   overview   dashboard_overview()           customers  listCustomers / getCustomerDetail (masked)
   adjust     adjust_points() (note, ≥ 0)    release    anonymize_customer + delete Auth login
   rewards    rewards table                  offers     offers table + private "offer-images" bucket
   staff      staffAdmin.ts (argon2id, temporary passwords, sessions revoked)
   settings   stores.points_per_visit        sign       QR → /s/<store>/signup (printable)
/api/dashboard/<store>/customers.csv   managers only, masked, audited
/api/s/<store>/offers/<id>/image       offer picture, served by the app (phones can't reach storage)
```

Every dashboard page and action starts with `requireManager(storeSlug)` (`src/server/dashboard/access.ts`). Phones and emails are masked with `maskPhone` / `maskEmail` before they leave the server. Every change is written to `audit_log`.

## Branding (M4)

```
brand/<slug>/ (owner's originals) ──pnpm brand:sync──► public/stores/<slug>/   (served files)
brand/<slug>/icons/svg ──pnpm icons──► src/components/ui/icons/iconPaths.ts (typed <Icon>)
src/brands/<slug>.ts ──brandThemeStyle()──► --brand-dark-* / --brand-light-* / --brand-font-*
                                             └► src/styles/tokens.css semantic tokens ► components
```

Store layouts set `data-theme` (customer `system`, staff `light`) and the brand variables; `brandMetadata()` sets favicon, apple-touch icon and OG image; `/s/<slug>/manifest.webmanifest` lists the app icons.

## Local ports

| Service                       | URL                                                                         |
| ----------------------------- | --------------------------------------------------------------------------- |
| App                           | http://localhost:3000 (phone: `http://<laptop-ip>:3000` via `pnpm dev:lan`) |
| Supabase API                  | http://127.0.0.1:55321                                                      |
| Postgres                      | 127.0.0.1:55322                                                             |
| Supabase Studio               | http://127.0.0.1:55323                                                      |
| Mailpit (test email inbox)    | http://127.0.0.1:55324                                                      |
| Mailpit SMTP (app sends here) | 127.0.0.1:55325                                                             |

Ports are 553xx, not Supabase's default 543xx (see DECISIONS D8).

## Environment

`.env.local` (git-ignored) is generated by `pnpm db:env` from the running local Supabase. `.env.example` lists every variable. No variable is `NEXT_PUBLIC_`: nothing secret or Supabase-related reaches the browser.
