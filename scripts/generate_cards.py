"""Generate a complete 52-card SVG deck + card back for ICM Master (A08).

Emits `frontend/public/cards/<rank><suit>.svg` plus `back.svg`.
Pure standard-library generator; no external assets or remote URLs at runtime.
"""
from __future__ import annotations

import pathlib

RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]
SUITS = {"c": ("\u2663", "#1a1a1a"), "d": ("\u2666", "#c62828"),
         "h": ("\u2665", "#c62828"), "s": ("\u2660", "#1a1a1a")}

OUT = pathlib.Path(__file__).resolve().parents[1] / "frontend" / "public" / "cards"

CARD_TPL = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" width="300" height="420">
  <defs>
    <linearGradient id="face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f4f1ea"/>
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="292" height="412" rx="18" fill="url(#face)" stroke="#cfc9bc" stroke-width="3"/>
  <rect x="10" y="10" width="280" height="400" rx="14" fill="none" stroke="#e3ddd0" stroke-width="1.5"/>
  {corners}
  {center}
</svg>
"""

FACE_TPL = """<g transform="rotate(180 270 390)">
  <text x="36" y="52" font-family="Georgia, serif" font-size="44" font-weight="bold" fill="{color}" text-anchor="middle">{rank}</text>
  <text x="36" y="96" font-family="Georgia, serif" font-size="40" fill="{color}" text-anchor="middle">{sym}</text>
</g>
<g>
  <text x="36" y="52" font-family="Georgia, serif" font-size="44" font-weight="bold" fill="{color}" text-anchor="middle">{rank}</text>
  <text x="36" y="96" font-family="Georgia, serif" font-size="40" fill="{color}" text-anchor="middle">{sym}</text>
</g>"""


def center_pip(rank: str, sym: str, color: str) -> str:
    big = 150
    if rank == "A":
        return f'<text x="150" y="270" font-family="Georgia, serif" font-size="{big * 1.7}" fill="{color}" text-anchor="middle">{sym}</text>'
    if rank in "JQK":
        label = {"J": "JACK", "Q": "QUEEN", "K": "KING"}[rank]
        return (
            f'<rect x="70" y="110" width="160" height="200" rx="14" fill="none" stroke="{color}" stroke-width="2"/>'
            f'<text x="150" y="205" font-family="Georgia, serif" font-size="64" fill="{color}" text-anchor="middle">{sym}</text>'
            f'<text x="150" y="268" font-family="Georgia, serif" font-size="30" font-weight="bold" letter-spacing="2" fill="{color}" text-anchor="middle">{label}</text>'
        )
    return f'<text x="150" y="268" font-family="Georgia, serif" font-size="{big}" fill="{color}" text-anchor="middle">{sym}</text>'


def generate() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for suit, (sym, color) in SUITS.items():
        for rank in RANKS:
            svg = CARD_TPL.format(
                corners=FACE_TPL.format(rank=rank, sym=sym, color=color),
                center=center_pip(rank, sym, color),
            )
            (OUT / f"{rank}{suit}.svg").write_text(svg)
    back = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" width="300" height="420">
  <defs>
    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="30" height="30" fill="#2563eb"/>
      <rect x="0" y="0" width="15" height="15" fill="#1d4ed8"/>
      <rect x="15" y="15" width="15" height="15" fill="#1d4ed8"/>
    </pattern>
  </defs>
  <rect x="4" y="4" width="292" height="412" rx="18" fill="url(#grid)" stroke="#f8fafc" stroke-width="6"/>
  <rect x="18" y="18" width="264" height="384" rx="12" fill="none" stroke="#f8fafc" stroke-width="2"/>
  <text x="150" y="250" font-family="Georgia, serif" font-size="56" fill="#f8fafc" text-anchor="middle" font-weight="bold">ICM</text>
</svg>
"""
    (OUT / "back.svg").write_text(back)
    print(f"generated {len(RANKS) * len(SUITS)} cards + back into {OUT}")


if __name__ == "__main__":
    generate()
