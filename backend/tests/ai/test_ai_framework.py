"""Computer AI framework tests (Atomic Part 017)."""
from __future__ import annotations

import random

from app.ai.ai_framework import AIDecisionProvider, decide_for_seat
from app.game.actions import Action, ActionType
from app.game.decision_provider import DefaultBot
from app.game.hand_engine import HandEngine
from app.game.player import Player
from app.tournament.tournament import Tournament


def test_ai_framework_implements_provider() -> None:
    ai = AIDecisionProvider(rng=random.Random(1))
    # monkey-patched strategy: framework must expose a decide(ctx) that delegates
    assert callable(ai.decide)


def test_ai_never_sees_opponent_hole_cards() -> None:
    players = [Player(name=f"P{i}", stack=45000, seat=i) for i in range(9)]
    t = Tournament(players=players)
    # make seat 0 human hero so the AI focuses on bots
    t.players[0].is_human = True
    eng = HandEngine(tournament=t, provider=DefaultBot(), rng=random.Random(3))
    eng.start_hand()
    # sample a bot decision context and audit its contents
    for seat in range(1, 9):
        if eng.current_actor == seat:
            ctx = eng._build_context(seat)
            assert len(ctx.hole_cards) == 2
            # hole cards of OTHER seats must not appear in ctx
            for other in range(9):
                if other != seat:
                    for card in t.players[other].hole_cards:
                        assert card not in ctx.hole_cards
            break
    else:
        raise AssertionError("no bot was the current actor")


def test_ai_returns_legal_actions() -> None:
    players = [Player(name=f"P{i}", stack=45000, seat=i) for i in range(9)]
    t = Tournament(players=players)
    t.players[0].is_human = True
    rng = random.Random(11)
    eng = HandEngine(tournament=t, provider=AIDecisionProvider(rng=rng), rng=rng)
    eng.start_hand()
    guard = 0
    while not eng.is_complete and guard < 2000:
        guard += 1
        actor = eng.current_actor
        if actor is None:
            break
        p = eng.tournament.players[actor]
        if p.is_human:
            # hero plays passively to keep the hand moving
            street_contrib = eng._street.contributions.get(actor, 0)
            if eng._street.current_bet > street_contrib:
                eng.act(actor, Action(ActionType.CALL))
            else:
                eng.act(actor, Action(ActionType.CHECK))
        else:
            eng.advance_bot(actor)
    assert eng.is_complete
    # conservation invariant holds with AI acting
    assert sum(p.stack for p in players) == 9 * 45000


def test_full_nine_player_ai_hand_conserves_chips() -> None:
    """Integration: 1 hero + 8 AI opponents play a full hand, chips conserved."""
    players = [Player(name="Hero", stack=45000, seat=0, is_human=True)]
    for i in range(1, 9):
        players.append(Player(name=f"Bot{i}", stack=45000, seat=i))
    t = Tournament(players=players, ante_mode="traditional")
    rng = random.Random(42)
    eng = HandEngine(tournament=t, provider=AIDecisionProvider(rng=rng), rng=rng)
    eng.start_hand()
    guard = 0
    while not eng.is_complete and guard < 3000:
        actor = eng.current_actor
        if actor is None:
            break
        p = eng.tournament.players[actor]
        if p.is_human:
            street_contrib = eng._street.contributions.get(actor, 0)
            to_call = max(0, eng._street.current_bet - street_contrib)
            if to_call == 0:
                eng.act(actor, Action(ActionType.CHECK))
            elif to_call >= p.stack:
                eng.act(actor, Action(ActionType.ALL_IN, amount=p.stack, is_all_in=True))
            else:
                eng.act(actor, Action(ActionType.CALL, amount=to_call))
        else:
            eng.advance_bot(actor)
        guard += 1
    assert eng.is_complete
    assert sum(p.stack for p in players) == 9 * 45000


def test_decide_for_seat_delegation() -> None:
    players = [Player(name=f"P{i}", stack=45000, seat=i) for i in range(3)]
    t = Tournament(players=players)
    eng = HandEngine(tournament=t, provider=AIDecisionProvider(rng=random.Random(2)), rng=random.Random(2))
    eng.start_hand()
    seed_state = (eng._street.current_bet, eng.street)
    action = decide_for_seat(eng, eng.current_actor)
    assert isinstance(action, Action)
    assert action.type in {a.type for a in eng._build_context(eng.current_actor).legal_actions}
    # engine state must be unchanged by a pure decision query
    assert (eng._street.current_bet, eng.street) == seed_state
