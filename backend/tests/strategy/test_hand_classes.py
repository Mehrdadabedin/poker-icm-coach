"""169 starting-hand class tests (Atomic Part 049)."""
from __future__ import annotations

from app.strategy.hand_classes import all_starting_hands


def test_169_classes() -> None:
    hands = all_starting_hands()
    assert len(hands) == 169


def test_pairs_first() -> None:
    hands = all_starting_hands()
    assert [h["name"] for h in hands[:13]] == [
        "AA", "KK", "QQ", "JJ", "TT", "99", "88", "77", "66", "55", "44", "33", "22",
    ]


def test_suited_and_offsuit_present() -> None:
    names = {h["name"] for h in all_starting_hands()}
    assert "AKs" in names and "AKo" in names and "32s" in names and "32o" in names
    assert len(names) == 169


def test_representative_combos_valid() -> None:
    for hand in all_starting_hands():
        cards = hand["cards"]
        assert len(cards) == 2
        assert cards[0]["rank"] and cards[0]["suit"]
        assert (cards[0]["rank"], cards[0]["suit"]) != (cards[1]["rank"], cards[1]["suit"])
