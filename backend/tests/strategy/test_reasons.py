"""The coach's reason as a code and its details (plan 093).

icmbot.es writes the coach's reason in Spanish from a code, so the server
sends the code and the details next to the English sentence, which stays
exactly as it was.
"""
from __future__ import annotations

import copy
import pickle

from app.poker.card import card_from_str
from app.services.session_coach import advice_dict
from app.strategy.coach import Coach, CoachRequest
from app.strategy.reasons import FIRST_SENTENCE, TEXT, Reason, code_of


def _request(cards: str, position: str = "CO", mode: str = "advanced") -> CoachRequest:
    return CoachRequest(
        hero=[card_from_str(c) for c in cards.split()], position=position, stack=45_000, big_blind=100,
        small_blind=50, ante=0, pot=150, to_call=100, board=[], street="preflop", players_remaining=9,
        paid_positions=6, stacks=[45_000] * 9, payout=[40, 25, 15, 10, 6, 4], facing_raise=False, mode=mode)


def test_a_reason_is_the_english_sentence_with_its_code() -> None:
    reason = Reason("open_out", hand="J7o", pos="CO")
    assert reason == "J7o is not in the CO open range."
    assert code_of(reason) == ("open_out", {"hand": "J7o", "pos": "CO"})
    assert code_of("a plain sentence") == ("", {})


def test_every_code_fills_all_its_details() -> None:
    for code, text in TEXT.items():
        names = {part.split("}")[0] for part in text.split("{")[1:]}
        assert Reason(code, **{n: n.upper() for n in names}).code == code
    assert set(FIRST_SENTENCE.values()) <= set(TEXT)


def test_a_copy_is_the_plain_sentence() -> None:
    # a saved hand is copied with copy.deepcopy, which used to read the sentence as a code
    reason = Reason("open_out", hand="J7o", pos="CO")
    for twin in (copy.deepcopy(reason), copy.copy(reason), pickle.loads(pickle.dumps(reason))):
        assert twin == reason and type(twin) is str


def test_the_advice_carries_the_code() -> None:
    advice = advice_dict(Coach().recommend(_request("Jh 7c")))
    assert advice["reasoning"] == "J7o is not in the CO open range."
    assert (advice["reasonCode"], advice["reasonParams"]) == ("open_out", {"hand": "J7o", "pos": "CO"})


def test_beginner_mode_names_its_one_sentence() -> None:
    advanced = Coach().recommend(_request("Ah Kd", "BTN"))
    assert advanced.reason_code == "open_in_steal" and advanced.reasoning.endswith("Steal spot from late position.")
    beginner = Coach().recommend(_request("Ah Kd", "BTN", mode="beginner"))
    assert beginner.reason_code == "open_in" and beginner.reasoning == "AKo is in the BTN open range."
