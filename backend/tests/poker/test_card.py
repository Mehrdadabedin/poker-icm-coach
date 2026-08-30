"""Card model tests (Atomic Part 002)."""
from __future__ import annotations

import pytest

from app.poker.card import Card, Rank, Suit, card_from_str, parse_rank, parse_suit

ALL_STRINGS = [
    f"{r}{s}"
    for r in "23456789TJQKA"
    for s in "cdhs"
]

SUIT_SYMBOLS = {Suit.CLUBS: "c", Suit.DIAMONDS: "d", Suit.HEARTS: "h", Suit.SPADES: "s"}


def test_parses_all_52_cards() -> None:
    assert len(ALL_STRINGS) == 52
    cards = {card_from_str(cs) for cs in ALL_STRINGS}
    assert len(cards) == 52
    for cs in ALL_STRINGS:
        card = card_from_str(cs)
        assert str(card).upper().replace("♠", "S").replace("♥", "H").replace(
            "♦", "D").replace("♣", "C") == cs.upper()


def test_suits_enum() -> None:
    assert len(Suit) == 4
    assert list(Suit) == [Suit.CLUBS, Suit.DIAMONDS, Suit.HEARTS, Suit.SPADES]


def test_ranks_enum() -> None:
    assert len(Rank) == 13
    assert Rank.ACE == 14
    assert Rank.KING == 13
    assert Rank.TWO == 2


def test_card_equality_and_hash() -> None:
    a = card_from_str("As")
    b = card_from_str("As")
    c = card_from_str("Ad")
    assert a == b
    assert hash(a) == hash(b)
    assert a != c


def test_ace_high_value() -> None:
    assert card_from_str("As").rank.value == 14
    assert card_from_str("2c").rank.value == 2


def test_invalid_string_raises() -> None:
    with pytest.raises(ValueError):
        card_from_str("Xx")
    with pytest.raises(ValueError):
        card_from_str("A")
    with pytest.raises(ValueError):
        card_from_str("1s")
    with pytest.raises(ValueError):
        card_from_str("")


def test_sort_by_rank_desc() -> None:
    cards = [card_from_str(x) for x in ["9h", "As", "Td", "2c", "Js"]]
    expected = ["As", "Js", "Td", "9h", "2c"]
    assert sorted(cards, key=lambda c: c.rank.value, reverse=True) == [
        card_from_str(e) for e in expected
    ]


def test_encode_unique() -> None:
    encodings = {card_from_str(cs).encode() for cs in ALL_STRINGS}
    assert len(encodings) == 52
    assert all(0 <= e < 52 for e in encodings)


def test_decode_roundtrip() -> None:
    for cs in ALL_STRINGS:
        card = card_from_str(cs)
        assert Card.decode(card.encode()) == card


def test_repr_contains_rank_suit() -> None:
    card = card_from_str("Kd")
    assert "K" in repr(card)
    assert "d" in repr(card).lower()


def test_parse_functions() -> None:
    assert parse_rank("A") == Rank.ACE
    assert parse_rank("T") == Rank.TEN
    assert parse_suit("s") == Suit.SPADES
    with pytest.raises(ValueError):
        parse_rank("1")
    with pytest.raises(ValueError):
        parse_suit("x")
