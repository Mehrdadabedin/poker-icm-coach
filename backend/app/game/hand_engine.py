"""Full-hand orchestration: streets, betting rounds, showdown."""
from __future__ import annotations

import random
from collections import deque

from app.game.actions import Action, ActionType, validate_action
from app.game.betting import StreetState, apply_action
from app.game.dealer_button import next_button
from app.game.dealing import deal_hole_cards
from app.game.decision_context import build_context
from app.game.decision_provider import DecisionContext, DecisionProvider, DefaultBot
from app.game.hand_result import HandAction, HandResult
from app.game.hand_setup import (
    active_players,
    active_seats,
    first_action_order,
    in_hand_seats,
    post_blinds_and_antes,
)
from app.game.showdown import merge_winners, settle
from app.game.street_flow import (
    deal_next_street,
    next_street_or_showdown,
    owes_a_decision,
    rotate_after,
    runout_and_showdown,
    with_chips,
)
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
        self._queue = deque(with_chips(self._order("preflop", active), self._active_non_allin()))
        if not self._queue:
            # Blinds and antes can take every remaining stack, leaving nobody to
            # act. Without this the hand sat on an empty queue with no actor and
            # no result, and neither the bots nor the hero could move it on.
            self._next_street_or_showdown()

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
        big_blind = self.tournament.current_blind_level().big
        validate_action(
            action, self._street.current_bet, street_contrib, player.stack,
            self._street.last_raise, big_blind,
            can_raise=self._street.may_raise(seat, big_blind),
        )
        bet_before = self._street.current_bet
        full_raise = apply_action(self._street, player, action, street_contrib, big_blind)
        # The log records what the action actually put in, not the number the
        # caller sent. An all-in ignores the supplied amount entirely, so a bot
        # was logged at its bare stack and the hero at whatever the client sent.
        committed = self._street.contributions.get(seat)
        logged = committed if action.type not in (ActionType.FOLD, ActionType.CHECK) else None
        self._log.append(HandAction(seat, action.type.value, logged, self.street))
        # Only a full raise reopens the betting. An all-in short of one takes
        # the bet up without giving players who already acted another turn to
        # raise; apply_action's return says which happened.
        self._after_action(seat, raised=self._street.current_bet > bet_before,
                           full_raise=full_raise)

    def advance_bot(self, seat: int) -> None:
        if self.is_complete or seat != self.current_actor:
            raise ValueError("no bot action pending for that seat")
        if self.tournament.players[seat].is_human:
            raise ValueError("human seats act via act()")
        self.act(seat, self.provider.decide(self._build_context(seat)))

    # round/street flow --------------------------------------------------
    def _after_action(self, seat: int, raised: bool, full_raise: bool = True) -> None:
        in_hand = in_hand_seats(self.tournament.players)
        if len(in_hand) <= 1:
            self._finish_hand()
            return
        live = self._active_non_allin()
        if len(live) <= 1 and not owes_a_decision(self._street, live):
            # Nobody left can bet and nobody owes an answer: run the board out.
            self._runout_and_showdown()
            return
        if raised:
            order = rotate_after(
                self._order(self.street, sorted(active_seats(self.tournament.players))), seat
            )
            owed = [s for s in order if s != seat and s in live]
            if full_raise:
                self._queue = deque(owed)
            else:
                # Everyone still owes the extra chips, so they all get a turn,
                # but those who already acted may only call or fold. may_raise
                # is what enforces that, and the queue keeps the seats that had
                # not acted yet in front so their raising rights survive.
                pending = [s for s in self._queue if s != seat]
                self._queue = deque(pending + [s for s in owed if s not in pending])
        else:
            self._queue.popleft()
        if not self._queue:
            self._next_street_or_showdown()

    def _next_street_or_showdown(self) -> None:
        next_street_or_showdown(self)

    def _deal_next_street(self) -> None:
        deal_next_street(self)

    def _runout_and_showdown(self) -> None:
        runout_and_showdown(self)

    def _finish_hand(self) -> None:
        if self.is_complete:
            return
        in_hand = in_hand_seats(self.tournament.players)
        winners, showed, pot_total = settle(
            self.tournament.players, in_hand, self._board, self.tournament.ante_mode,
            self.button,
        )
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
        return build_context(self, seat)
