"""A17 — card asset completeness audit (frontend/public/cards).

Verifies the installed deck is exactly the standard 52-card set (+ card back)
and that the CC0 license text is bundled for provenance. Mirrors the mapping
in scripts/import_opendecks_cards.py without depending on the OpenDecks
checkout being present.
"""
from __future__ import annotations

import re
from pathlib import Path

ASSET_DIR = Path(__file__).resolve().parents[2] / "frontend" / "public" / "cards"

RANKS = {"A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"}
SUITS = {"s", "h", "d", "c"}


def test_exactly_52_card_faces_exist() -> None:
    files = {p.stem for p in ASSET_DIR.glob("*.svg")}
    cards = {f for f in files if f != "back"}
    assert len(cards) == 52, f"expected 52 card faces, found {len(cards)}"
    expected = {f"{r}{s}" for r in RANKS for s in SUITS}
    assert cards == expected, f"missing/extra faces: {expected ^ cards}"


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


def test_card_back_exists() -> None:
    assert (ASSET_DIR / "back.svg").is_file()


def test_cc0_license_bundled() -> None:
    license_file = ASSET_DIR / "OPEN_DECKS_LICENSE.txt"
    assert license_file.is_file()
    text = license_file.read_text(encoding="utf-8", errors="replace")
    assert "CC0" in text or "Creative Commons" in text
