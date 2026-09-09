"""Fold-rule regression tests (Atomic Part 043).

A folded player must stay folded for the whole hand: never the active player,
never able to check/call/bet/raise/all-in, never evaluated as a showdown
winner. Hero fold resolves the hand among live bots with a 5-card reveal.

Note: these tests drive the engine by ROLE (SB/BB/first-actor), so they stay
correct regardless of which physical seat posts the blinds under the
clockwise dealer rotation.
"""
from __future__ import annotations

import pytest

from app.game.actions import Action, ActionType
from app.game.hand_engine import HandEngine
from app.game.player import Player
from app.tournament.tournament import Tournament


def four_players() -> list[Player]:
    return [Player(name=f"P{i}", stack=1000, seat=i) for i in range(4)]


def blind_contributors(eng: HandEngine) -> dict[int, int]:
    """Seat -> chips posted as blinds on the current street."""
    return {
        seat: amt for seat, amt in eng._street.contributions.items()
        if amt > 0 and eng.tournament.players[seat].bet_total == amt
    }


def play_street_preflop(eng: HandEngine, fold_seats: set[int]) -> None:
    """Drive the deterministic preflop street to completion.

    Seats in `fold_seats` fold; every other seat plays the legal minimal
    action: call the blind amount if not yet matched, otherwise check (the
    blind posters already match the current bet).
    """
    while not eng.is_complete and eng.street == "preflop":
        actor = eng.current_actor
        if actor in fold_seats:
            eng.act(actor, Action(ActionType.FOLD))
        else:
            facing = eng._street.current_bet > eng._street.contributions.get(actor, 0)
            eng.act(actor, Action(ActionType.CALL, 100) if facing else Action(ActionType.CHECK))


def drive_checkdown(eng: HandEngine, guard: int = 400) -> None:
    while not eng.is_complete and guard > 0:
        guard -= 1
        actor = eng.current_actor
        if actor is None:
            break
        facing = eng._street.current_bet > eng._street.contributions.get(actor, 0)
        eng.act(actor, Action(ActionType.CALL, 100) if facing else Action(ActionType.CHECK))


def test_folded_bots_skipped_on_flop() -> None:
    players = four_players()
    eng = HandEngine(tournament=Tournament(players=players), button=0)
    eng.start_hand()
    sb = blind_contributors(eng)
    assert len(sb) == 2  # exactly SB + BB post blinds
    folded_seats = {min(sb), max(sb)}  # fold the two blind posters -> fold-rule probe
    play_street_preflop(eng, folded_seats)
    assert eng.street == "flop"
    queue = list(eng._queue)
    for seat in folded_seats:
        assert seat not in queue, f"folded {seat} still in queue {queue}"
    assert eng.current_actor not in folded_seats
    guard = 200
    while not eng.is_complete and guard > 0:
        guard -= 1
        actor = eng.current_actor
        assert actor not in folded_seats, "folded player became active"
        if actor is None:
            break
        facing = eng._street.current_bet > eng._street.contributions.get(actor, 0)
        eng.act(actor, Action(ActionType.CALL, 100) if facing else Action(ActionType.CHECK))
    assert eng.is_complete or eng.street in ("turn", "river")
    for seat in folded_seats:
        assert players[seat].folded


def test_folded_player_cannot_act() -> None:
    players = four_players()
    eng = HandEngine(tournament=Tournament(players=players), button=0)
    eng.start_hand()
    sb = blind_contributors(eng)
    folded_seats = {min(sb), max(sb)}
    play_street_preflop(eng, folded_seats)
    assert eng.street == "flop"
    folded = next(iter(folded_seats))
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
    sb = blind_contributors(eng)
    folded_seats = {min(sb), max(sb)}
    play_street_preflop(eng, folded_seats)
    drive_checkdown(eng)
    assert eng.is_complete
    assert eng.result is not None
    for seat in folded_seats:
        assert seat not in eng.result.winner_seats(), "folded player won"


def test_hero_fold_resolves_hand_with_board() -> None:
    players = four_players()
    players[0].is_human = True  # Hero is a fixed seat and folds preflop
    eng = HandEngine(tournament=Tournament(players=players), button=0)
    eng.start_hand()
    # advance until it is the hero's turn in the preflop queue
    guard = 40
    while eng.current_actor != 0 and guard > 0:
        guard -= 1
        eng.advance_bot(eng.current_actor)
    assert eng.current_actor == 0
    eng.act(0, Action(ActionType.FOLD))
    assert players[0].folded
    # remaining live bots resolve the hand.
    while not eng.is_complete:
        actor = eng.current_actor
        if actor is None:
            break
        facing = eng._street.current_bet > eng._street.contributions.get(actor, 0)
        eng.act(actor, Action(ActionType.FOLD) if facing else Action(ActionType.CHECK))
    assert eng.is_complete
    assert players[0].folded
    result = eng.result
    assert result is not None
    assert 0 not in result.winner_seats(), "folded player won"
    assert 0 not in result.showed_down, "folded player at showdown"
    assert len(result.community_cards) == 5, f"board {result.community_cards}"
    assert sum(p.stack for p in players) == 4000  # chip conservation


def test_folded_state_resets_next_hand() -> None:
    players = four_players()
    eng = HandEngine(tournament=Tournament(players=players), button=0)
    eng.start_hand()
    sb = blind_contributors(eng)
    folded_seats = {min(sb), max(sb)}
    play_street_preflop(eng, folded_seats)
    drive_checkdown(eng)
    assert eng.is_complete
    assert all(p.folded for p in players if p.seat in folded_seats)
    eng.start_hand()  # next hand
    assert all(not p.folded for p in players)
    assert eng.street == "preflop"
