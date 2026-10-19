"""End the tournament early and place everyone by their chips (plan 092).

Once the hero has lost the all-in and does not re-enter, they can end the
game instead of watching the bots finish it. The players still in are placed
by their chips, the chip leader first; the players already out keep the
places they went out in. The owner's example: Emma with 269,000 is 1st, David
with 156,000 2nd, and so on to 9th.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from app.services import history_archive

if TYPE_CHECKING:  # pragma: no cover - import cycle guard
    from app.game.player import Player
    from app.services.game_session import GameSession


def _chips(session: GameSession, player: Player) -> int:
    # chips already in an unfinished pot still belong to the player who bet them
    hand_open = session.engine is not None and not session.engine.is_complete
    return player.stack + (player.committed if hand_open else 0)


def standings(session: GameSession) -> list[dict]:
    """Every seat from 1st to last, as the table stands now."""
    assert session.tournament is not None
    players = session.tournament.players
    still_in = sorted((p for p in players if not p.is_eliminated),
                      key=lambda p: (-_chips(session, p), p.seat))
    out = sorted((p for p in players if p.is_eliminated),
                 key=lambda p: (session.finish_places.get(p.seat, len(players)), p.seat))
    return [
        {"place": place, "seat": p.seat, "name": p.name, "chips": _chips(session, p),
         "isHero": p.is_human, "out": p.is_eliminated}
        for place, p in enumerate(still_in + out, start=1)
    ]


def end_by_chips(session: GameSession) -> None:
    """Finish the tournament now. Only a hero who is out may end it: a hero
    with chips would be ending a game they could still win."""
    assert session.tournament is not None
    if session.final_standings is not None:
        return
    hero = session.tournament.players[session.hero_seat]
    if not (hero.is_eliminated or hero.awaiting_reentry):
        raise ValueError("the game can be ended only after you are out")
    session.final_standings = standings(session)
    session.status = "finished"
    session.hero_finish_place = next(r["place"] for r in session.final_standings if r["isHero"])
    history_archive.archive.save_tournament(session)
