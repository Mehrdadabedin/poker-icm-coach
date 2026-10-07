"""The level clock stops when the final hand completes.

The tournament used to stay "active" until the client called next_hand()
after the final hand, and state() resumed the timer on every poll of a
completed hand, so the blind clock kept running under the champion screen.
"""
from __future__ import annotations

import pytest

import app.services.game_session as game_session_module
from app.services.game_session import GameSession
from app.tournament.tournament_timer import TournamentTimer
from tests.tournament.test_endgame import bots_only_session


class FakeClock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def chip_holders(s: GameSession) -> int:
    return sum(1 for p in s.tournament.players if not p.is_eliminated and p.stack > 0)


@pytest.mark.parametrize("seed", [0, 1, 2])
def test_final_hand_finishes_and_freezes_the_clock(
    monkeypatch: pytest.MonkeyPatch, seed: int,
) -> None:
    clock = FakeClock()
    monkeypatch.setattr(
        game_session_module, "TournamentTimer",
        lambda tournament, fast_mode=1.0: TournamentTimer(tournament, clock=clock, fast_mode=fast_mode),
    )
    s = bots_only_session(level_index=14, stack=1200, seed=seed)
    for _ in range(200):
        if s.phase() == "handOver" and chip_holders(s) <= 1:
            break
        if s.phase() == "handOver":
            s.next_hand()
    assert chip_holders(s) <= 1, "no final hand within 200 hands"
    assert s.status == "finished", "final hand completed but the table is still active"
    assert s.timer is not None and not s.timer.running

    first = s.state()
    clock.now += 600
    second = s.state()
    clock.now += 600
    third = s.state()
    frozen = (first["level"], first["secondsLeft"])
    assert (second["level"], second["secondsLeft"]) == frozen, "level clock advanced after the final hand"
    assert (third["level"], third["secondsLeft"]) == frozen, "level clock advanced after the final hand"
    assert third["status"] == "finished"
    with pytest.raises(ValueError, match="not active"):
        s.next_hand()
