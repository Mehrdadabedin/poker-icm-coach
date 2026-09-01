"""Swayne-concept education tests (Atomic Part 055)."""
from __future__ import annotations

from app.strategy.education import education_note


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
