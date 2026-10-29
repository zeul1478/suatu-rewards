"""Builds every web file of Suatu's "complex turistic" logo from the original white PNG.

    python3 scripts/suatu-logo.py && pnpm brand:sync

Reads brand/suatu/complex-turistic/COMPLEX TURISTIC SUATU - ALB - LOGO.png (never changed) and
writes brand/suatu/png/complex-turistic/: the logo in white (dark screens) and in Forest green
(light screens), the deer on its own, app icons, favicons and the link-preview image. Only the
colour changes; the artwork is the original's. Needs Pillow (python3 -m pip install pillow).
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ORIGINAL = Path("brand/suatu/complex-turistic/COMPLEX TURISTIC SUATU - ALB - LOGO.png")
OUT = Path("brand/suatu/png/complex-turistic")
FOREST = (7, 35, 26)  # brand colour "Forest", src/brands/suatu.ts
WHITE = (255, 255, 255)
DEER_SEED = (1440, 860)  # a pixel inside the deer's head in the original


def recolour(image: Image.Image, rgb: tuple[int, int, int]) -> Image.Image:
    """Same shape and soft edges, another colour."""
    solid = Image.new("RGBA", image.size, (*rgb, 255))
    solid.putalpha(image.getchannel("A"))
    return solid


def trimmed(image: Image.Image, padding: int) -> Image.Image:
    box = image.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    left, top, right, bottom = box
    return image.crop((left - padding, top - padding, right + padding, bottom + padding))


def fit_height(image: Image.Image, height: int) -> Image.Image:
    width = round(image.width * height / image.height)
    return image.resize((width, height), Image.LANCZOS)


def deer_only(logo: Image.Image) -> Image.Image:
    """The deer is one connected shape, apart from the lettering: keep just that shape."""
    mask = logo.getchannel("A").point(lambda a: 255 if a > 40 else 0)
    ImageDraw.floodfill(mask, DEER_SEED, 128, thresh=0)
    deer_mask = mask.point(lambda v: 255 if v == 128 else 0).filter(ImageFilter.MaxFilter(5))
    deer = logo.copy()
    alpha = Image.composite(logo.getchannel("A"), Image.new("L", logo.size, 0), deer_mask)
    deer.putalpha(alpha)
    return deer


def on_square(mark: Image.Image, size: int, mark_share: float, rgb=FOREST) -> Image.Image:
    """The white deer centred on a Forest square; mark_share = deer height / square."""
    square = Image.new("RGBA", (size, size), (*rgb, 255))
    deer = fit_height(mark, round(size * mark_share))
    square.alpha_composite(deer, ((size - deer.width) // 2, (size - deer.height) // 2))
    return square


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    original = Image.open(ORIGINAL).convert("RGBA")

    # The full logo, 480 px tall: sharp up to 160 px on screen at 3× pixel density.
    logo = fit_height(trimmed(original, padding=24), 480)
    logo.save(OUT / "logo-on-dark.png", optimize=True)
    recolour(logo, FOREST).save(OUT / "logo-on-light.png", optimize=True)

    deer = trimmed(deer_only(original), padding=8)
    mark = fit_height(deer, 320)
    mark.save(OUT / "mark-on-dark.png", optimize=True)
    recolour(mark, FOREST).save(OUT / "mark-on-light.png", optimize=True)

    # App icons: deer on Forest. Maskable icons keep it inside the 80 % safe circle.
    on_square(deer, 512, 0.66).save(OUT / "icon-512.png", optimize=True)
    on_square(deer, 192, 0.66).save(OUT / "icon-192.png", optimize=True)
    on_square(deer, 512, 0.52).save(OUT / "icon-maskable-512.png", optimize=True)
    on_square(deer, 192, 0.52).save(OUT / "icon-maskable-192.png", optimize=True)
    on_square(deer, 180, 0.66).convert("RGB").save(OUT / "apple-touch-icon.png", optimize=True)

    favicon = on_square(deer, 256, 0.84)
    favicon.resize((32, 32), Image.LANCZOS).save(OUT / "favicon-32.png", optimize=True)
    favicon.save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    # Link preview (1200 × 630): the full white logo on Forest.
    preview = Image.new("RGBA", (1200, 630), (*FOREST, 255))
    big = fit_height(logo, 420)
    preview.alpha_composite(big, ((1200 - big.width) // 2, (630 - big.height) // 2))
    preview.convert("RGB").save(OUT / "og-image.png", optimize=True)

    for path in sorted(OUT.iterdir()):
        with Image.open(path) as image:
            print(f"{path}  {image.width}×{image.height}")


if __name__ == "__main__":
    main()
