"""Dealing the next street, and running the board out when nobody can act.

Split out of hand_engine.py, which owns the betting flow and was at the
200-line cap. These are the board-dealing steps that flow triggers.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from app.game.dealing import deal_flop, deal_river, deal_turn

if TYPE_CHECKING:  # pragma: no cover - import cycle guard
    from app.game.hand_engine import HandEngine


def deal_next_street(engine: HandEngine) -> None:
    """Turn one more card face up, or finish the hand after the river."""
    assert engine._deck is not None
    if engine.street == "preflop":
        engine._board.extend(deal_flop(engine._deck))
        engine.street = "flop"
    elif engine.street == "flop":
        engine._board.append(deal_turn(engine._deck)[0])
        engine.street = "turn"
    elif engine.street == "turn":
        engine._board.append(deal_river(engine._deck)[0])
        engine.street = "river"
    else:
        engine._finish_hand()


def runout_and_showdown(engine: HandEngine) -> None:
    """Nobody left has chips to bet, so deal the rest of the board and settle."""
    assert engine._deck is not None
    if engine.street == "preflop":
        engine._board.extend(deal_flop(engine._deck))
    if engine.street in ("preflop", "flop"):
        engine._board.append(deal_turn(engine._deck)[0])
    if engine.street in ("preflop", "flop", "turn"):
        engine._board.append(deal_river(engine._deck)[0])
    engine.street = "river"
    engine._finish_hand()
