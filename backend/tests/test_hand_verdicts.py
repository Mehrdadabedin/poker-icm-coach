"""Every hero decision keeps the coach's verdict in the hand history (plan 062).

Before this, live hands were recorded without hero_decision, coach
recommendation or grade, so VPIP, PFR, coach agreement, ICM mistakes and the
biggest leak had no data, and there was nothing to build a mistakes list from.
"""
from __future__ import annotations

import random

from app.game.hand_result import HandAction
from app.poker.card import card_from_str
from app.services.game_session import GameSession
from app.services.hand_history import HandDecision, HandHistoryRecord
from app.services.session_record import build_record
from app.services.statistics import aggregate
from tests.api_helpers import login_client


def _session() -> GameSession:
    session = GameSession(starting_stack=45_000, fast_mode=1.0, rng=random.Random(7))
    session.start()
    return session


def _play_out(session: GameSession) -> list[str]:
    """Play the current hand to the end; return the coach advice shown at each
    hero decision, in order."""
    shown = []
    while session.phase() != "handOver":
        assert session.engine is not None
        if session.engine.current_actor != session.hero_seat:
            break
        shown.append(session.coach_advice()["recommendedAction"])
        session.hero_action("call" if session.state()["toCall"] else "check")
    return shown


def _decision(street: str, hero: str, coach: str, grade: str) -> HandDecision:
    return HandDecision(street=street, hero_action=hero, coach_action=coach, grade=grade,
                        icm_pressure="HIGH", explanation="why", stack_bb=20.0,
                        to_call=0, board=[])


def test_every_hero_decision_keeps_the_coach_verdict() -> None:
    session = _session()
    shown = _play_out(session)
    assert shown, "the seeded hand should reach the hero"
    session.next_hand()

    record = session.history.all()[-1]
    assert [d.coach_action for d in record.decisions] == shown, (
        "verdicts must use the advice shown for that decision"
    )
    for d in record.decisions:
        assert d.grade in {"PREFERRED", "ACCEPTABLE", "SUBOPTIMAL"}
        assert d.hero_action in {"CALL", "CHECK"} and d.street and d.stack_bb > 0
    assert record.grade is not None and record.coach_recommendation is not None


def test_the_hand_summary_comes_from_its_worst_decision() -> None:
    session = _session()
    _play_out(session)
    good = _decision("preflop", "CALL", "CALL", "PREFERRED")
    bad = _decision("flop", "CALL", "FOLD", "SUBOPTIMAL")
    record = build_record(session, [good, bad])
    assert record is not None
    assert (record.hero_decision, record.coach_recommendation, record.grade) == (
        "CALL", "FOLD", "SUBOPTIMAL"
    )


def test_vpip_reads_the_first_preflop_decision() -> None:
    record = HandHistoryRecord(
        hand_number=1, hero_cards=[card_from_str("As"), card_from_str("Kd")],
        hero_position="BTN", community_cards=[], starting_stack=10_000,
        ending_stack=9_000, blind_level="100/200",
        actions=[HandAction(seat=0, action="call", amount=200, street="preflop")],
        pot_total=1_000, winner_seats=[1],
        decisions=[_decision("preflop", "CALL", "CALL", "PREFERRED"),
                   _decision("flop", "FOLD", "CALL JAM", "SUBOPTIMAL")],
    )
    record.hero_decision = "FOLD"  # the worst decision's action, as build_record sets it
    stats = aggregate([record])
    assert stats.vpip == 1.0, "VPIP must count the preflop call, not the later fold"


def test_the_hands_api_returns_cards_and_decisions() -> None:
    client = login_client("VerdictApiUser")
    created = client.post("/api/tournament", json={
        "players": 9, "starting_stack": 45000, "blind_level_minutes": 20,
        "ante_mode": "none", "fast_mode": 1.0,
    })
    assert created.status_code == 200, created.text
    table = created.json()["tableId"]
    hands: list[dict] = []
    for _ in range(60):  # play until one finished hand carries a hero decision
        state = client.get(f"/api/game/{table}/state").json()
        if state["phase"] == "handOver":
            client.post(f"/api/game/{table}/next-hand")
            hands = client.get(f"/api/game/{table}/hands").json()["hands"]
            if any(h["decisions"] for h in hands):
                break
        elif state["currentActor"] == state["heroSeat"]:
            kind = "call" if state["toCall"] else "check"
            assert client.post(f"/api/game/{table}/action", json={"kind": kind}).status_code == 200
    decided = [h for h in hands if h["decisions"]]
    assert decided, "no finished hand with a hero decision after 60 steps"
    assert len(decided[0]["heroCards"]) == 2
    assert set(decided[0]["decisions"][0]) == {
        "street", "heroAction", "coachAction", "grade", "icmPressure",
        "explanation", "stackBb", "toCall", "board"}
