"""Dealing the next street, and running the board out when nobody can act.

Split out of hand_engine.py, which owns the betting flow and was at the
200-line cap. These are the board-dealing steps that flow triggers.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from app.game.actions import amount_to_call
from app.game.dealing import deal_flop, deal_river, deal_turn

if TYPE_CHECKING:  # pragma: no cover - import cycle guard
    from app.game.betting import StreetState
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


def owes_a_decision(street: StreetState, live: list[int]) -> bool:
    """True while someone with chips still has to call or fold.

    Heads up, the small blind shoving left one player with chips, and the hand
    ran the board out without ever asking them.
    """
    return any(amount_to_call(street.current_bet, street.contributions.get(s, 0)) > 0 for s in live)


def rotate_after(order: list[int], seat: int) -> list[int]:
    """The same seat order, starting at the seat after this one.

    A raise reopens the action clockwise from the raiser. Rebuilding from the
    street's first seat gave a player who had already acted another turn before
    someone else had taken a first one.
    """
    if seat not in order:
        return order
    index = order.index(seat)
    return order[index + 1:] + order[: index + 1]


def with_chips(seats: list[int], live: list[int]) -> list[int]:
    """Only seats that can still put chips in get a turn.

    A blind or an ante can take a short stack's last chip, and that seat was
    still queued to act, then offered FOLD as its only legal action. It is
    all-in already and owes nothing.
    """
    playable = set(live)
    return [seat for seat in seats if seat in playable]
