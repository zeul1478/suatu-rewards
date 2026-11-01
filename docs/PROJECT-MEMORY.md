# Project memory: Suatu Rewards

Saved 2026-11-01 from the old laptop's Claude memory. No secrets here.

## Pick up on a new computer

1. Install Claude Code, then `gh auth login` as `zeul1478`.
2. `gh repo clone zeul1478/suatu-rewards`, open Claude Code in that folder, say: "Continue project Suatu Rewards. Read docs/PROJECT-MEMORY.md and save it to your memory."
3. Setup is in README.md ("Start from a clean clone"). `pnpm db:start` recreates `.env.local`; `pnpm dev:cert` recreates `certs/` (needs mkcert).

## About the user

- Not a developer: plain English, step-by-step "open this, tap that", short answers. Tests on two iPhones over Wi-Fi (one counter with 0000/0000, one customer) plus an Android.
- In setup work: do everything possible yourself; say only when it is their turn and exactly what to do. Secrets go only into dashboards or Terminal, never chat.

## Rules

- Scope: only build this app here. Do not read ~/Desktop/Project X (behappy marketing site) or plan pricing, selling, multi-store branding or billing.
- Branding comes from `src/brands/<slug>.ts`, assets copied by `pnpm brand:sync`. Originals in `brand/` are never moved or edited. Code must stay reusable for other stores.
- behappy is the user's company that makes these apps; Suatu is a client store (see D85-ish notes in docs/DECISIONS.md for the footer line).
- Testing: `pnpm test:all` runs locally in the background; GitHub CI runs quick checks only because Actions minutes ran low (2,000 free a month, a full run costs about 200). Heavy CI only by hand, with the user's OK.
- Pushing: plain `git push` can hang on the Mac keychain. Use `git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin <branch>`.

## State on 2026-11-01

- PRs #1, #6, #7 merged into main; none open. All work is on main.
- The user chose to merge without the full test run. PR #7 (nodemailer, react updates) had a failed iPhone 15 Pro browser test, not investigated. Check this first.
- main is not really protected: GitHub refuses protection on this private free plan, despite what README says.
- Cloud setup was under way on 2026-10-31: the laptop was linked to Supabase project `suatu-rewards` (ref `suzxrvdvdlpxokthibzu`) and Vercel was being set up. docs/DEPLOY.md still says nothing is deployed, so check what is really live, and whether the newest migrations reached the cloud.
- History and reasons: docs/DECISIONS.md (latest D87). Also docs/ARCHITECTURE.md, DESIGN.md, TESTING.md, DEPLOY.md, MVP_SPEC.md.
