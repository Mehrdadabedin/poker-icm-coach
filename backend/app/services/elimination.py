"""Re-entry vs permanent-elimination bookkeeping (A39) and the hero's
finishing place (A44).

Elimination happens at the start of `next_hand` after a hand completes:
busted players either re-enter (levels 1-5) or are eliminated. When several
players bust in the same hand they are placed by the stack they started the
hand with (larger stack places higher).
"""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:  # runtime import would cycle: session imports this module
    from app.services.game_session import GameSession


def apply_reentry_or_elimination(session: GameSession) -> None:
    """A39: BOTs re-enter through Level 5; the hero is parked awaiting
    re-entry (or eliminated after L5), never auto-restored.

    A44: a busted hero records `hero_finish_place` = players still alive
    after this hand + 1; simultaneous busts are ordered by the stack they
    started the hand with, larger stack first.
    """
    assert session.tournament is not None
    level = session.tournament.level_index
    busted: list[tuple[int, int]] = []
    for player in session.tournament.players:
        if player.is_eliminated or player.stack > 0:
            continue
        if level < session.REENTRY_LEVELS:
            if player.is_human:
                player.awaiting_reentry = True
                player.sit_out = True
            else:
                player.stack = session.tournament_starting_stack
            continue
        starts = (session.engine.result.starting_stacks
                  if session.engine and session.engine.result is not None else {})
        busted.append((player.seat, starts.get(player.seat, 0)))
        player.eliminate()
        player.awaiting_reentry = False
    if not busted:
        return
    alive = sum(1 for p in session.tournament.players if not p.is_eliminated)
    busted.sort(key=lambda item: item[1], reverse=True)
    for offset, (seat, _) in enumerate(busted):
        if seat == session.hero_seat:
            session.hero_finish_place = alive + 1 + offset


def is_final_hand(session: GameSession) -> bool:
    """The completed hand leaves at most one player with chips and nobody can
    re-enter (BOTs re-enter through Level 5, A39)."""
    assert session.tournament is not None
    if session.tournament.level_index < session.REENTRY_LEVELS:
        return False
    holders = sum(1 for p in session.tournament.players
                  if not p.is_eliminated and p.stack > 0)
    return holders <= 1
