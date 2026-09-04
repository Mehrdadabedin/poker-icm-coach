"""A17 — Import the OpenDecks CC0 playing-card deck into the frontend.

Mapping layer between the application's card identifiers (rank+suit) and the
OpenDecks asset filenames. Installs the standard 52 cards + card back in BOTH
local formats (SVG + PNG) under frontend/public/cards/ and validates the full
deck for each format.

Source / license: https://github.com/AustinGabriel/OpenDecks-Public-Domain-and-CC0-Playing-Cards
(CC0 1.0 Universal — see docs/card-assets.md and OPEN_DECKS_LICENSE.txt).

The runtime card logic is unchanged: PlayingCard resolves
`cards/<rank><suit>.png`, so this is purely an asset-level replacement.
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONT = ROOT / "frontend" / "public" / "cards"

# Application suit codes -> OpenDecks suit folder names.
_SUIT_FOLDER = {"s": "spades", "h": "hearts", "d": "diamonds", "c": "clubs"}

# Application rank codes -> OpenDecks rank words (2-9 are literal).
_RANK_WORD = {
    "A": "ace", "K": "king", "Q": "queen", "J": "jack", "T": "10",
    "9": "9", "8": "8", "7": "7", "6": "6", "5": "5",
    "4": "4", "3": "3", "2": "2",
}

RANKS = tuple(_RANK_WORD)
SUITS = tuple(_SUIT_FOLDER)


def opendecks_filename(rank: str, suit: str, ext: str) -> str:
    """OpenDecks source file name for an application card identifier."""
    return f"{_RANK_WORD[rank]} of {_SUIT_FOLDER[suit]}.{ext}"


def _import_format(src: Path, ext: str) -> int:
    """Copy all 52 faces for one format (svg|png). Raises if any are missing."""
    card_source_dir = src / f"{ext} cards" / "card fronts"
    if not card_source_dir.is_dir():
        raise SystemExit(f"missing OpenDecks directory: {card_source_dir}")
    installed = 0
    for rank in RANKS:
        for suit in SUITS:
            src_file = card_source_dir / _SUIT_FOLDER[suit] / opendecks_filename(rank, suit, ext)
            if not src_file.is_file():
                raise SystemExit(f"missing OpenDecks asset: {src_file}")
            shutil.copyfile(src_file, FRONT / f"{rank}{suit}.{ext}")
            installed += 1
    if installed != 52:
        raise SystemExit(f"expected 52 cards for {ext}, got {installed}")
    return installed


def import_deck(source: Path | None = None) -> tuple[int, int]:
    """Copy all 52 OpenDecks SVGs + PNGs and the blue card back.

    Returns (svg_count, png_count); raises if anything is missing.
    """
    src = source or ROOT / ".opendecks"
    if not (src / "svg cards").is_dir() or not (src / "png cards").is_dir():
        raise SystemExit(f"OpenDecks checkout not found at {src}. Clone it there "
                         "or pass the path as an argument.")

    FRONT.mkdir(parents=True, exist_ok=True)
    n_svg = _import_format(src, "svg")
    n_png = _import_format(src, "png")

    back_svg = src / "svg cards" / "card backs" / "card back blue.svg"
    back_png = src / "png cards" / "card backs" / "card back blue.png"
    if not back_svg.is_file() or not back_png.is_file():
        raise SystemExit("missing card back (svg and/or png)")
    shutil.copyfile(back_svg, FRONT / "back.svg")
    shutil.copyfile(back_png, FRONT / "back.png")

    license_src = src / "LICENSE"
    if license_src.is_file():
        shutil.copyfile(license_src, FRONT / "OPEN_DECKS_LICENSE.txt")
    return n_svg, n_png


if __name__ == "__main__":
    path_arg = sys.argv[1] if len(sys.argv) > 1 else None
    svg_n, png_n = import_deck(Path(path_arg) if path_arg else None)
    print(f"installed {svg_n} SVG + {png_n} PNG card faces + backs into {FRONT}")
