"""Tournament blind timer tests (Atomic Part 013)."""
from __future__ import annotations

from app.tournament.tournament import build_default_tournament
from app.tournament.tournament_timer import TournamentTimer


class FakeClock:
    def __init__(self, start: float = 0.0) -> None:
        self.now = start

    def __call__(self) -> float:
        return self.now


def make_timer(**kw) -> TournamentTimer:
    return TournamentTimer(tournament=build_default_tournament(), clock=FakeClock(), **kw)


def test_initial_state() -> None:
    t = make_timer()
    assert t.level == 1
    assert t.seconds_left == 1200
    assert t.running is False


def test_start_then_advance() -> None:
    t = make_timer()
    t.start()
    assert t.running
    t.clock.now += 300
    assert t.seconds_left == 900
    assert t.level == 1


def test_level_up_on_zero() -> None:
    t = make_timer()
    t.start()
    t.clock.now += 1200
    t.tick()
    assert t.level == 2
    assert t.seconds_left == 1200
    assert t.blinds_changed
    assert t.current_blinds == (100, 200)


def test_multiple_level_ups() -> None:
    t = make_timer()
    t.start()
    t.clock.now += 1200 * 3
    t.tick()
    assert t.level == 4
    assert t.current_blinds == (200, 400)


def test_break_after_level_5() -> None:
    t = make_timer()
    t.start()
    t.clock.now += 1200 * 5  # levels 1..5 complete
    t.tick()
    # enter the 5-minute break; blinds stay at level 5
    assert t.level == 5
    assert t.in_break
    assert t.seconds_left == 300
    t.clock.now += 300  # break ends
    t.tick()
    assert not t.in_break
    assert t.level == 6
    assert t.current_blinds == (300, 600)
    assert t.seconds_left == 1200


def test_reset_clears_break() -> None:
    t = make_timer()
    t.start()
    t.clock.now += 1200 * 5
    t.tick()
    assert t.in_break
    t.reset()
    assert not t.in_break
    assert t.level == 1
    assert t.seconds_left == 1200


def test_pause_freezes_countdown() -> None:
    t = make_timer()
    t.start()
    t.clock.now += 500
    t.pause()
    frozen = t.seconds_left
    t.clock.now += 900
    assert t.seconds_left == frozen


def test_resume_continues() -> None:
    t = make_timer()
    t.start()
    t.clock.now += 500
    t.pause()
    t.resume()
    t.clock.now += 100
    assert t.seconds_left == 1200 - 600


def test_reset() -> None:
    t = make_timer()
    t.start()
    t.clock.now += 1200 * 2
    t.tick()
    assert t.level == 3
    t.reset()
    assert t.level == 1
    assert t.seconds_left == 1200
    assert not t.running


def test_fast_mode_scales_time() -> None:
    t = make_timer(fast_mode=2.0)
    t.start()
    t.clock.now += 300
    assert t.seconds_left == 1200 - 600


def test_fast_mode_level_ups_sooner() -> None:
    t = make_timer(fast_mode=10.0)
    t.start()
    t.clock.now += 120
    t.tick()
    assert t.level == 2


def test_pause_before_start_is_noop() -> None:
    t = make_timer()
    t.pause()
    assert not t.running
    t.resume()
    assert not t.running


def test_blinds_changed_flag_resets_on_read() -> None:
    t = make_timer()
    t.start()
    t.clock.now += 1200
    t.tick()
    assert t.blinds_changed
    _ = t.blinds_changed  # consumes the flag
    assert not t.blinds_changed
