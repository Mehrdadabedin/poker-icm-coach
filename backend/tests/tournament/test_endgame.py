"""Tournament endgame reliability (A40): deep all-in / single-survivor.

The old engine hung forever in `hand_setup.blind_seats` when only one active
seat remained (a new hand was started after the elimination that left one
player) and could throw in 2-player settle paths under extreme stacks. The
tournament must now finish cleanly: when <=1 active player remains after a
hand, no new hand starts and the session enters the existing finished state
with the lone survivor as champion.
"""
from __future__ import annotations

import random

from app.game.actions import Action, ActionType
from app.game.hand_setup import blind_seats
from app.game.player import Player
from app.services.game_session import GameSession


def play_out(s: GameSession, guard: int = 5000) -> None:
    """Advance the current hand to completion (hero folds when asked)."""
    steps = 0
    while not s.engine.is_complete and steps < guard:
        actor = s.engine.current_actor
        if actor is None:
            break
        player = s.tournament.players[actor]
        if player.is_human:
            s.engine.act(actor, Action(ActionType.FOLD))
        else:
            s.engine.advance_bot(actor)
        steps += 1
    assert s.engine.is_complete, "hand did not complete"


def bots_only_session(level_index: int, stack: int, seed: int) -> GameSession:
    """A session at a given blind level with the hero permanently out."""
    s = GameSession(starting_stack=stack, fast_mode=4.0, rng=random.Random(seed))
    s.start()
    s.tournament.level_index = level_index
    play_out(s)
    hero = s.tournament.players[s.hero_seat]
    hero.stack = 0
    hero.is_eliminated = True
    hero.sit_out = True
    return s


def run_to_end(s: GameSession, max_hands: int = 80):
    """Chain next_hand until the tournament finishes (champion kept)."""
    for _ in range(max_hands):
        s.next_hand()
        alive = [p for p in s.tournament.players if not p.is_eliminated]
        if s.status == "finished" or len(alive) <= 1:
            return alive
    return [p for p in s.tournament.players if not p.is_eliminated]


def test_single_survivor_does_not_start_new_hand_or_hang() -> None:
    s = bots_only_session(level_index=8, stack=3000, seed=1)
    alive_before = [p for p in s.tournament.players if not p.is_eliminated]
    assert len(alive_before) == 8
    survivors = run_to_end(s)
    assert len(survivors) == 1
    assert s.status == "finished"
    # the winning hand completed normally; the tournament did not spin
    assert s.tournament.hand_number > 0


def test_two_player_all_in_endgame_settles_without_error() -> None:
    """The previously reported 2-player settlement path must not raise."""
    s = bots_only_session(level_index=14, stack=1200, seed=0)
    survivors = run_to_end(s, max_hands=20)
    assert len(survivors) == 1
    champion = survivors[0]
    assert not champion.is_eliminated and champion.stack >= 0
    assert s.status == "finished"


def test_deep_all_in_no_stall_multiple_seeds() -> None:
    """Previously these configurations hung or crashed; they must finish."""
    for seed in range(6):
        s = bots_only_session(level_index=14, stack=1200, seed=seed)
        survivors = run_to_end(s, max_hands=80)
        assert len(survivors) == 1, f"seed {seed}: {len(survivors)} survivors"
        assert s.status == "finished"


def test_champion_is_dynamic_bot_name() -> None:
    s = bots_only_session(level_index=8, stack=3000, seed=4)
    survivors = run_to_end(s)
    champion = survivors[0]
    # any BOT may win; the name is the real seat name, never hardcoded
    assert champion.name.startswith("Bot ")
    assert len(champion.name) > 3
    assert s.status == "finished"


def test_normal_bots_hands_unchanged() -> None:
    """Ordinary multi-player hands still play out normally (no endgame path)."""
    s = bots_only_session(level_index=0, stack=45_000, seed=3)
    for _ in range(3):
        s.next_hand()
        play_out(s)
        assert s.status == "active"  # still many players in a fresh tournament


def test_blind_seats_guards_less_than_two_players() -> None:
    player = Player("X", 100, 0)
    seats = {player.seat}
    try:
        blind_seats(0, seats, 9)
        raise AssertionError("expected ValueError for a single active seat")
    except ValueError:
        pass


def test_hero_winner_reaches_finished_champion() -> None:
    """If the sole survivor is the hero, the tournament still finishes."""
    s = GameSession(starting_stack=10_000, rng=random.Random(5))
    s.start()
    play_out(s)
    others = [p for p in s.tournament.players if not p.is_human]
    for p in others:
        p.is_eliminated = True
        p.sit_out = True
    s.next_hand()
    assert s.status == "finished"
    hero = s.tournament.players[s.hero_seat]
    assert not hero.is_eliminated
