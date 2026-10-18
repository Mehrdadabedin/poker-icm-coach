"""The logo printed on the poker table (plan 090).

Usage (from the repo root):
  uv run --project backend --with pillow python scripts/felt_logo.py

logo.png is RGB on a near-black background: invisible on the dark headers, a
dark box on the green table. This writes logo-felt.png, the same artwork with
the black made transparent, 840 px wide (the table shows it at most 280 px wide,
on screens up to 3x). Every near-black pixel goes, not only the ones around the
logo: the holes inside letters like B are background too.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "frontend/public/Logo/logo.png"
OUT = ROOT / "frontend/public/Logo/logo-felt.png"
WIDTH = 840
BLACK, SOLID = 20, 160  # brightest channel: at or under BLACK clear, from SOLID up opaque


def main() -> None:
    src = Image.open(SOURCE).convert("RGB")
    img = src.resize((WIDTH, round(src.height * WIDTH / src.width)), Image.Resampling.LANCZOS)
    rgb = np.asarray(img).astype(np.float64)
    alpha = np.clip((rgb.max(axis=2) - BLACK) / (SOLID - BLACK), 0.0, 1.0)
    # a soft edge is the colour mixed with black: take the black back out
    colour = np.clip(rgb / np.maximum(alpha, 1e-6)[..., None], 0, 255)
    out = np.dstack([colour, alpha * 255]).round().astype(np.uint8)
    Image.fromarray(out, "RGBA").save(OUT, optimize=True)
    clear = float((alpha == 0).mean())
    print(f"{OUT.relative_to(ROOT)}: {img.width}x{img.height}, {clear:.0%} transparent, "
          f"{OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
