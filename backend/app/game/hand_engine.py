"""Full-hand orchestration: streets, betting rounds, showdown."""
from __future__ import annotations

import random
from collections import deque

from app.game.actions import Action, legal_actions, validate_action
from app.game.betting import StreetState, apply_action
from app.game.dealer_button import next_button
from app.game.dealing import deal_flop, deal_hole_cards, deal_river, deal_turn
from app.game.decision_provider import DecisionContext, DecisionProvider, DefaultBot
from app.game.hand_result import HandAction, HandResult
from app.game.hand_setup import (
    active_players,
    active_seats,
    first_action_order,
    in_hand_seats,
    post_blinds_and_antes,
)
from app.game.positions import position_for
from app.game.showdown import merge_winners, settle
from app.poker.deck import Deck
from app.tournament.tournament import Tournament


class HandEngine:
    """Authoritative one-hand state machine driven by legal actions."""

    def __init__(
        self,
        tournament: Tournament,
        provider: DecisionProvider | None = None,
        button: int | None = None,
        rng: random.Random | None = None,
    ) -> None:
        self.tournament = tournament
        self.provider = provider if provider is not None else DefaultBot()
        self.rng = rng if rng is not None else random.Random()
        self.button = button if button is not None else tournament.button
        self.street = "idle"
        self.is_complete = False
        self.result: HandResult | None = None
        self._street = StreetState()
        self._queue: deque[int] = deque()
        self._deck: Deck | None = None
        self._board: list = []
        self._log: list[HandAction] = []
        self._starting: dict[int, int] = {}

    # public API ---------------------------------------------------------
    def start_hand(self) -> None:
        self.tournament.next_hand()
        self._starting = {p.seat: p.stack for p in self.tournament.players}
        self._log, self._board = [], []
        self._street = StreetState()
        self.street, self.is_complete, self.result = "idle", False, None
        active = sorted(active_seats(self.tournament.players))
        self.button = self.tournament.button = next_button(
            self.button, len(self.tournament.players), set(active)
        )
        post_blinds_and_antes(self.tournament, self._street)
        self._deck = Deck(self.rng)
        self._deck.shuffle()
        deal_hole_cards(active_players(self.tournament.players), self._deck)
        self.street = "preflop"
        self._queue = deque(self._order("preflop", active))

    @property
    def current_actor(self) -> int | None:
        return self._queue[0] if self._queue else None

    def hero_must_act(self) -> bool:
        actor = self.current_actor
        return actor is not None and self.tournament.players[actor].is_human and not self.is_complete

    def act(self, seat: int, action: Action) -> None:
        if self.is_complete:
            raise ValueError("hand already complete")
        if seat != self.current_actor:
            raise ValueError(f"seat {seat} is not the current actor")
        player = self.tournament.players[seat]
        if player.folded:  # folded players are permanently out of the hand
            raise ValueError(f"seat {seat} folded and cannot act again")
        street_contrib = self._street.contributions.get(seat, 0)
        validate_action(
            action, self._street.current_bet, street_contrib, player.stack,
            self._street.last_raise, self.tournament.current_blind_level().big,
        )
        bet_before = self._street.current_bet
        apply_action(self._street, player, action, street_contrib)
        self._log.append(HandAction(seat, action.type.value, action.amount, self.street))
        self._after_action(seat, raised=self._street.current_bet > bet_before)

    def advance_bot(self, seat: int) -> None:
        if self.is_complete or seat != self.current_actor:
            raise ValueError("no bot action pending for that seat")
        if self.tournament.players[seat].is_human:
            raise ValueError("human seats act via act()")
        self.act(seat, self.provider.decide(self._build_context(seat)))

    # round/street flow --------------------------------------------------
    def _after_action(self, seat: int, raised: bool) -> None:
        in_hand = in_hand_seats(self.tournament.players)
        if len(in_hand) <= 1:
            self._finish_hand()
            return
        if len(self._active_non_allin()) <= 1:
            # everyone left is all-in (or only one has chips left): run the board out
            self._runout_and_showdown()
            return
        if raised:
            order = self._order(self.street, sorted(active_seats(self.tournament.players)))
            self._queue = deque(s for s in order if s != seat and s in self._active_non_allin())
        else:
            self._queue.popleft()
        if not self._queue:
            self._next_street_or_showdown()

    def _next_street_or_showdown(self) -> None:
        in_hand = in_hand_seats(self.tournament.players)
        if len(in_hand) <= 1 or all(
            self.tournament.players[s].stack == 0 for s in in_hand
        ):
            self._runout_and_showdown() if len(in_hand) > 1 else self._finish_hand()
            return
        self._deal_next_street()
        self._street = StreetState()
        # New street: only in-hand (non-folded) players may act.
        active = sorted(in_hand_seats(self.tournament.players))
        self._queue = deque(self._order(self.street, active))

    def _deal_next_street(self) -> None:
        assert self._deck is not None
        if self.street == "preflop":
            self._board.extend(deal_flop(self._deck))
            self.street = "flop"
        elif self.street == "flop":
            self._board.append(deal_turn(self._deck)[0])
            self.street = "turn"
        elif self.street == "turn":
            self._board.append(deal_river(self._deck)[0])
            self.street = "river"
        else:
            self._finish_hand()

    def _runout_and_showdown(self) -> None:
        assert self._deck is not None
        if self.street == "preflop":
            self._board.extend(deal_flop(self._deck))
            self._board.append(deal_turn(self._deck)[0])
            self._board.append(deal_river(self._deck)[0])
        elif self.street == "flop":
            self._board.append(deal_turn(self._deck)[0])
            self._board.append(deal_river(self._deck)[0])
        elif self.street == "turn":
            self._board.append(deal_river(self._deck)[0])
        self.street = "river"
        self._finish_hand()

    def _finish_hand(self) -> None:
        if self.is_complete:
            return
        in_hand = in_hand_seats(self.tournament.players)
        winners, showed, pot_total = settle(self.tournament.players, in_hand, self._board)
        self.is_complete = True
        self.street = "complete"
        self.result = HandResult(
            hand_number=self.tournament.hand_number, button=self.button,
            community_cards=list(self._board), actions=list(self._log),
            hole_cards={p.seat: list(p.hole_cards) for p in self.tournament.players},
            starting_stacks=dict(self._starting),
            ending_stacks={p.seat: p.stack for p in self.tournament.players},
            pot_total=pot_total, winners=merge_winners(winners), showed_down=showed,
            folded=[p.seat for p in self.tournament.players if p.folded],
        )

    # helpers -------------------------------------------------------------
    def _order(self, street: str, active: list[int]) -> list[int]:
        return first_action_order(street, self.button, active, len(self.tournament.players))

    def _active_non_allin(self) -> list[int]:
        return [p.seat for p in active_players(self.tournament.players) if not p.folded and p.stack > 0]

    def _build_context(self, seat: int) -> DecisionContext:
        p = self.tournament.players[seat]
        street_contrib = self._street.contributions.get(seat, 0)
        legal = legal_actions(
            self._street.current_bet, street_contrib, p.stack,
            self.tournament.current_blind_level().big, self._street.last_raise,
        )
        return DecisionContext(
            seat=seat, hole_cards=list(p.hole_cards), board=list(self._board),
            street=self.street,
            pot=sum(pl.bet_total for pl in self.tournament.players),
            current_bet=self._street.current_bet, contribution=street_contrib,
            stack=p.stack, big_blind=self.tournament.current_blind_level().big,
            legal_actions=legal,
            position=position_for(self.button, seat, len(self.tournament.players)),
            action_history=[(a.seat, a.action, a.amount) for a in self._log],
        )
