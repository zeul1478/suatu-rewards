"""Generate Suatu "Road" (Direction C) brand SVGs with outlined text."""
import math, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

FONTS = "node_modules/@fontsource"
OUT = "out/svg"
os.makedirs(OUT, exist_ok=True)

FOREST, GREEN, GAUGE, LIME, MIST, MIST2 = "#07231A", "#1E7A4F", "#3FBF7F", "#C6F06A", "#EAF4EE", "#9DB8AA"

SG = TTFont(f"{FONTS}/space-grotesk/files/space-grotesk-latin-700-normal.woff")
INTER = TTFont(f"{FONTS}/inter/files/inter-latin-500-normal.woff")
CAP, STEM = 700, 132  # Space Grotesk Bold units


def glyph_path(font, ch, scale, x, baseline):
    gs = font.getGlyphSet(); g = font.getBestCmap()[ord(ch)]
    pen = SVGPathPen(gs)
    gs[g].draw(TransformPen(pen, (scale, 0, 0, -scale, x, baseline)))
    return pen.getCommands(), font["hmtx"][g][0] * scale


def road_a(x, baseline, scale, lane_color, dashes=True):
    """Road 'A': two legs meeting at the apex, open bottom, lane line down the middle."""
    w, H, t = (616 - 18) * scale, CAP * scale, 178 * scale
    x0, top = x + 18 * scale, baseline - H
    th = math.atan2(H, w / 2)
    dx, dy = t / math.sin(th), t / math.cos(th)
    body = (f"M{x0:.2f} {baseline:.2f}L{x0 + w/2:.2f} {top:.2f}L{x0 + w:.2f} {baseline:.2f}"
            f"L{x0 + w - dx:.2f} {baseline:.2f}L{x0 + w/2:.2f} {top + dy:.2f}L{x0 + dx:.2f} {baseline:.2f}Z")
    cx, lw = x0 + w / 2, max(t * 0.2, 1.2)
    inner_top = top + dy
    start = inner_top + (baseline - inner_top) * 0.2
    avail = baseline - start
    lane = []
    if dashes == "none":
        pass
    elif dashes:
        n, gr = 2, 0.45
        seg = avail / (n + (n - 1) * gr)
        for i in range(n):
            y = start + i * seg * (1 + gr)
            lane.append(f'<rect x="{cx - lw/2:.2f}" y="{y:.2f}" width="{lw:.2f}" height="{seg:.2f}" fill="{lane_color}"/>')
    else:
        lane.append(f'<rect x="{cx - lw/2:.2f}" y="{start:.2f}" width="{lw:.2f}" height="{avail:.2f}" fill="{lane_color}"/>')
    return body, "".join(lane), 634 * scale


def wordmark(size, x=0, baseline=None, tracking=-0.02):
    """Returns (letters_path_d, a_body_d, a_lane_svg_fn, width) for 'SUATU' at font-size `size`."""
    s = size / 1000
    baseline = baseline if baseline is not None else CAP * s
    d, cur = [], x
    a_parts = None
    for ch in "SUATU":
        if ch == "A":
            a_parts = (cur, baseline, s)
            adv = 634 * s
        else:
            p, adv = glyph_path(SG, ch, s, cur, baseline)
            d.append(p)
        cur += adv + tracking * size
    width = cur - tracking * size - x
    return " ".join(d), a_parts, width


def text_path(font, text, size, x, baseline, tracking=0.0):
    s = size / font["head"].unitsPerEm
    d, cur = [], x
    for ch in text:
        if ch == " ":
            cur += font["hmtx"][font.getBestCmap()[32]][0] * s + tracking * size
            continue
        p, adv = glyph_path(font, ch, s, cur, baseline)
        d.append(p); cur += adv + tracking * size
    return " ".join(d), cur - tracking * size - x


def svg(w, h, body, label="Suatu", bg=None, rx=0):
    bgr = f'<rect width="{w}" height="{h}" rx="{rx}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" '
            f'role="img" aria-label="{label}">{bgr}{body}</svg>\n')


def save(name, content):
    open(f"{OUT}/{name}", "w").write(content)


# ---------- Wordmarks ----------
def wordmark_svg(letter_color, lane_color, size=200, pad=0):
    s0 = size / 1000
    d, (ax, ab, s), width = wordmark(size, x=pad, baseline=pad + 720 * s0)
    a_body, lane, _ = road_a(ax, ab, s, lane_color)
    H = ab + 20 * s0 + pad
    W = width + 2 * pad
    body = f'<path d="{d} {a_body}" fill="{letter_color}"/>{lane}'
    return W, H, body

for name, lc, ln in [("wordmark-dark.svg", MIST, LIME), ("wordmark-light.svg", FOREST, GREEN),
                     ("wordmark-white.svg", "#FFFFFF", "#FFFFFF"), ("wordmark-black.svg", "#000000", "#000000")]:
    W, H, body = wordmark_svg(lc, ln)
    save(name, svg(round(W, 1), round(H, 1), body))

# ---------- Stacked lockup with tagline ----------
def lockup(letter, lane, tag):
    size = 200
    d, (ax, ab, s), width = wordmark(size, x=0, baseline=140 + 0)
    a_body, lane_svg, _ = road_a(ax, ab, s, lane)
    tag_d, tag_w = text_path(INTER, "FUEL · SHOP · REWARDS", 30, 0, 0, tracking=0.24)
    tx = (width - tag_w) / 2
    tag_d, _ = text_path(INTER, "FUEL · SHOP · REWARDS", 30, tx, ab + 74, tracking=0.24)
    W, H = width, ab + 84
    return W, H, f'<path d="{d} {a_body}" fill="{letter}"/>{lane_svg}<path d="{tag_d}" fill="{tag}"/>'

W, H, b = lockup(MIST, LIME, GAUGE); save("lockup-dark.svg", svg(round(W, 1), round(H, 1), b))
W, H, b = lockup(FOREST, GREEN, GREEN); save("lockup-light.svg", svg(round(W, 1), round(H, 1), b))

# ---------- Road mark (the A alone) ----------
def mark_body(box, letter, lane, fill_ratio=0.62, dashes=True):
    s = (box * fill_ratio) / CAP
    w = (616 - 18) * s
    x = (box - w) / 2 - 18 * s
    baseline = (box + CAP * s) / 2
    a_body, lane_svg, _ = road_a(x, baseline, s, lane, dashes)
    return f'<path d="{a_body}" fill="{letter}"/>{lane_svg}'

save("mark-dark.svg", svg(160, 160, mark_body(160, MIST, LIME, 0.9)))
save("mark-light.svg", svg(160, 160, mark_body(160, FOREST, GREEN, 0.9)))
# App icon: full-bleed square (iOS/Android apply their own rounding)
save("app-icon.svg", svg(1024, 1024, mark_body(1024, MIST, LIME, 0.56), bg=GREEN))
# Maskable icon: content inside the 80% safe zone
save("app-icon-maskable.svg", svg(1024, 1024, mark_body(1024, MIST, LIME, 0.42), bg=GREEN))
# Favicon: rounded tile, single lane bar so it survives 16px
save("favicon.svg", svg(64, 64, mark_body(64, MIST, LIME, 0.74, dashes="none"), bg=GREEN, rx=14))

# ---------- Social / link preview ----------
size = 220
d, (ax, ab, s), width = wordmark(size, x=0, baseline=0)
x0 = (1200 - width) / 2
d, (ax, ab, s), width = wordmark(size, x=x0, baseline=330)
a_body, lane_svg, _ = road_a(ax, ab, s, LIME)
tag_d, tag_w = text_path(INTER, "FUEL · SHOP · REWARDS", 30, 0, 0, tracking=0.24)
tag_d, _ = text_path(INTER, "FUEL · SHOP · REWARDS", 30, (1200 - tag_w) / 2, 420, tracking=0.24)
stripe = "".join(f'<rect x="{x}" y="560" width="70" height="8" fill="{LIME}" opacity="0.5"/>' for x in range(40, 1200, 130))
save("og-image.svg", svg(1200, 630, f'<path d="{d} {a_body}" fill="{MIST}"/>{lane_svg}<path d="{tag_d}" fill="{GAUGE}"/>{stripe}', bg=FOREST))
print("ok", sorted(os.listdir(OUT)))
