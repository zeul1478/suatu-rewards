"""Suatu UI icon set — 24px grid, 2px stroke, square caps + miter joins (matches the angular "Road" logo).
Main strokes use currentColor; the accent detail (lane dashes, needle, key detail) uses var(--icon-accent)."""
import os, json

OUT = "icons"; os.makedirs(f"{OUT}/svg", exist_ok=True)

# name: (main elements, accent elements)  — elements are raw SVG tags without stroke attrs
P = lambda d: f'<path d="{d}"/>'
C = lambda x, y, r: f'<circle cx="{x}" cy="{y}" r="{r}"/>'
R = lambda x, y, w, h: f'<rect x="{x}" y="{y}" width="{w}" height="{h}"/>'

ICONS = {
  # --- customer app navigation ---
  "home":        ([P("M3 11 12 4l9 7"), P("M5 9.5V20h14V9.5")], [P("M10 20v-5h4v5")]),
  "rewards":     ([R(4, 11, 16, 9), R(3, 7, 18, 4), P("M12 7c-1.5-3.5-5.5-3.5-5 0M12 7c1.5-3.5 5.5-3.5 5 0")], [P("M12 7v13")]),
  "history":     ([P("M4.1 9A8.5 8.5 0 1 1 3.5 12"), P("M3 4.5V9h4.5")], [P("M12 7.5V12l3 2")]),
  "account":     ([P("M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7")], [C(12, 8, 4)]),
  # --- loyalty ---
  "gauge":       ([P("M4.6 17.5A8.5 8.5 0 1 1 19.4 17.5")], [P("M12 14l4-5"), C(12, 14, 1)]),
  "coffee":      ([P("M4 9h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z"), P("M16 11h2a2.5 2.5 0 0 1 0 5h-2")], [P("M8 3v3M12 3v3")]),
  "fuel":        ([P("M4 21V4h9v17"), P("M2.5 21h12"), P("M13 9h2.5l2.5 3v6a1.5 1.5 0 0 0 3 0V8l-2.5-2.5")], [R(6.5, 7, 4, 3)]),
  "offer":       ([P("M3 12V3h9l9 9-9 9Z")], [C(7.5, 7.5, 1.2)]),
  "gift":        ([R(4, 11, 16, 9), R(3, 7, 18, 4)], [P("M12 7v13")]),
  "ticket":      ([P("M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4Z")], [P("M15 7v2M15 11.5v1M15 15v2")]),
  "timer":       ([C(12, 13, 8), P("M9 2h6")], [P("M12 13l3-3")]),
  "station":     ([P("M12 22s7-6.4 7-12a7 7 0 0 0-14 0c0 5.6 7 12 7 12Z")], [P("M9.5 13 12 7l2.5 6")]),
  # --- staff / counter ---
  "add-visit":   ([C(12, 12, 9)], [P("M12 7.5v9M7.5 12h9")]),
  "plus":        ([P("M12 5v14M5 12h14")], []),
  "minus":       ([P("M5 12h14")], []),
  "keypad":      ([R(4, 3, 3, 3), R(10.5, 3, 3, 3), R(17, 3, 3, 3), R(4, 10.5, 3, 3), R(17, 10.5, 3, 3), R(4, 18, 3, 3), R(10.5, 18, 3, 3), R(17, 18, 3, 3)], [R(10.5, 10.5, 3, 3)]),
  "qr":          ([R(3, 3, 7, 7), R(14, 3, 7, 7), R(3, 14, 7, 7)], [R(5.5, 5.5, 2, 2), R(16.5, 5.5, 2, 2), R(5.5, 16.5, 2, 2), P("M14 14h3v3h-3zM18 18h3v3h-3z")]),
  "scan":        ([P("M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5")], [P("M6 12h12")]),
  "undo":        ([P("M9 5 4 10l5 5"), P("M4 10h10a5 5 0 0 1 0 10h-4")], []),
  "user":        ([C(12, 8, 4), P("M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7")], []),
  "users":       ([C(9, 8, 3.5), P("M2 20c0-3.9 3.1-6 7-6s7 2.1 7 6")], [P("M15.5 4.6a3.5 3.5 0 0 1 0 6.8M18 14.4c2.4.7 4 2.6 4 5.6")]),
  "staff":       ([R(4, 4, 16, 17), P("M9 2.5h6v3H9z")], [C(12, 11, 2.2), P("M8 17.5c.8-1.8 2.2-2.5 4-2.5s3.2.7 4 2.5")]),
  "search":      ([C(10.5, 10.5, 6.5)], [P("M15.5 15.5 21 21")]),
  "settings":    ([P("M4 7h9M19 7h1M4 17h3M13 17h7")], [R(13, 5, 4, 4), R(7, 15, 4, 4)]),
  "chart":       ([P("M3 21h18"), P("M6 18v-6M18 18v-8")], [P("M12 18V5")]),
  "export":      ([P("M14 3H5v18h14V8Z"), P("M14 3v5h5")], [P("M9 14h8M14 11l3 3-3 3")]),
  "download":    ([P("M4 21h16")], [P("M12 3v12M7 10l5 5 5-5")]),
  "print":       ([P("M7 9V3h10v6"), P("M7 17H3V9h18v8h-4"), R(7, 14, 10, 7)], [P("M17 12h.5")]),
  "calendar":    ([R(4, 5, 16, 16), P("M4 10h16M8 3v4M16 3v4")], [R(8, 13.5, 3, 3)]),
  # --- account / forms ---
  "lock":        ([R(5, 11, 14, 10), P("M8 11V7a4 4 0 0 1 8 0v4")], [P("M12 15v2.5")]),
  "eye":         ([P("M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z")], [C(12, 12, 3)]),
  "eye-off":     ([P("M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"), P("M3 3l18 18")], [P("M9.9 9.9a3 3 0 0 0 4.2 4.2")]),
  "mail":        ([R(3, 5, 18, 14)], [P("M3 6.5l9 6.5 9-6.5")]),
  "phone":       ([R(7, 2, 10, 20)], [P("M11 18.5h2")]),
  "edit":        ([P("M4 20h4L19 9l-4-4L4 16Z")], [P("M13 7l4 4")]),
  "trash":       ([P("M4 7h16M9 7V4h6v3"), P("M6 7l1 14h10l1-14")], [P("M10 11v6M14 11v6")]),
  "logout":      ([P("M10 4H4v16h6")], [P("M9 12h11M16 8l4 4-4 4")]),
  "install":     ([R(6, 2, 12, 20)], [P("M12 8.5v6M9 11.5h6")]),
  "menu":        ([P("M4 7h16M4 12h16")], [P("M4 17h10")]),
  # --- feedback ---
  "check":       ([P("M4 12.5l5 5L20 6.5")], []),
  "close":       ([P("M5 5l14 14M19 5 5 19")], []),
  "chevron-right": ([P("M9 5l7 7-7 7")], []),
  "chevron-left":  ([P("M15 5l-7 7 7 7")], []),
  "info":        ([C(12, 12, 9), P("M12 11v6")], [P("M12 7.5v.5")]),
  "alert":       ([P("M12 3 22 20H2Z")], [P("M12 9.5v4M12 16v1")]),
}

ATTR = 'fill="none" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"'
ACC = 'stroke="var(--icon-accent, currentColor)" data-accent="true"'


def icon_svg(name, main, acc):
    a = f'<g {ACC}>{"".join(acc)}</g>' if acc else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" {ATTR} '
            f'stroke="currentColor" aria-hidden="true" focusable="false"><g>{"".join(main)}</g>{a}</svg>\n')


sprite = ['<svg xmlns="http://www.w3.org/2000/svg" style="display:none">']
for n, (m, a) in ICONS.items():
    open(f"{OUT}/svg/{n}.svg", "w").write(icon_svg(n, m, a))
    acc = f'<g {ACC}>{"".join(a)}</g>' if a else ""
    sprite.append(f'<symbol id="i-{n}" viewBox="0 0 24 24" {ATTR} stroke="currentColor"><g>{"".join(m)}</g>{acc}</symbol>')
sprite.append("</svg>")
open(f"{OUT}/sprite.svg", "w").write("\n".join(sprite) + "\n")
json.dump(sorted(ICONS), open(f"{OUT}/icons.json", "w"), indent=1)
print(len(ICONS), "icons")
