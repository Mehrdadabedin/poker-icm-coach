"""A17 — Import the OpenDecks CC0 playing-card deck into the frontend.

Mapping layer between the application's card identifiers (rank+suit) and the
OpenDecks asset filenames. Installs the standard 52 cards + card back as PNG
under frontend/public/cards/ and validates the full deck. Only PNG is
installed: `public/` ships verbatim in dist/ and the Android APK, and the
renderer resolves `cards/<rank><suit>.png`, so a parallel SVG deck would be
~7.5 MB of bundle weight nothing loads. The vectors stay available upstream.

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


def _import_format(src: Path, ext: str = "png") -> int:
    """Copy all 52 faces for one format. Raises if any are missing."""
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


def import_deck(source: Path | None = None) -> int:
    """Copy all 52 OpenDecks PNGs and the blue card back.

    Returns the face count; raises if anything is missing.
    """
    src = source or ROOT / ".opendecks"
    if not (src / "png cards").is_dir():
        raise SystemExit(f"OpenDecks checkout not found at {src}. Clone it there "
                         "or pass the path as an argument.")

    FRONT.mkdir(parents=True, exist_ok=True)
    n_png = _import_format(src)

    back_png = src / "png cards" / "card backs" / "card back blue.png"
    if not back_png.is_file():
        raise SystemExit("missing card back png")
    shutil.copyfile(back_png, FRONT / "back.png")

    license_src = src / "LICENSE"
    if license_src.is_file():
        shutil.copyfile(license_src, FRONT / "OPEN_DECKS_LICENSE.txt")

    _optimize_pngs(FRONT)  # Issue #6: resize 1500x2100 -> 300x420
    return n_png


def _optimize_pngs(directory: Path) -> None:
    """Downscale bundled card PNGs to 300x420 (5:7 preserved) for a lean
    deployment. Uses PIL if available; otherwise leaves PNGs as-is."""
    try:
        from PIL import Image
    except ImportError:  # pragma: no cover - optional
        print("Pillow not installed; PNGs left at original resolution")
        return
    for path in directory.glob("*.png"):
        with Image.open(path) as im:
            if im.size != (300, 420):
                im = im.resize((300, 420), Image.LANCZOS).convert("RGBA")
                im.save(path, "PNG", optimize=True)


if __name__ == "__main__":
    path_arg = sys.argv[1] if len(sys.argv) > 1 else None
    png_n = import_deck(Path(path_arg) if path_arg else None)
    print(f"installed {png_n} PNG card faces + back into {FRONT}")
