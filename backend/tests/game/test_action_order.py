"""Whose turn it is after a raise, and who still owes an answer.

Two defects: the action queue was rebuilt from the street's first seat instead
of from the seat after the raiser, and a hand where only one player had chips
left ran the board out even when that player still owed a call.
"""
from __future__ import annotations

import random

from app.game.actions import Action, ActionType
from app.game.betting import StreetState
from app.game.street_flow import owes_a_decision, rotate_after
from app.services.game_session import GameSession


def test_a_raise_puts_the_seat_after_the_raiser_first() -> None:
    """Flop order A, B, C, D. C raises, so D acts before A comes back."""
    assert rotate_after([0, 1, 2, 3], 2) == [3, 0, 1, 2]
    assert rotate_after([0, 1, 2, 3], 0) == [1, 2, 3, 0]
    assert rotate_after([0, 1, 2, 3], 3) == [0, 1, 2, 3]


def test_rotating_on_a_seat_not_in_the_order_leaves_it_alone() -> None:
    assert rotate_after([0, 1, 2], 7) == [0, 1, 2]


def test_a_player_who_owes_chips_is_owed_a_turn() -> None:
    street = StreetState()
    street.current_bet = 500
    street.contributions = {1: 200}
    assert owes_a_decision(street, [1]) is True
    street.contributions[1] = 500
    assert owes_a_decision(street, [1]) is False
    assert owes_a_decision(street, []) is False


def test_the_last_player_with_chips_answers_an_all_in() -> None:
    """Heads up, one player shoves. The other has chips and owes a call, so the
    hand must not run the board out before asking them."""
    checked = 0
    for seed in range(40):
        session = GameSession(starting_stack=10_000, fast_mode=1.0, rng=random.Random(seed))
        # The builder always seats nine. Eliminating seven leaves two live,
        # which is how the engine reaches heads up in a real tournament.
        for player in session.tournament.players[2:]:
            player.is_eliminated = True
            player.stack = 0
        session.start()
        engine = session.engine
        assert engine is not None
        actor = engine.current_actor
        if engine.is_complete or actor is None:
            continue

        before = len(engine._log)
        engine.act(actor, Action(ActionType.ALL_IN, is_all_in=True))
        checked += 1
        opponent = next(s for s in (0, 1) if s != actor)
        # Only what happened after the shove counts. The opponent acting earlier
        # in the same hand says nothing about whether they answered it.
        answered = [a for a in engine._log[before:] if a.seat == opponent]
        assert answered or engine.current_actor == opponent, (
            f"seed {seed}: the shove ended the hand without seat {opponent} answering"
        )
    assert checked, "no seeded hand reached a heads-up shove"


def test_every_seat_acts_before_anyone_acts_twice() -> None:
    """Over many hands, no seat gets a second turn on a street before every
    other live seat has had a first. That is what the rotation protects."""
    for seed in range(40):
        session = GameSession(starting_stack=45_000, fast_mode=1.0, rng=random.Random(seed))
        session.start()
        engine = session.engine
        guard = 0
        while not engine.is_complete and guard < 500:
            actor = engine.current_actor
            if actor is None:
                break
            if session.tournament.players[actor].is_human:
                engine.act(actor, Action(ActionType.FOLD))
            else:
                engine.advance_bot(actor)
            guard += 1

        seen: dict[str, list[int]] = {}
        for entry in engine._log:
            seen.setdefault(entry.street, []).append(entry.seat)
        for street, seats in seen.items():
            first_pass: list[int] = []
            for seat in seats:
                if seat in first_pass:
                    break
                first_pass.append(seat)
            repeats = [s for s in seats[len(first_pass):] if s not in first_pass]
            assert not repeats, (
                f"seed {seed} street {street}: {repeats} acted only after a seat's second turn"
            )


def test_a_seat_all_in_on_its_blind_is_not_asked_to_act() -> None:
    """A blind or an ante can take a short stack's last chip. That seat used to
    be queued anyway and offered FOLD as its only legal action, which asks a
    player to fold a hand they are already all-in on."""
    session = GameSession(starting_stack=45_000, fast_mode=1.0, rng=random.Random(5))
    tournament = session.tournament
    tournament.ante_mode = "traditional"
    for seat, player in enumerate(tournament.players):
        if seat > 2:
            player.is_eliminated = True
            player.stack = 0
    tournament.players[0].stack = 5  # cannot cover the ante, let alone a blind
    session.start()
    engine = session.engine
    assert engine is not None

    assert tournament.players[0].stack == 0, "the short stack should be all-in on the post"
    assert 0 not in engine._queue, "an all-in seat was queued to act"
    while not engine.is_complete and engine.current_actor is not None:
        actor = engine.current_actor
        assert tournament.players[actor].stack > 0, f"seat {actor} has no chips but was asked to act"
        if tournament.players[actor].is_human:
            engine.act(actor, Action(ActionType.FOLD))
        else:
            engine.advance_bot(actor)
