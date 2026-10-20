"""Concept education tests (Atomic Part 055)."""
from __future__ import annotations

import copy

from fastapi.testclient import TestClient

from app.main import app
from app.strategy.education import TEXT, Lesson, education_note
from app.strategy.reasons import code_of


def test_positive_ev_note() -> None:
    note = education_note("AKs", True, 3, "BTN", 300, 2000, 0.6, 9, "POSITIVE EV")
    assert "positive chip EV" in note


def test_negative_ev_draw_note() -> None:
    note = education_note("76s", False, 5, "MP", 800, 1200, 0.25, 12, "NEGATIVE EV")
    assert "negative EV" in note
    assert "outs" in note or "draw" in note


def test_no_call_note() -> None:
    note = education_note("QQ", False, 8, "CO", 0, 1000, 0.7, 0, "NEUTRAL")
    assert "no call" in note


# plan 093: icmbot.es writes the note in Spanish from its code and details

def test_every_code_fills_all_its_details() -> None:
    for code, text in TEXT.items():
        names = {part.split("}")[0] for part in text.split("{")[1:]}
        lesson = Lesson(code, **{n: n.upper() for n in names})
        assert code_of(lesson) == (code, {n: n.upper() for n in names})


def test_each_branch_names_its_code_and_numbers_in_english() -> None:
    cases = [
        (("QQ", False, 8, "CO", 0, 1000, 0.7, 0, "NEUTRAL"), "no_call_class",
         {"hand": "QQ", "pos": "CO", "opponents": "8"}),
        (("QQ", True, 8, "CO", 0, 1000, 0.7, 0, "NEUTRAL"), "no_call_exact", {"pos": "CO", "opponents": "8"}),
        (("AKs", True, 3, "BTN", 300, 2000, 0.6, 9, "POSITIVE EV"), "positive_exact", {"opponents": "3"}),
        (("AKs", False, 3, "BTN", 300, 2000, 0.6, 9, "POSITIVE EV"), "positive_class",
         {"hand": "AKs", "opponents": "3"}),
        (("76s", False, 5, "MP", 45_000, 1200, 0.25, 12, "NEGATIVE EV"), "negative_outs",
         {"outs": "12", "call": "45,000"}),
        (("76s", False, 5, "MP", 800, 1200, 0.25, 0, "NEGATIVE EV"), "negative_some", {"call": "800"}),
        (("KJo", True, 3, "BB", 1200, 2400, 0.4, 0, "NEUTRAL"), "pot_odds_exact",
         {"pos": "BB", "opponents": "3", "pot": "2,400", "call": "1,200"}),
        (("KJo", False, 3, "BB", 1200, 2400, 0.4, 0, "NEUTRAL"), "pot_odds_class",
         {"hand": "KJo", "pos": "BB", "opponents": "3", "pot": "2,400", "call": "1,200"}),
    ]
    for args, code, params in cases:
        note = education_note(*args)
        assert code_of(note) == (code, params)
        assert note == TEXT[code].format(**params)
    assert set(TEXT) == {code for _, code, _ in cases}


def test_the_english_note_is_unchanged() -> None:
    note = education_note("76s", False, 5, "MP", 45_000, 1200, 0.25, 0, "NEGATIVE EV")
    assert note == ("Although there are some outs / draws available, drawing probability alone is not "
                    "enough: the probability of actually winning and the 45,000 call determine that "
                    "this spot is negative EV.")
    assert education_note("AKs", True, 3, "BTN", 300, 2000, 0.6, 9, "POSITIVE EV").startswith(
        "exact two-card combo has positive chip EV against 3 opponent(s)")


def test_the_coach_tool_sends_the_code() -> None:
    advice = TestClient(app).post("/api/coach/advice", json={
        "heroCards": [{"rank": "K", "suit": "s"}, {"rank": "J", "suit": "h"}],
        "position": "BB", "stack": 30000, "bigBlind": 1000, "smallBlind": 500, "ante": 0,
        "pot": 2400, "toCall": 1200, "board": [], "street": "preflop", "playersRemaining": 4,
        "paidPositions": 3, "stacks": [30000] * 4, "facingRaise": True,
    }).json()
    assert advice["educationCode"] in TEXT
    assert advice["education"] == TEXT[advice["educationCode"]].format(**advice["educationParams"])
    assert advice["educationParams"]["opponents"] == "3"


def test_a_copy_is_the_plain_sentence() -> None:
    note = education_note("QQ", False, 8, "CO", 0, 1000, 0.7, 0, "NEUTRAL")
    assert type(copy.deepcopy(note)) is str and copy.deepcopy(note) == note
