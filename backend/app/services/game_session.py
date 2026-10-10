"""GameSession: backend-authoritative table state for one tournament."""
from __future__ import annotations

import random
import threading
import time
import uuid

from app.ai.ai_framework import AIDecisionProvider
from app.game.actions import Action, ActionType
from app.game.hand_engine import HandEngine
from app.services import hand_history
from app.services.elimination import apply_reentry_or_elimination, is_final_hand
from app.services.game_state_view import build_state_view
from app.services.hand_history import HandDecision, HandHistoryStore
from app.services.session_coach import advice_dict, coach_request, grade_last_action
from app.services.session_record import build_record, decision_verdict
from app.services.session_store import mark_finished
from app.strategy.coach import Coach, CoachRequest
from app.tournament.tournament import build_default_tournament
from app.tournament.tournament_timer import TournamentTimer


class GameSession:
    """Owns one table; every public entry takes self._lock (reentrant)."""
    REENTRY_LEVELS = 5  # re-entry available only through Level 5 (index < 5)

    def __init__(self, session_id: str | None = None, fast_mode: float = 1.0,
                 rng: random.Random | None = None, starting_stack: int = 45_000,
                 small_blind: int = 100, big_blind: int = 100, level_minutes: int = 20,
                 owner: str | None = None, table_label: str | None = None,
                 hero_name: str = "Hero", history_dir: str | None = None,
                 bot_profile: str | None = None, bot_profiles: list[str] | None = None) -> None:
        self.session_id = session_id or uuid.uuid4().hex[:12]
        self.owner = owner  # authenticated username that owns this tournament
        self.table_label = table_label or self.session_id
        self.created_at = time.time()
        self.status = "active"
        self.hero_finish_place: int | None = None
        self.last_seen = self.created_at
        self.idle_timeout = 30 * 60
        self.history_dir = history_dir or ""
        self.tournament_starting_stack = starting_stack
        self.tournament = build_default_tournament(
            starting_stack=starting_stack, small_blind=small_blind,
            big_blind=big_blind, level_minutes=level_minutes, hero_name=hero_name)
        self.hero_seat = 0
        self.rng = rng or random.Random()
        self.provider = AIDecisionProvider(rng=self.rng)
        self.bot_profile = bot_profile
        self.bot_profiles = bot_profiles
        if bot_profile is not None:
            from app.ai.personalities import profile_for
            self.provider.personality = profile_for(bot_profile)
        if bot_profiles is not None:
            from app.ai.personalities import personalities_for_seats
            self.provider.seat_personalities = personalities_for_seats(bot_profiles)
        lineup = bot_profiles or ([bot_profile] * 8 if bot_profile else None)
        if lineup:
            from app.ai.personalities import display_bot_names
            for seat, disp in enumerate(display_bot_names(lineup), start=1):
                self.tournament.players[seat].name = disp
        self.engine: HandEngine | None = None
        self.timer: TournamentTimer | None = None
        self.fast_mode = fast_mode
        self.history = HandHistoryStore()
        self.coach = Coach()
        self.coach_mode = "advanced"
        self._last_hero_action: str | None = None
        self._last_hero_request: CoachRequest | None = None
        self._decisions: list[HandDecision] = []  # this hand's hero decisions
        self._lock = threading.RLock()
        self._history_file = hand_history.HistoryFileStore(self.history_dir, self.session_id)

    def start(self) -> None:
        with self._lock:
            self.engine = HandEngine(self.tournament, provider=self.provider, rng=self.rng)
            self.timer = TournamentTimer(self.tournament, fast_mode=self.fast_mode)
            self._begin_hand(first=True)

    def _begin_hand(self, first: bool = False) -> None:
        assert self.engine is not None and self.timer is not None
        self._last_hero_action = self._last_hero_request = None
        self._decisions = []
        self.engine.start_hand()
        (self.timer.start if first else self.timer.resume)()
        self._advance_bots()

    def next_hand(self) -> None:
        with self._lock:
            # A45: a finished table must not replay/duplicate history.
            if self.status != "active":
                raise ValueError("tournament is not active")
            if self.phase() != "handOver":
                raise ValueError("current hand is still in progress")
            self._settle_hand()
            if self.status == "active":
                self._begin_hand(first=False)

    def _settle_hand(self) -> None:
        """Record the hand, apply re-entry/elimination, and finish the
        tournament when one player remains (no new hand starts)."""
        self._record_and_persist()
        self._apply_reentry_or_eliminate()
        mark_finished(self)
        if sum(1 for p in self.tournament.players
               if not p.is_eliminated and not p.sit_out) <= 1:
            self.status = "finished"

    def phase(self) -> str:
        if self.engine is None:
            return "idle"
        return "handOver" if self.engine.is_complete else "playing"
    def hero_action(self, kind: str, amount: int | None = None) -> None:
        with self._lock:
            assert self.engine is not None
            actor = self.engine.current_actor
            if actor is None or not self.tournament.players[actor].is_human:
                raise ValueError("hero is not the current actor")
            action = Action(ActionType(kind), amount=amount)
            assert self.timer is not None
            self.timer.pause()
            request = coach_request(self)
            self.engine.act(actor, action)
            self._last_hero_action, self._last_hero_request = f"{kind.upper()}", request
            self._decisions.append(decision_verdict(self.coach, kind.upper(), request))
            self._advance_bots()
            if not self.engine.is_complete:
                self.timer.resume()  # timer asserted non-null above

    def _advance_bots(self, guard: int = 5000) -> None:
        assert self.engine is not None
        while not self.engine.is_complete:
            actor = self.engine.current_actor
            if actor is None or self.tournament.players[actor].is_human:
                break
            self.engine.advance_bot(actor)
            guard -= 1
            if guard <= 0:
                raise RuntimeError("bot loop guard exceeded")
        if self.engine.is_complete:
            assert self.timer is not None
            self.timer.pause()
            # Finish now, not on the next next_hand(): the client stops calling
            # it once the champion screen shows, and the clock must stop too.
            if is_final_hand(self):
                self._settle_hand()
    def state(self) -> dict:
        with self._lock:
            assert self.engine is not None and self.timer is not None
            self.last_seen = time.time()
            self.timer.tick()
            if self.engine.is_complete and not self.timer.running and self.status == "active":
                self.timer.resume()
            return build_state_view(self)

    def coach_advice(self) -> dict:
        with self._lock:
            return advice_dict(self.coach.recommend(coach_request(self)))
    def grade_hero(self) -> dict | None:
        with self._lock:
            return grade_last_action(self.coach, self._last_hero_action, self._last_hero_request)

    def _apply_reentry_or_eliminate(self) -> None:
        """A39/A44: re-enter or eliminate busted players; note hero place."""
        apply_reentry_or_elimination(self)
    def reentry(self) -> None:
        """A39 hero re-entry: starting stack, same level."""
        with self._lock:
            assert self.tournament is not None
            hero = self.tournament.players[self.hero_seat]
            if not hero.awaiting_reentry or self.tournament.level_index >= self.REENTRY_LEVELS:
                raise ValueError("re-entry is not available")
            hero.awaiting_reentry = False
            hero.sit_out = False
            hero.stack = self.tournament_starting_stack
    def _record_and_persist(self) -> None:
        record = build_record(self, self._decisions)
        if record is not None:
            self.history.append(record)
            self._history_file.append(record)
