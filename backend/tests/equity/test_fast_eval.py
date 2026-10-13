"""The fast hand score ranks hands exactly like best_hand (plan 074)."""
from __future__ import annotations

import random

from app.equity.fast_eval import score, to_int
from app.poker.card import card_from_str as card
from app.poker.deck import Deck
from app.poker.hand_evaluator import best_hand, compare_hands


def _sign(x: int) -> int:
    return (x > 0) - (x < 0)


def test_agrees_with_best_hand_on_random_showdowns() -> None:
    rng = random.Random(2026)
    deck = list(Deck().cards)
    disagreements = []
    for _ in range(20_000):
        drawn = rng.sample(deck, 9)
        board, a, b = drawn[:5], drawn[5:7], drawn[7:9]
        slow = compare_hands(best_hand(a + board), best_hand(b + board))
        fa, fb = score([to_int(c) for c in a + board]), score([to_int(c) for c in b + board])
        fast = (fa > fb) - (fa < fb)
        if _sign(slow) != fast:
            disagreements.append((a, b, board))
    assert not disagreements, disagreements[:3]


def test_category_matches_best_hand_on_known_hands() -> None:
    hands = {
        "As Ks Qs Js Ts 2d 3c": 8, "9h 9d 9s 9c 2d 3c 4h": 7, "9h 9d 9s 2c 2d 3c 4h": 6,
        "2s 7s 9s Js Ks 3d 4c": 5, "As 2d 3c 4h 5s 9d Kc": 4, "7h 7d 7s Kc 2d 3c 9h": 3,
        "7h 7d 2s 2c Kd 3c 9h": 2, "7h 7d As Qc 2d 3c 9h": 1, "Ah Jd 9s 7c 5d 3c 2h": 0,
    }
    for text, category in hands.items():
        cards = [card(t) for t in text.split()]
        assert score([to_int(c) for c in cards])[0] == category == best_hand(cards).category.value, text
