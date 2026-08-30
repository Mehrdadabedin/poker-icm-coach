"""Hand evaluator tests (Atomic Part 008)."""
from __future__ import annotations

import pytest

from app.poker.card import card_from_str
from app.poker.hand_evaluator import best_hand, compare_hands, hand_name
from app.poker.hand_rank import HandCategory

H = card_from_str


def ev(faces: list[str]):
    """Evaluate 5-7 cards and return (category, tiebreak tuple)."""
    hand = best_hand([H(f) for f in faces])
    return hand.category, hand.tiebreak


@pytest.mark.parametrize(
    ("faces", "category"),
    [
        (["2c", "7d", "9s", "Jh", "Kd"], HandCategory.HIGH_CARD),
        (["2c", "2d", "9s", "Jh", "Kd"], HandCategory.PAIR),
        (["2c", "2d", "9s", "9h", "Kd"], HandCategory.TWO_PAIR),
        (["2c", "2d", "2s", "9h", "Kd"], HandCategory.THREE_OF_A_KIND),
        (["5c", "6d", "7s", "8h", "9d"], HandCategory.STRAIGHT),
        (["2c", "5c", "9c", "Jc", "Kc"], HandCategory.FLUSH),
        (["2c", "2d", "2s", "9h", "9d"], HandCategory.FULL_HOUSE),
        (["2c", "2d", "2s", "2h", "9d"], HandCategory.FOUR_OF_A_KIND),
        (["5c", "6c", "7c", "8c", "9c"], HandCategory.STRAIGHT_FLUSH),
        (["Tc", "Jc", "Qc", "Kc", "Ac"], HandCategory.STRAIGHT_FLUSH),  # royal
    ],
)
def test_categories(faces, category) -> None:
    assert ev(faces)[0] == category


def test_royal_flush_is_straight_flush() -> None:
    category, _ = ev(["Tc", "Jc", "Qc", "Kc", "Ac"])
    assert category == HandCategory.STRAIGHT_FLUSH
    royal = best_hand([H(f) for f in ["Tc", "Jc", "Qc", "Kc", "Ac"]])
    assert hand_name(royal) == "Royal Flush"


def test_wheel_straight() -> None:
    category, tiebreak = ev(["Ac", "2d", "3s", "4h", "5d"])
    assert category == HandCategory.STRAIGHT
    assert tiebreak[0] == 5  # ace-low counts as 5-high


def test_wheel_straight_flush() -> None:
    category, tiebreak = ev(["Ac", "2c", "3c", "4c", "5c"])
    assert category == HandCategory.STRAIGHT_FLUSH
    assert tiebreak[0] == 5


def test_best_five_of_seven() -> None:
    # 7 cards containing a flush that beats the pair
    category, _ = ev(["2c", "2d", "9c", "Jc", "Kc", "7c", "3h"])
    assert category == HandCategory.FLUSH


def test_kicker_resolution() -> None:
    # Both pair kings; second pair queens vs jacks; kicker ace vs 9
    a = ev(["Kd", "Kc", "Qh", "Qd", "As", "3c", "2d"])  # need exactly 5-7 cards
    b = ev(["Ks", "Kh", "Jd", "Jc", "9s", "7h", "2c"])
    assert a[0] == HandCategory.TWO_PAIR and b[0] == HandCategory.TWO_PAIR
    assert a[1] > b[1]


def test_high_card_tiebreak() -> None:
    a = ev(["As", "Kd", "Qc", "Jh", "9s", "3c", "2d"])
    b = ev(["Ad", "Kc", "Qh", "Jd", "8s", "4c", "2s"])
    assert a[1] > b[1]


def test_flush_tiebreak() -> None:
    a = ev(["As", "Ks", "Qs", "Js", "9s", "3d", "2c"])
    b = ev(["Ad", "Kd", "Qd", "Jd", "8d", "4h", "2c"])
    assert a[1] > b[1]


def test_full_house_tiebreak() -> None:
    # AAA KK beats KKK AA
    a = ev(["As", "Ad", "Ac", "Kh", "Kd", "2c", "3c"])
    b = ev(["Ks", "Kd", "Kc", "Ah", "Ad", "4c", "5c"])
    assert a[1] > b[1]


def test_four_of_a_kind_tiebreak() -> None:
    # QQQQ K beats JJJJ A
    a = ev(["Qs", "Qd", "Qc", "Qh", "Kd", "2c", "3c"])
    b = ev(["Js", "Jd", "Jc", "Jh", "Ad", "4c", "5c"])
    assert a[1] > b[1]


def test_straight_beats_three_of_a_kind() -> None:
    straight = best_hand([H(f) for f in ["5c", "6d", "7s", "8h", "9d", "3c", "2d"]])
    trips = best_hand([H(f) for f in ["As", "Ad", "Ac", "Kh", "Qd", "9c", "8d"]])
    assert compare_hands(straight, trips) == 1


def test_compare_hands_ordering() -> None:
    a = best_hand([H(f) for f in ["As", "Ad", "Ac", "Ah", "Kd", "2c", "3c"]])  # quads aces
    b = best_hand([H(f) for f in ["Ks", "Kd", "Kc", "Kh", "Ad", "4c", "5c"]])  # quads kings
    assert compare_hands(a, b) == 1
    assert compare_hands(b, a) == -1
    assert compare_hands(a, a) == 0


def test_identical_hands_tie() -> None:
    a = best_hand([H(f) for f in ["As", "Kd", "Qc", "Jh", "9s", "3c", "2d"]])
    b = best_hand([H(f) for f in ["Ad", "Ks", "Qh", "Js", "9d", "2h", "3d"]])
    assert compare_hands(a, b) == 0


def test_evaluates_5_6_7_cards() -> None:
    for n in (5, 6, 7):
        faces = ["As", "Kd", "Qc", "Jh", "9s", "3c", "2d"][:n]
        hand = best_hand([H(f) for f in faces])
        assert hand.category is not None
        assert len(hand.best_cards) == 5


def test_invalid_card_count_raises() -> None:
    with pytest.raises(ValueError):
        best_hand([H("As")])
    with pytest.raises(ValueError):
        best_hand([H(f) for f in ["As", "Kd", "Qc", "Jh", "9s", "3c", "2d", "Tc"]])


def test_duplicate_cards_raises() -> None:
    with pytest.raises(ValueError):
        best_hand([H("As"), H("As"), H("Kd"), H("Qc"), H("Jh")])
