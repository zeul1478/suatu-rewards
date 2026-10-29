## What changes

<!-- One or two sentences, in plain words. -->

## How to check it

<!-- What to open and tap, on laptop and phone. -->

## Before merging

- [ ] CI is green (the **CI passed** check)
- [ ] No keys, passwords or real customer data (the commit hook and CI check this too)
- [ ] New migration? Never edit one that's already merged; `pnpm db:types` committed
- [ ] Docs updated if behaviour changed (`README.md`, `docs/`, `docs/DECISIONS.md`)
- [ ] Screens changed? Tried on a phone; `pnpm e2e:visual` on the laptop (CI doesn't run screenshots)
