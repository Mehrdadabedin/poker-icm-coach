"""Android launcher icons from the site's favicon chip (plan 083).

Usage (from the repo root):
  uv run --project backend --with pillow python scripts/android_icons.py

Writes every mipmap size of ic_launcher, ic_launcher_round and the adaptive
icon's foreground. The chip fills the icon: 70 of the adaptive icon's 108 dp
(the launcher shows 72), on the dark background of apple-touch-icon.png, so
it looks the same in a circle, a squircle or a square. The 192 px source is
enough: a launcher draws the icon at about 48 dp, under 200 px on any phone.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "frontend/public/icon-192.png"
RES = ROOT / "frontend/android/app/src/main/res"
BACKGROUND = (7, 8, 10, 255)  # apple-touch-icon.png's background
DENSITY = {"mdpi": 1.0, "hdpi": 1.5, "xhdpi": 2.0, "xxhdpi": 3.0, "xxxhdpi": 4.0}
CHIP_IN_ADAPTIVE = 70 / 108
CHIP_IN_LEGACY = 0.92


def chip(size: int) -> Image.Image:
    return Image.open(SOURCE).convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)


def centred(canvas: Image.Image, art: Image.Image) -> Image.Image:
    left = (canvas.width - art.width) // 2
    canvas.alpha_composite(art, (left, (canvas.height - art.height) // 2))
    return canvas


def legacy(size: int, round_mask: bool) -> Image.Image:
    """The pre-Android 8 icon: the chip on a dark square or circle."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shape = ImageDraw.Draw(canvas)
    if round_mask:
        shape.ellipse((0, 0, size - 1, size - 1), fill=BACKGROUND)
    else:
        shape.rounded_rectangle((0, 0, size - 1, size - 1), radius=size // 6, fill=BACKGROUND)
    return centred(canvas, chip(round(size * CHIP_IN_LEGACY)))


def main() -> None:
    for name, scale in DENSITY.items():
        folder = RES / f"mipmap-{name}"
        legacy(round(48 * scale), False).save(folder / "ic_launcher.png")
        legacy(round(48 * scale), True).save(folder / "ic_launcher_round.png")
        side = round(108 * scale)
        foreground = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        centred(foreground, chip(round(side * CHIP_IN_ADAPTIVE))).save(folder / "ic_launcher_foreground.png")
        print(f"mipmap-{name}: {round(48 * scale)} px icon, {side} px foreground")
    colour = RES / "values/ic_launcher_background.xml"
    colour.write_text(colour.read_text().replace("#FFFFFF", "#07080A"))


if __name__ == "__main__":
    main()
