"""Tournament engine tests (Atomic Part 012)."""
from __future__ import annotations

import pytest

from app.game.player import Player
from app.tournament.blind_structure import BlindLevel, BlindStructure, default_structure
from app.tournament.tournament import PayoutStructure, Tournament, build_default_tournament


def test_default_structure_start() -> None:
    s = default_structure()
    assert s.level_at(0) == BlindLevel(small=100, big=100, ante=0, break_after=0)
    assert s.level_at(1) == BlindLevel(small=100, big=200, ante=0, break_after=0)
    assert s.level_at(2) == BlindLevel(small=100, big=300, ante=0, break_after=0)
    assert s.level_at(3) == BlindLevel(small=200, big=400, ante=0, break_after=0)
    assert s.level_at(4) == BlindLevel(small=200, big=500, ante=0, break_after=300)
    assert s.level_at(5) == BlindLevel(small=300, big=600, ante=600, break_after=0)
    assert s.level_at(6) == BlindLevel(small=400, big=800, ante=800, break_after=0)


def test_default_structure_continues() -> None:
    s = default_structure()
    assert s.level_at(7).small == 500
    assert s.level_at(8).small == 600
    assert len(s) == 21


def test_structure_breaks() -> None:
    s = default_structure()
    assert s.level_at(4).break_after == 5 * 60      # break 1 after level 5
    assert s.level_at(10).break_after == 15 * 60    # break 2 after level 11
    assert s.level_at(16).break_after == 15 * 60    # break 3 after level 17
    assert s.level_at(0).break_after == 0 and s.level_at(20).break_after == 0


def test_level_duration_default() -> None:
    s = default_structure()
    assert s.level_duration == 20 * 60  # seconds


def test_level_duration_override() -> None:
    s = default_structure(level_minutes=25)
    assert s.level_duration == 25 * 60


def test_custom_structure() -> None:
    s = BlindStructure(
        levels=[BlindLevel(50, 100), BlindLevel(100, 200)], level_duration=600
    )
    assert len(s) == 2
    assert s.level_at(1) == BlindLevel(100, 200)


def test_ante_modes() -> None:
    s = default_structure()
    assert s.ante_for("none", level=BlindLevel(200, 400)) == 0
    assert s.ante_for("traditional", level=BlindLevel(200, 400)) == 40
    assert s.ante_for("bba", level=BlindLevel(200, 400, 400)) == 400
    assert s.ante_for("bba", level=BlindLevel(200, 400)) == 0  # early level, no ante


def test_invalid_ante_mode_raises() -> None:
    s = default_structure()
    with pytest.raises(ValueError):
        s.ante_for("bogus", BlindLevel(100, 200))


def test_ante_scales_with_big_blind() -> None:
    s = default_structure()
    assert s.ante_for("traditional", BlindLevel(500, 1000)) == 100
    assert s.ante_for("traditional", BlindLevel(1000, 2000)) == 200


def test_payout_structure_validation() -> None:
    p = PayoutStructure([0.4, 0.25, 0.15, 0.1, 0.06, 0.04])
    assert p.paid_positions == 6
    assert abs(sum(p.percentages) - 1.0) < 1e-9
    with pytest.raises(ValueError):
        PayoutStructure([0.5, 0.6])  # sums > 1
    with pytest.raises(ValueError):
        PayoutStructure([1.0, 0.0])  # zero payout position


def test_standard_payouts() -> None:
    assert PayoutStructure.nine_player().paid_positions == 6
    assert PayoutStructure.eighteen_player().paid_positions == 8
    assert PayoutStructure.twenty_seven_player().paid_positions == 9
    assert PayoutStructure.forty_five_player().paid_positions == 12
    assert PayoutStructure.ninety_player().paid_positions == 15


def test_build_default_tournament() -> None:
    t = build_default_tournament()
    assert len(t.players) == 9
    assert sum(1 for p in t.players if p.is_human) == 1
    assert sum(1 for p in t.players if not p.is_human) == 8
    assert all(p.stack == 45000 for p in t.players)
    assert t.button == 0
    assert t.level_index == 0
    assert t.structure.level_at(0) == BlindLevel(100, 100)


def test_tournament_custom_players() -> None:
    players = [Player(name=f"P{i}", stack=20000, seat=i) for i in range(6)]
    t = Tournament(players=players, structure=default_structure())
    assert len(t.players) == 6


def test_tournament_current_blinds() -> None:
    t = build_default_tournament()
    assert t.current_blind_level() == BlindLevel(100, 100)
    t.level_index = 3
    assert t.current_blind_level() == BlindLevel(200, 400)
