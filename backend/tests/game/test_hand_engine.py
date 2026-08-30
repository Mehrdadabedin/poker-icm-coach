"""Hand engine (street flow) tests (Atomic Part 014)."""
from __future__ import annotations

import random

import pytest

from app.game.actions import Action, ActionType
from app.game.decision_provider import DefaultBot, ScriptedProvider
from app.game.hand_engine import HandEngine
from app.game.player import Player
from app.tournament.tournament import Tournament


def engine_with(players: list[Player], **kw) -> HandEngine:
    t = Tournament(players=players)
    return HandEngine(tournament=t, provider=DefaultBot(), **kw)


def hu_players() -> list[Player]:
    return [Player(name="P0", stack=1000, seat=0), Player(name="P1", stack=1000, seat=1)]


def three_players() -> list[Player]:
    return [Player(name=f"P{i}", stack=1000, seat=i) for i in range(3)]


def test_scripted_provider() -> None:
    sp = ScriptedProvider({0: [Action(ActionType.CALL, 50)]})
    from app.game.decision_provider import DecisionContext

    ctx = DecisionContext(seat=0, hole_cards=[], board=[], street="preflop", pot=0,
                          current_bet=50, contribution=0, stack=1000, big_blind=50,
                          legal_actions=[Action(ActionType.CALL, 50)])
    assert sp.decide(ctx).type == ActionType.CALL
    # script exhausted -> fallback fold
    assert sp.decide(ctx).type == ActionType.FOLD


def test_hand_engine_initial_state() -> None:
    eng = engine_with(hu_players())
    eng.start_hand()
    assert eng.street == "preflop"
    assert eng.current_actor is not None
    # blinds posted (100/100 at level 1)
    assert sum(p.bet_total for p in eng.tournament.players) == 200
    assert eng.tournament.button == 1  # rotated from seat 0


def test_bb_wins_when_all_fold() -> None:
    players = three_players()
    # dealer seat 0 initially; button rotates to 1? determine actors by script
    eng = HandEngine(tournament=Tournament(players=players), provider=DefaultBot(), button=0)
    eng.start_hand()
    while not eng.is_complete:
        actor = eng.current_actor
        if actor is None:
            break
        eng.act(actor, Action(ActionType.FOLD))
    assert eng.is_complete
    result = eng.result
    assert result is not None
    assert len(result.winners) == 1
    winner = eng.tournament.players[result.winner_seats()[0]]
    # BB walked the blinds (100/100): stack 1000 - 100 posted + 200 pot
    assert winner.stack == 1000 - 100 + 200


def test_check_down_to_showdown_hu() -> None:
    eng = engine_with(hu_players())
    eng.start_hand()
    # preflop: SB (P... first actor) completes, BB checks; then check down
    while not eng.is_complete:
        actor = eng.current_actor
        if actor is None:
            break
        # call if facing a bet, else check (DefaultBot does this)
        eng.advance_bot(actor)
    assert eng.is_complete
    result = eng.result
    assert result is not None
    assert len(result.showed_down) == 2
    # pot fully distributed -> conservation
    total = sum(p.stack for p in eng.tournament.players)
    assert total == 2000


def test_hero_raise_and_showdown() -> None:
    players = hu_players()
    players[0].is_human = True
    eng = HandEngine(tournament=Tournament(players=players), provider=DefaultBot(), button=0)
    eng.start_hand()
    hero_acted = False
    guard = 0
    while not eng.is_complete and guard < 400:
        guard += 1
        actor = eng.current_actor
        if actor is None:
            break
        if eng.hero_must_act():
            if not hero_acted:
                # hero raises once (first turn), then plays passively
                eng.act(actor, Action(ActionType.RAISE, eng.tournament.current_blind_level().big * 2))
                hero_acted = True
            elif eng._street.current_bet > eng._street.contributions.get(actor, 0):
                eng.act(actor, Action(ActionType.CALL))
            else:
                eng.act(actor, Action(ActionType.CHECK))
        else:
            eng.advance_bot(actor)
    assert eng.is_complete, f"hand did not finish (guard {guard})"
    assert sum(p.stack for p in eng.tournament.players) == 2000
    assert hero_acted


def test_random_hands_conserve_chips() -> None:
    rng = random.Random(2024)
    for trial in range(30):
        players = [Player(name=f"P{i}", stack=45000, seat=i) for i in range(9)]
        t = Tournament(players=players, button=rng.randrange(9))
        eng = HandEngine(tournament=t, provider=DefaultBot(), rng=rng)
        eng.start_hand()
        guard = 0
        while not eng.is_complete and guard < 500:
            guard += 1
            actor = eng.current_actor
            eng.advance_bot(actor)
        assert eng.is_complete, f"hand {trial} did not finish"
        total = sum(p.stack for p in players)
        assert total == 9 * 45000, f"trial {trial}: chips {total}"


def test_invalid_actor_order_rejected() -> None:
    players = three_players()
    eng = HandEngine(tournament=Tournament(players=players), provider=DefaultBot(), button=0)
    eng.start_hand()
    wrong = (eng.current_actor + 1) % 3
    with pytest.raises(ValueError):
        eng.act(wrong, Action(ActionType.FOLD))
