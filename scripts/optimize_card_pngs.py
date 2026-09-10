"""Issue #6 — Optimize the bundled card PNGs.

The OpenDecks PNGs are 1500x2100 (~15 MB total) but render only ~52 px wide.
This resizes every card in frontend/public/cards (faces + back) to 300x420
(preserving the 5:7 aspect ratio) using high-quality Lanczos resampling and
PNG optimization, drastically reducing the shipped size while keeping the
exact same artwork, filenames and PNG format.

Usage: python3 scripts/optimize_card_pngs.py
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

CARDS_DIR = Path(__file__).resolve().parents[1] / "frontend" / "public" / "cards"
TARGET_W, TARGET_H = 300, 420


def optimize() -> int:
    changed = 0
    total_before = 0
    total_after = 0
    for path in sorted(CARDS_DIR.glob("*.png")):
        with Image.open(path) as im:
            total_before += path.stat().st_size
            if im.size != (TARGET_W, TARGET_H):
                im = im.resize((TARGET_W, TARGET_H), Image.LANCZOS)
            im = im.convert("RGBA")
            im.save(path, "PNG", optimize=True)
            total_after += path.stat().st_size
            changed += 1
            print(f"{path.name}: resized/saved")
    print(f"done: {changed} files, {total_before//1024}KB -> {total_after//1024}KB")
    return changed


if __name__ == "__main__":
    optimize()
