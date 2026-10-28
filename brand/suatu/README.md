# Suatu brand kit — "The Road" (Direction C)

The wordmark **SUATU** where the **A is a road** with a lime lane line. Letters are Space Grotesk Bold, already converted to outlines in every SVG, so the files look identical everywhere with no font installed.

## Colors
| Name | Hex | Use |
|---|---|---|
| Forest | `#07231A` | Dark background, letters on light |
| Suatu green | `#1E7A4F` | App icon tile, lane on light backgrounds |
| Gauge green | `#3FBF7F` | Tagline on dark |
| Signal lime | `#C6F06A` | Lane line on dark — accent only |
| Mist | `#EAF4EE` | Letters on dark, light background |

Fonts in the app: Space Grotesk (headings, numbers), Inter (body). Tagline: "FUEL · SHOP · REWARDS".

## Files → where they go in the Next.js app

| File | Size | Use |
|---|---|---|
| `svg/wordmark-dark.svg` | vector | Customer app header (dark theme), splash/login |
| `svg/wordmark-light.svg` | vector | Staff screen header (light theme), owner dashboard, emails |
| `svg/wordmark-white.svg`, `svg/wordmark-black.svg` | vector | One-color: printed receipts, stickers, signage |
| `svg/lockup-dark.svg`, `svg/lockup-light.svg` | vector | Wordmark + tagline: login/signup screen, printed counter sign |
| `svg/mark-dark.svg`, `svg/mark-light.svg` | vector | The road "A" alone: loading spinner, small badges, bottom nav |
| `svg/app-icon.svg` | 1024² | Master app icon (square, full bleed — phones round the corners) |
| `svg/app-icon-maskable.svg` | 1024² | Master Android maskable icon (logo inside 80% safe zone) |
| `svg/favicon.svg` → `src/app/icon.svg` | vector | Browser tab icon (modern browsers) |
| `png/favicon.ico` → `src/app/favicon.ico` | 16/32/48 | Browser tab icon (older browsers) |
| `png/favicon-16.png`, `-32`, `-48` | px | Extra favicon sizes |
| `png/apple-touch-icon.png` → `src/app/apple-icon.png` | 180² | iPhone/iPad "Add to Home Screen" |
| `png/icon-192.png`, `png/icon-512.png` | px | PWA manifest icons (`purpose: "any"`) |
| `png/icon-maskable-192.png`, `-512.png` | px | PWA manifest icons (`purpose: "maskable"`, Android) |
| `png/og-image.png` → `src/app/opengraph-image.png` | 1200×630 | Link preview in iMessage, WhatsApp, Facebook |
| `png/wordmark-*@2x.png`, `png/lockup-*@2x.png` | 2× | Email templates (many email apps don't show SVG) |

## Manifest snippet (`/s/suatu/manifest.webmanifest`)
```json
{
  "name": "Suatu Rewards",
  "short_name": "Suatu",
  "start_url": "/s/suatu",
  "scope": "/s/suatu",
  "display": "standalone",
  "background_color": "#07231A",
  "theme_color": "#07231A",
  "icons": [
    { "src": "/brand/suatu/png/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/brand/suatu/png/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/brand/suatu/png/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/brand/suatu/png/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
Also set `<meta name="theme-color" content="#07231A">` and `<link rel="apple-touch-icon" href="/brand/suatu/png/apple-touch-icon.png">`.

## Rules
- Lime lane on dark backgrounds only; on light backgrounds the lane is Suatu green.
- Minimum wordmark width: 96 px on screen. Below that, use the road mark.
- Keep clear space around the logo equal to the height of the "A".
- Don't recolor, stretch, add shadows or put the dark wordmark on busy photos.
- Status: concept — name and logo not yet trademark-cleared.

`source/build.py` regenerates every SVG (needs Python + fontTools and the @fontsource fonts).
