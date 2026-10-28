# Design direction — Suatu Rewards

Written before any product screens, as spec §9 requires. Tokens live in `src/styles/tokens.css`; glass buttons in `src/styles/glass.css`.

## The idea

**A well-kept roadside station at dusk.** Deep forest-green ground, the clear lettering of highway signs, numbers that read like the fuel-price board at the kerb, and a single lime accent used the way a station uses its brightest light: rarely, and only where you should look.

Calm, uncluttered, fast. It's a tool people use at a counter or a pump for 5 seconds, not a website to admire.

## What makes it ours (signature details)

| Detail                  | Where                                 | How                                                                                                                   |
| ----------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Price-sign numbers**  | Points balance, codes, credentials    | Barlow Condensed 600, `tabular-nums`, lime on deep green; individual tiles (`SignDigits`) for short codes             |
| **Fuel-gauge progress** | Customer home (M3/M4)                 | Horizontal gauge with tick marks at each reward step, fills with `--green-400`; 300 ms fill, off under reduced motion |
| **Lane-stripe divider** | Under headers, between major sections | Dashed `--stripe` line, like a road's centre marking (`.lane-stripe`)                                                 |
| **Glass buttons**       | Primary actions, bottom nav, sheets   | Translucent fill, thin bright border, blur behind (§9)                                                                |

## Typography

- **Barlow Condensed** (500/600/700): headings, labels in caps with wide tracking, every number.
- **Barlow** (400/500/600): body text.

Why not Space Grotesk + Inter (the spec's example)? Inter is the default font of AI-generated templates, which is exactly the look §9 rules out. Barlow is based on California highway signage, so it's on-theme for a gas station, and its condensed cut fits big numbers on a 320 px screen. Both self-hosted through `next/font`, `latin-ext` included for Romanian diacritics later.

Sizes: base 16 px; inputs never below 16 px (stops iOS zoom). Headings scale 20 → 36–48 px.

## Colour

The §9 palette is kept as the identity. Semantic tokens (`--surface-page`, `--text-primary`, `--brand`, …) sit on top so the light theme is a token swap.

| Theme          | Used by                                                                    | Background     | Text           |
| -------------- | -------------------------------------------------------------------------- | -------------- | -------------- |
| Dark (default) | Customer app, dev home                                                     | `--forest-950` | `--mist-100`   |
| Light          | Staff screen in bright shops; customer app when the phone is in light mode | `--mist-100`   | `--forest-950` |

Rules:

- **Lime (`--lime-300`) is the one accent.** Points number, "unlocked" moments, focus ring on dark. Nowhere else.
- Green-400 for brand marks and progress fill. Green-600 is too dark for text on dark backgrounds (3.1:1), so it's only used as a fill or on the light theme.
- Amber = warnings only, red = errors only.

### Contrast checks (WCAG 2.2 AA)

Measured when the tokens were written:

| Pair                                                 | Ratio     | Needed |
| ---------------------------------------------------- | --------- | ------ |
| mist-100 on forest-950                               | 14.8      | 4.5    |
| mist-400 on forest-950                               | 7.8       | 4.5    |
| lime-300 on forest-950                               | 12.7      | 4.5    |
| green-400 on forest-950                              | 7.1       | 4.5    |
| Text on primary glass fill                           | 10.5      | 4.5    |
| Primary glass border vs background                   | 3.6       | 3.0    |
| **Secondary glass border at the spec's 0.18**        | **1.7 ✗** | 3.0    |
| Secondary glass border at 0.40 (used)                | 3.5       | 3.0    |
| Light theme: forest-950 on mist-100                  | 14.8      | 4.5    |
| Light theme: secondary text `#3d5c4e`                | 6.6       | 4.5    |
| Light theme: error red `#b23a28` (spec red is 3.1 ✗) | 5.3       | 4.5    |
| Light theme: warning `#8a5a00`                       | 5.3       | 4.5    |

Changes from §9 because of these: secondary glass border 0.18 → 0.40; light theme uses darker red and amber, and a solid green-600 primary border. axe runs on every screen in every device project to keep it that way.

## Glass buttons

- Primary: `rgba(63,191,127,.18)` fill, `rgba(198,240,106,.45)` border, `blur(14px) saturate(140%)`, inset top highlight. Pressed: fill .28 + `scale(.98)`.
- Secondary: faint mist fill, 0.40 mist border.
- No `backdrop-filter` support → solid `--forest-800`, same border.
- Minimum height 44 px.
- **Never** on long scrolling lists. Blur costs frames on older Androids.

## Layout

- Left-aligned, real hierarchy. No centred hero, no grid of identical floating cards.
- Content lines up on one column on phones; on tablets/desktop a 2-column grid where it helps.
- 16 px side gutter, plus `env(safe-area-inset-*)` for notches and the home indicator.
- `100dvh`, never `100vh`.

## Motion

Only `transform` and `opacity`. 120 ms for presses, 300 ms for the points fill. Everything collapses to instant under `prefers-reduced-motion`.

## Never

Purple/blue gradients, emoji as icons, ✨, stock illustrations, big drop shadows everywhere, lorem ipsum, invented stats or testimonials.
