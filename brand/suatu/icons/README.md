# Suatu UI icons (45)

Custom icon set drawn for the Suatu app, in the same angular style as the "Road" logo: 24 px grid, 2 px stroke, square ends, sharp corners. Each icon has **two tones**: the main lines use `currentColor` (the text color), and one small detail (lane dashes, gauge needle, keyhole, the "A" in alert) uses the **accent color**.

- `svg/<name>.svg`: one file per icon
- `sprite.svg`: all icons as `<symbol id="i-<name>">` (one request)
- `icons.json`: list of names
- `preview.png`: every icon on dark and light

## How the colors work
The accent parts have `stroke="var(--icon-accent, currentColor)"`. So:
- Dark customer app: `color: #EAF4EE; --icon-accent: #C6F06A` (signal lime)
- Light staff screen: `color: #07231A; --icon-accent: #1E7A4F` (Suatu green)
- No variable set: the icon is one color (safe default)

CSS variables only reach the SVG when the icon is **inline** (React component) or used through the **sprite** (`<svg><use href="/icons/sprite.svg#i-gauge"/></svg>`). Do **not** use `<img src="...svg">` for these; that loses both colors.

## Rules
- Sizes: 20 px (dense lists), 24 px (default), 28 px (bottom nav), 32 px+ (big staff buttons). Keep the 2 px stroke (use `vector-effect` or scale the stroke) so the weight matches across sizes.
- Decorative icons: `aria-hidden="true"`. Icon-only buttons need an `aria-label`.
- Bottom nav: inactive = `--icon-accent: currentColor` at 60% opacity; active = full color + lime accent.
- Don't mix with another icon library.

## Names
account, add-visit, alert, calendar, chart, check, chevron-left, chevron-right, close, coffee, download, edit, export, eye, eye-off, fuel, gauge, gift, history, home, info, install, keypad, lock, logout, mail, menu, minus, offer, phone, plus, print, qr, rewards, scan, search, settings, staff, station, ticket, timer, trash, undo, user, users

## Where they're used
| Screen | Icons |
|---|---|
| Customer bottom nav | home, rewards, history, account |
| Customer home | gauge (points), coffee (reward), offer (specials), station (address), timer (redeem countdown) |
| Customer account | edit, lock, eye / eye-off (password), mail, phone, download (my data), trash (delete), logout, install (add to home screen) |
| Staff screen | add-visit, keypad / ticket (redeem code), undo (void), user, qr, scan, logout |
| Owner dashboard | chart, users, staff, offer, gift, settings, export (CSV), print (counter sign), calendar, search |
| Everywhere | check, close, chevron-left/right, info, alert, plus, minus, menu |
