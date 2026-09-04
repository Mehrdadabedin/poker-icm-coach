"""A17 — Import the OpenDecks CC0 playing-card deck into the frontend.

Mapping layer between the application's card identifiers (rank+suit) and the
OpenDecks asset filenames. Installs the 52 standard cards + one card back as
local SVG files in frontend/public/cards/ and validates the full deck.

Source / license: https://github.com/AustinGabriel/OpenDecks-Public-Domain-and-CC0-Playing-Cards
(CC0 1.0 Universal — see docs/card-assets.md and OPEN_DECKS_LICENSE.txt).

The runtime card logic is unchanged: PlayingCard still resolves
`cards/<rank><suit>.svg`, so this is purely an asset-level replacement.
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


def opendecks_filename(rank: str, suit: str) -> str:
    """OpenDecks source file name for an application card identifier."""
    return f"{_RANK_WORD[rank]} of {_SUIT_FOLDER[suit]}.svg"


def import_deck(source: Path | None = None) -> int:
    """Copy all 52 OpenDecks SVGs + blue card back into the frontend.

    Returns the number of front files installed; raises if any are missing.
    """
    src = source or ROOT / ".opendecks"
    card_source_dir = src / "svg cards" / "card fronts"
    if not card_source_dir.is_dir():
        raise SystemExit(f"OpenDecks checkout not found at {src}. Clone it there "
                         "or pass the path as an argument.")

    FRONT.mkdir(parents=True, exist_ok=True)
    installed = 0
    for rank in RANKS:
        for suit in SUITS:
            src_file = card_source_dir / _SUIT_FOLDER[suit] / opendecks_filename(rank, suit)
            if not src_file.is_file():
                raise SystemExit(f"missing OpenDecks asset: {src_file}")
            dest = FRONT / f"{rank}{suit}.svg"
            shutil.copyfile(src_file, dest)
            installed += 1
    if installed != 52:
        raise SystemExit(f"expected 52 cards, got {installed}")

    back_src = src / "svg cards" / "card backs" / "card back blue.svg"
    if not back_src.is_file():
        raise SystemExit(f"missing card back: {back_src}")
    shutil.copyfile(back_src, FRONT / "back.svg")

    license_src = src / "LICENSE"
    if license_src.is_file():
        shutil.copyfile(license_src, FRONT / "OPEN_DECKS_LICENSE.txt")
    return installed


if __name__ == "__main__":
    path_arg = sys.argv[1] if len(sys.argv) > 1 else None
    n = import_deck(Path(path_arg) if path_arg else None)
    print(f"installed {n} card faces + back into {FRONT}")
