"""Fold-rule regression tests (Atomic Part 043).

A folded player must stay folded for the whole hand: never the active player,
never able to check/call/bet/raise/all-in, never evaluated as a showdown
winner. Hero fold resolves the hand among live bots with a 5-card reveal.
"""
from __future__ import annotations

import pytest

from app.game.actions import Action, ActionType
from app.game.hand_engine import HandEngine
from app.game.player import Player
from app.tournament.tournament import Tournament


def four_players() -> list[Player]:
    return [Player(name=f"P{i}", stack=1000, seat=i) for i in range(4)]


def play_street_preflop(eng: HandEngine) -> None:
    """Drive the deterministic preflop street to completion.

    4 players, button seat 0 (SB=1, BB=2; preflop order UTG=3, then 0,1,2).
    Scripted: P3 (UTG) and P0 fold, P1 (SB) calls the blind, P2 (BB) checks.
    """
    while not eng.is_complete and eng.street == "preflop":
        actor = eng.current_actor
        if actor in (3, 0):
            eng.act(actor, Action(ActionType.FOLD))
        elif actor == 1:
            eng.act(actor, Action(ActionType.CALL, 100))
        elif actor == 2:
            eng.act(actor, Action(ActionType.CHECK))


def test_folded_bots_skipped_on_flop() -> None:
    players = four_players()
    eng = HandEngine(tournament=Tournament(players=players), button=0)
    eng.start_hand()
    play_street_preflop(eng)
    assert eng.street == "flop"
    queue = list(eng._queue)
    assert 3 not in queue and 0 not in queue, f"folded players in queue: {queue}"
    assert eng.current_actor not in (3, 0)
    # drive the flop to completion; folded seats may never act
    guard = 0
    while not eng.is_complete and guard < 200:
        guard += 1
        actor = eng.current_actor
        assert actor not in (3, 0), "folded player became active"
        if actor is None:
            break
        eng.act(actor, Action(ActionType.CHECK))
    assert eng.is_complete or eng.street in ("turn", "river")
    for seat in (3, 0):
        assert players[seat].folded


def test_folded_player_cannot_act() -> None:
    players = four_players()
    eng = HandEngine(tournament=Tournament(players=players), button=0)
    eng.start_hand()
    play_street_preflop(eng)
    assert eng.street == "flop"
    folded = 0
    # force the folded player to the front of the queue to prove the lock
    eng._queue.appendleft(folded)
    assert eng.current_actor == folded
    for action in (
        Action(ActionType.CHECK),
        Action(ActionType.CALL, 100),
        Action(ActionType.BET, 100),
        Action(ActionType.RAISE, 300),
        Action(ActionType.ALL_IN, 1000),
        Action(ActionType.FOLD),
    ):
        with pytest.raises(ValueError, match="folded and cannot act"):
            eng.act(folded, action)


def test_folded_bot_cannot_win_pot() -> None:
    players = four_players()
    eng = HandEngine(tournament=Tournament(players=players), button=0)
    eng.start_hand()
    play_street_preflop(eng)
    guard = 0
    while not eng.is_complete and guard < 400:
        guard += 1
        actor = eng.current_actor
        if actor is None:
            break
        eng.act(actor, Action(ActionType.CHECK))
    assert eng.is_complete
    assert eng.result is not None
    for seat in (3, 0):
        assert seat not in eng.result.winner_seats(), "folded player won"


def test_hero_fold_resolves_hand_with_board() -> None:
    players = four_players()
    players[0].is_human = True  # Hero folds preflop
    eng = HandEngine(tournament=Tournament(players=players), button=0)
    eng.start_hand()
    # hero is human: we must act for them
    actor = eng.current_actor
    assert actor == 0
    eng.act(0, Action(ActionType.FOLD))
    assert players[0].folded
    # remaining live bots (P1 folds too; P2 & P3 play on) resolve the hand.
    while not eng.is_complete:
        actor = eng.current_actor
        if actor is None:
            break
        if actor == 1:
            eng.act(1, Action(ActionType.FOLD))
        elif actor in (2, 3):
            facing = eng._street.current_bet > eng._street.contributions.get(actor, 0)
            eng.act(actor, Action(ActionType.CALL, 100) if facing else Action(ActionType.CHECK))
        else:  # pragma: no cover - folded hero must never act again
            pytest.fail(f"folded hero (or folded bot) became active: seat {actor}")
    assert eng.is_complete
    assert players[0].folded and players[1].folded
    result = eng.result
    assert result is not None
    assert 0 not in result.winner_seats() and 1 not in result.winner_seats(), "folded player won"
    assert 0 not in result.showed_down and 1 not in result.showed_down, "folded player at showdown"
    # P2 and P3 check down -> 5-card board + showdown between live players
    assert len(result.community_cards) == 5, f"board {result.community_cards}"
    assert set(result.showed_down) == {2, 3}
    assert sum(p.stack for p in players) == 4000  # chip conservation


def test_folded_state_resets_next_hand() -> None:
    players = four_players()
    eng = HandEngine(tournament=Tournament(players=players), button=0)
    eng.start_hand()
    play_street_preflop(eng)
    guard = 0
    while not eng.is_complete and guard < 400:
        guard += 1
        actor = eng.current_actor
        if actor is None:
            break
        eng.act(actor, Action(ActionType.CHECK))
    assert eng.is_complete
    assert players[3].folded and players[0].folded
    eng.start_hand()  # next hand
    assert all(not p.folded for p in players)
    assert eng.street == "preflop"
