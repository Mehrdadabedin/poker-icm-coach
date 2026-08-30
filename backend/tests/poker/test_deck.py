"""Deck engine tests (Atomic Part 003)."""
from __future__ import annotations

import random

import pytest

from app.poker.card import Card, card_from_str
from app.poker.deck import Deck, DeckEmpty


def test_deck_has_52_unique_cards() -> None:
    deck = Deck()
    assert len(deck) == 52
    assert len(set(deck.cards)) == 52


def test_deck_contains_all_ranks_and_suits() -> None:
    deck = Deck()
    faces = {c.ascii() for c in deck.cards}
    assert len(faces) == 52
    assert card_from_str("As") in deck.cards
    assert card_from_str("2c") in deck.cards


def test_shuffle_changes_order() -> None:
    ordered = Deck().cards
    shuffled = Deck(random.Random(42))
    shuffled.shuffle()
    assert shuffled.cards != ordered
    assert sorted(shuffled.cards, key=lambda c: c.encode()) == sorted(ordered, key=lambda c: c.encode())


def test_shuffle_seeded_is_deterministic() -> None:
    a = Deck(random.Random(7))
    b = Deck(random.Random(7))
    a.shuffle()
    b.shuffle()
    assert a.cards == b.cards


def test_draw_reduces_count() -> None:
    deck = Deck()
    card = deck.draw()
    assert isinstance(card, Card)
    assert len(deck) == 51
    assert card not in deck.cards


def test_draw_all_52_no_duplicates() -> None:
    deck = Deck()
    drawn = [deck.draw() for _ in range(52)]
    assert len(set(drawn)) == 52


def test_draw_from_empty_raises() -> None:
    deck = Deck()
    for _ in range(52):
        deck.draw()
    with pytest.raises(DeckEmpty):
        deck.draw()


def test_reset_restores_52() -> None:
    deck = Deck()
    for _ in range(10):
        deck.draw()
    assert len(deck) == 42
    deck.reset()
    assert len(deck) == 52


def test_reset_clears_draw_state() -> None:
    deck = Deck(random.Random(1))
    drawn1 = [deck.draw() for _ in range(5)]
    deck.reset()
    drawn2 = [deck.draw() for _ in range(5)]
    assert drawn1 == drawn2


def test_initial_deck_is_not_pre_shuffled() -> None:
    # A fresh deck is in canonical order (sanity for tests + dealing determinism).
    deck = Deck()
    first = deck.cards[0]
    assert first.ascii() == "2c"
