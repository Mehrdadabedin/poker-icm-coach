"""The decision a bot is facing, assembled from the live hand.

Split out of hand_engine.py, which owns the flow of a hand and was at the
200-line cap. Turning engine state into a DecisionContext is translation for
the AI, not part of that flow.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from app.game.actions import legal_actions
from app.game.decision_provider import DecisionContext
from app.game.positions import position_for

if TYPE_CHECKING:  # pragma: no cover - import cycle guard
    from app.game.hand_engine import HandEngine


def build_context(engine: HandEngine, seat: int) -> DecisionContext:
    """What the seat can see and do right now."""
    tournament = engine.tournament
    player = tournament.players[seat]
    street = engine._street
    contribution = street.contributions.get(seat, 0)
    big_blind = tournament.current_blind_level().big
    return DecisionContext(
        seat=seat,
        hole_cards=list(player.hole_cards),
        board=list(engine._board),
        street=engine.street,
        pot=sum(p.committed for p in tournament.players),
        current_bet=street.current_bet,
        contribution=contribution,
        stack=player.stack,
        big_blind=big_blind,
        legal_actions=legal_actions(
            street.current_bet, contribution, player.stack, big_blind,
            street.last_raise, can_raise=street.may_raise(seat, big_blind),
        ),
        position=position_for(engine.button, seat, len(tournament.players)),
        action_history=[(a.seat, a.action, a.amount) for a in engine._log],
    )
