"""Range shorthand parsing (plan 073).

"A2s+" means A2s up to AKs. The expansion ran one rank too far and added a
cell with both cards the same rank and a suited/offsuit flag ("AAs"), which is
not a hand: in an equity simulation it paired a card with itself.
"""
from __future__ import annotations

from app.strategy.hand_codec import HandCell, parse_range, parse_shorthand


def test_plus_expands_up_to_one_below_the_top_card() -> None:
    assert {c.name() for c in parse_shorthand("A2s+")} == {
        f"A{r}s" for r in "23456789TJQK"
    }
    assert {c.name() for c in parse_shorthand("KTs+")} == {"KTs", "KJs", "KQs"}
    assert {c.name() for c in parse_shorthand("AJo+")} == {"AJo", "AQo", "AKo"}


def test_no_range_contains_a_suited_or_offsuit_pair() -> None:
    cells = parse_range("22+,A2s+,K9s+,QTs+,ATo+,KJo+,QJo")
    assert not [c for c in cells if c.hi == c.lo and c.suited is not None]


def test_pairs_plus_still_reaches_aces() -> None:
    assert parse_shorthand("TT+") == [HandCell(r, r, None) for r in range(10, 15)]
