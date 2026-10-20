"""The review's English with its codes (plan 093 step 4b).

icmbot.es writes the bots' reasons from the codes, and the hand names from the
English itself, so the English must not change while the codes are added.
"""
from __future__ import annotations

from app.poker.hand_rank import HandCategory, HandRank
from app.services.bot_review import _decision, _faced
from app.services.bot_texts import DECISION, FACED
from app.services.hand_review import hand_description
from app.tournament.blind_structure import BlindLevel
from tests.services.test_hand_review import _create_table, _next, _play_to_completion


def test_the_bots_reasons_read_as_before() -> None:
    args = ("A♠ K♦", 12.5, 0.45, 0.3, "very high", "CO")
    said = {action: _decision(action, *args)["text"] for action in ("fold", "call", "bet", "all_in")}
    assert said == {
        "fold": "Folding A♠ K♦ - 45% equity is below the 30% pot odds needed from CO "
                "under Very High ICM pressure.",
        "call": "Calling with A♠ K♦ - 45% equity vs 30% pot odds from CO; ICM pressure Very High (profitable).",
        "bet": "Betting A♠ K♦ from CO - 45% equity, 12.5 BB behind, pot odds 30%.",
        "all_in": "All-in with A♠ K♦ for 12.5 BB - 45% equity at Very High ICM pressure.",
    }
    assert _decision("call", "A♠ K♦", 12.5, 0.2, 0.3, "low", "BB")["code"] == "call_marginal"
    assert _decision("raise", *args)["code"] == "bet"


def test_a_check_is_explained_as_a_check() -> None:
    why = _decision("check", "A♠ K♦", 12.5, 0.45, 0.0, "very high", "BB")
    assert why["code"] == "check", f"a check got the {why['code']} sentence: {why['text']}"
    assert why["text"] == "Checking A♠ K♦ from BB - 45% equity, 12.5 BB behind."


def test_what_the_bot_faced_reads_as_before() -> None:
    level = BlindLevel(small=50, big=100)
    assert [_faced(*a, level)["text"] for a in (("preflop", 100, 0), ("flop", 0, 0), ("preflop", 250, 250),
                                                ("preflop", 100, 50), ("turn", 400, 400))] == [
        "Unopened", "No bet", "Raise to 250", "Big blind 100", "Bet 400"]
    assert _faced("turn", 400, 400, level)["params"] == {"amount": "400"}


def test_every_explanation_is_its_code_with_its_details() -> None:
    table_id = _create_table()
    seen = 0
    for _ in range(6):
        _, review = _play_to_completion(table_id)
        for e in review["explanations"]:
            assert e["reason"] == DECISION[e["reasonCode"]].format(**e["reasonParams"])
            assert e["faced"] == FACED[e["facedCode"]].format(**e["facedParams"])
            seen += 1
        _next(table_id)
    assert seen > 0


def test_hand_names_keep_the_form_the_app_reads() -> None:
    names = [hand_description(HandRank(category, tiebreak)) for category, tiebreak in (
        (HandCategory.HIGH_CARD, (14, 12)), (HandCategory.PAIR, (11,)), (HandCategory.TWO_PAIR, (10, 9)),
        (HandCategory.THREE_OF_A_KIND, (7,)), (HandCategory.STRAIGHT, (11,)), (HandCategory.FLUSH, (14,)),
        (HandCategory.FULL_HOUSE, (13, 2)), (HandCategory.FOUR_OF_A_KIND, (5,)),
        (HandCategory.STRAIGHT_FLUSH, (14,)))]
    # frontend/src/i18n/handNames.ts reads exactly these forms
    assert names == ["High Card A", "Pair of Js", "Two Pair, Ts & 9s", "Three of a Kind, 7s",
                     "Straight, J high", "Flush, A high", "Full House, Ks full of 2s",
                     "Four of a Kind, 5s", "Straight Flush, A high"]
