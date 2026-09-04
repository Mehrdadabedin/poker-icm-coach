"""A17 — card asset completeness audit (frontend/public/cards).

Verifies the installed deck is exactly the standard 52-card set (+ card backs)
in both OpenDecks formats (SVG and PNG), that the png assets are actual
1500x2100 OpenDecks images, and that the CC0 license text is bundled for
provenance. Mirrors the mapping in scripts/import_opendecks_cards.py without
depending on the OpenDecks checkout being present.
"""
from __future__ import annotations

import re
from pathlib import Path

ASSET_DIR = Path(__file__).resolve().parents[2] / "frontend" / "public" / "cards"

RANKS = {"A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"}
SUITS = {"s", "h", "d", "c"}


def _expected_faces() -> set[str]:
    return {f"{r}{s}" for r in RANKS for s in SUITS}


def test_exactly_52_svg_card_faces_exist() -> None:
    files = {p.stem for p in ASSET_DIR.glob("*.svg")}
    cards = {f for f in files if f != "back"}
    assert len(cards) == 52, f"expected 52 card faces, found {len(cards)}"
    assert cards == _expected_faces(), f"missing/extra faces: {_expected_faces() ^ cards}"


def test_exactly_52_png_card_faces_exist() -> None:
    files = {p.stem for p in ASSET_DIR.glob("*.png")}
    cards = {f for f in files if f != "back"}
    assert len(cards) == 52, f"expected 52 png card faces, found {len(cards)}"
    assert cards == _expected_faces(), f"missing/extra png faces: {_expected_faces() ^ cards}"


def test_each_card_is_a_valid_svg_with_correct_proportions() -> None:
    for rank in RANKS:
        for suit in SUITS:
            path = ASSET_DIR / f"{rank}{suit}.svg"
            text = path.read_text(encoding="utf-8")
            assert "<svg" in text, f"{path.name} is not an SVG"
            m = re.search(r"viewBox\s*=\"0 0 (\d+) (\d+)\"", text)
            assert m, f"{path.name} missing viewBox"
            w, h = int(m.group(1)), int(m.group(2))
            assert abs(w / h - 1500 / 2100) < 0.02, f"{path.name} wrong aspect ratio"


def test_each_png_is_an_opendecks_proportion_1500x2100() -> None:
    """PNG faces must be the OpenDecks raster (1500x2100). Keeps the local
    deployment conceptually identical to the source deck (no resampling).
    Reads width/height straight from the PNG IHDR chunk (no image lib)."""
    for rank in RANKS:
        for suit in SUITS:
            path = ASSET_DIR / f"{rank}{suit}.png"
            data = path.read_bytes()
            assert data.startswith(b"\x89PNG\r\n\x1a\n"), f"{path.name} not a PNG"
            width = int.from_bytes(data[16:20], "big")  # IHDR width
            height = int.from_bytes(data[20:24], "big")  # IHDR height
            assert (width, height) == (1500, 2100), (
                f"{path.name} size {(width, height)} != 1500x2100"
            )


def test_card_backs_exist() -> None:
    assert (ASSET_DIR / "back.svg").is_file()
    assert (ASSET_DIR / "back.png").is_file()


def test_cc0_license_bundled() -> None:
    license_file = ASSET_DIR / "OPEN_DECKS_LICENSE.txt"
    assert license_file.is_file()
    text = license_file.read_text(encoding="utf-8", errors="replace")
    assert "CC0" in text or "Creative Commons" in text
