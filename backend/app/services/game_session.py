"""GameSession: backend-authoritative table state for one tournament."""
from __future__ import annotations

import random
import threading
import time
import uuid

from app.ai.ai_framework import AIDecisionProvider
from app.game.actions import Action, ActionType
from app.game.hand_engine import HandEngine
from app.game.positions import position_for
from app.services import hand_history
from app.services.game_state_view import build_state_view
from app.services.hand_history import HandHistoryRecord, HandHistoryStore
from app.services.session_coach import advice_dict, coach_request
from app.services.session_store import mark_finished
from app.strategy.coach import Coach
from app.strategy.test_mode import compare_decisions
from app.tournament.tournament import build_default_tournament
from app.tournament.tournament_timer import TournamentTimer


class GameSession:
    """Owns one tournament table; drives bots; exposes safe state snapshots.

    Every public entry point holds `_lock`. REST handlers and the table
    WebSocket both reach one session from threadpool threads, so without it
    two callers pass the same guard and act on the table twice — two
    concurrent next_hand() calls used to deal a second hand over the first,
    losing chips. The lock is reentrant because grade_hero() calls
    coach_advice(); the private helpers only ever run under a public method.
    """

    def __init__(self, session_id: str | None = None, fast_mode: float = 1.0,
                 rng: random.Random | None = None,
                 starting_stack: int = 45_000,
                 small_blind: int = 100, big_blind: int = 100,
                 level_minutes: int = 20,
                 owner: str | None = None,
                 table_label: str | None = None,
                 hero_name: str = "Hero",
                 history_dir: str | None = None) -> None:
        self.session_id = session_id or uuid.uuid4().hex[:12]
        self.owner = owner  # authenticated username that owns this tournament
        self.table_label = table_label or self.session_id
        self.created_at = time.time()
        self.status = "active"  # active | finished | abandoned (issue #5)
        self.last_seen = self.created_at
        self.idle_timeout = 30 * 60
        self.history_dir = history_dir or ""
        self.tournament_starting_stack = starting_stack
        self.tournament = build_default_tournament(
            starting_stack=starting_stack, small_blind=small_blind,
            big_blind=big_blind, level_minutes=level_minutes, hero_name=hero_name)
        self.hero_seat = 0
        self.rng = rng if rng is not None else random.Random()
        self.provider = AIDecisionProvider(rng=self.rng)
        self.engine: HandEngine | None = None
        self.timer: TournamentTimer | None = None
        self.fast_mode = fast_mode
        self.history = HandHistoryStore()
        self.coach = Coach()
        self.coach_mode = "advanced"
        self._last_hero_action: str | None = None
        self._lock = threading.RLock()
        self._history_file: hand_history.HistoryFileStore = hand_history.HistoryFileStore(
            self.history_dir, self.session_id
        )

    def start(self) -> None:
        with self._lock:
            self.engine = HandEngine(self.tournament, provider=self.provider, rng=self.rng)
            self.timer = TournamentTimer(self.tournament, fast_mode=self.fast_mode)
            self._begin_hand(first=True)

    def _begin_hand(self, first: bool = False) -> None:
        assert self.engine is not None and self.timer is not None
        self.engine.start_hand()
        if first:
            self.timer.start()
        else:
            self.timer.resume()
        self._advance_bots()

    def next_hand(self) -> None:
        with self._lock:
            if self.phase() != "handOver":
                raise ValueError("current hand is still in progress")
            self._record_and_persist()
            self._apply_reentry_or_eliminate()
            mark_finished(self)  # hero busted with no re-entry left (issue #5)
            self._begin_hand(first=False)

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
            self.engine.act(actor, action)
            self._last_hero_action = f"{kind.upper()}"
            self._advance_bots()
            if not self.engine.is_complete:
                assert self.timer is not None
                self.timer.resume()

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

    def state(self) -> dict:
        with self._lock:
            assert self.engine is not None and self.timer is not None
            self.last_seen = time.time()  # an engaged table is never abandoned
            self.timer.tick()  # advance expired blind levels / breaks on every view
            if self.engine.is_complete and not self.timer.running:
                self.timer.resume()  # the level clock runs through the result screen
            return build_state_view(self)

    def coach_advice(self) -> dict:
        with self._lock:
            return advice_dict(self.coach.recommend(coach_request(self)))

    def grade_hero(self) -> dict | None:
        """Test mode: compare last hero action vs coach recommendation."""
        with self._lock:
            if self._last_hero_action is None:
                return None
            advice = self.coach_advice()
            comparison = compare_decisions(self._last_hero_action, advice["recommendedAction"])
            return {
                "heroAction": self._last_hero_action,
                "coachAction": advice["recommendedAction"],
                "grade": comparison.grade,
                "explanation": comparison.explanation,
                "icmFactors": comparison.icm_factors,
                "rangeNote": comparison.range_note,
            }

    REENTRY_LEVELS = 3  # levels 1-3 get a fresh stack on bust

    def _apply_reentry_or_eliminate(self) -> None:
        """Bust-out rule: 45k reset during levels 1-3, elimination from level 4."""
        assert self.tournament is not None
        level = self.tournament.level_index
        for player in self.tournament.players:
            if player.is_eliminated or player.stack > 0:
                continue
            if level < self.REENTRY_LEVELS:
                player.stack = self.tournament_starting_stack
            else:
                player.eliminate()

    def _record_and_persist(self) -> None:
        assert self.engine is not None
        result = self.engine.result
        if result is None:
            return
        hero = self.tournament.players[self.hero_seat]
        level = self.tournament.current_blind_level()
        start = result.starting_stacks.get(self.hero_seat, hero.stack)
        record = HandHistoryRecord(
            hand_number=result.hand_number,
            hero_cards=list(hero.hole_cards),
            hero_position=position_for(self.tournament.button, self.hero_seat, len(self.tournament.players)),
            community_cards=list(result.community_cards),
            starting_stack=start, ending_stack=hero.stack,
            blind_level=f"{level.small}/{level.big}",
            level_index=self.tournament.level_index,
            actions=list(result.actions), pot_total=result.pot_total,
            winner_seats=result.winner_seats(),
            username=self.owner or "",
            table_label=self.table_label,
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        )
        self.history.append(record)
        self._history_file.append(record)
