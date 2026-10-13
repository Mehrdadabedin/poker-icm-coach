"""The coach's advice names the street it is for (plan 075), so the panel can
say "BET on the flop" instead of a bare "BET"."""
from __future__ import annotations

from app.poker.card import card_from_str as card
from app.services.session_coach import advice_dict
from app.strategy.coach import Coach, CoachRequest


def _request(board: list[str], street: str) -> CoachRequest:
    return CoachRequest(
        hero=[card("As"), card("Kd")], position="CO", stack=45_000, big_blind=100,
        small_blind=100, ante=0, pot=500, to_call=0, board=[card(b) for b in board],
        street=street, players_remaining=9, paid_positions=2, stacks=[45_000] * 9,
        payout=[65.0, 35.0], facing_raise=False)


def test_the_advice_names_its_street() -> None:
    coach = Coach()
    spots = [([], "preflop"), (["Ac", "7d", "2s"], "flop"), (["Ac", "7d", "2s", "9h"], "turn"),
             (["Ac", "7d", "2s", "9h", "3c"], "river")]
    for board, street in spots:
        assert advice_dict(coach.recommend(_request(board, street)))["street"] == street


def test_the_table_coach_api_sends_the_street() -> None:
    """The route's response model used to drop the field (it lists every key)."""
    from tests.api_helpers import login_client

    client = login_client("CoachStreetUser")
    table = client.post("/api/tournament", json={
        "players": 9, "starting_stack": 45000, "blind_level_minutes": 20,
        "ante_mode": "none", "fast_mode": 1.0,
    }).json()["tableId"]
    state = client.get(f"/api/game/{table}/state").json()
    advice = client.post(f"/api/game/{table}/coach").json()
    assert advice["street"] == state["street"]
