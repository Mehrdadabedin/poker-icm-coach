"""GameSession: backend-authoritative table state for one tournament."""
from __future__ import annotations

import random
import uuid

from app.ai.ai_framework import AIDecisionProvider
from app.game.actions import Action, ActionType
from app.game.hand_engine import HandEngine
from app.game.positions import position_for
from app.services.game_state_view import build_state_view
from app.services.hand_history import HandHistoryRecord, HandHistoryStore
from app.strategy.coach import Coach, CoachRequest
from app.strategy.test_mode import compare_decisions
from app.tournament.tournament import build_default_tournament
from app.tournament.tournament_timer import TournamentTimer


class GameSession:
    """Owns one tournament table; drives bots; exposes safe state snapshots."""

    def __init__(self, session_id: str | None = None, fast_mode: float = 1.0,
                 rng: random.Random | None = None,
                 starting_stack: int = 45_000,
                 small_blind: int = 100, big_blind: int = 100,
                 level_minutes: int = 20) -> None:
        self.session_id = session_id or uuid.uuid4().hex[:12]
        self.tournament_starting_stack = starting_stack
        self.tournament = build_default_tournament(
            starting_stack=starting_stack, small_blind=small_blind,
            big_blind=big_blind, level_minutes=level_minutes,
        )
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

    # ---- lifecycle ----
    def start(self) -> None:
        self.engine = HandEngine(self.tournament, provider=self.provider, rng=self.rng)
        self.timer = TournamentTimer(self.tournament, fast_mode=self.fast_mode)
        self._begin_hand(first=True)

    def _begin_hand(self, first: bool = False) -> None:
        assert self.engine is not None and self.timer is not None
        self.engine.start_hand()
        # The tournament clock is a live blind-level clock: it starts once and
        # resumes across hands (it was paused when the previous hand ended).
        # It must NOT reset on a new hand.
        if first:
            self.timer.start()
        else:
            self.timer.resume()
        self._advance_bots()

    def next_hand(self) -> None:
        if self.phase() != "handOver":
            raise ValueError("current hand is still in progress")
        self._record_and_persist()
        self._apply_reentry_or_eliminate()
        self._begin_hand(first=False)

    def phase(self) -> str:
        if self.engine is None:
            return "idle"
        return "handOver" if self.engine.is_complete else "playing"

    # ---- actions ----
    def hero_action(self, kind: str, amount: int | None = None) -> None:
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

    # ---- views / coach ----
    def state(self) -> dict:
        assert self.engine is not None and self.timer is not None
        self.timer.tick()  # advance expired blind levels / breaks on every view
        return build_state_view(self)

    def coach_advice(self) -> dict:
        assert self.engine is not None
        hero = self.tournament.players[self.hero_seat]
        level = self.tournament.current_blind_level()
        req = CoachRequest(
            hero=list(hero.hole_cards),
            position=position_for(self.tournament.button, self.hero_seat, 9),
            stack=hero.stack, big_blind=level.big, small_blind=level.small,
            ante=self.tournament.structure.ante_for(self.tournament.ante_mode, level),
            pot=sum(p.bet_total for p in self.tournament.players),
            to_call=max(0, self.engine._street.current_bet - self.engine._street.contributions.get(self.hero_seat, 0)),
            board=list(self.engine._board), street=self.engine.street,
            players_remaining=sum(1 for p in self.tournament.players if not p.is_eliminated),
            paid_positions=6, stacks=[p.stack for p in self.tournament.players],
            payout=[float(x) for x in self.tournament.payout.percentages],
            facing_raise=(self.engine._street.current_bet > level.big),
            hero_seat=self.hero_seat, level_index=self.tournament.level_index,
            mode=self.coach_mode,
        )
        rec = self.coach.recommend(req)
        return {
            "recommendedAction": rec.recommended_action,
            "confidence": rec.confidence,
            "reasoning": rec.reasoning,
            "alternativeAction": rec.alternative_action,
            "detail": rec.recommendation_detail,
            "ev": rec.ev,
            "outs": rec.outs,
            "education": rec.education,
        }

    def grade_hero(self) -> dict | None:
        """Test mode: compare last hero action vs coach recommendation."""
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

    # ---- persistence ----
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
            hero_position=position_for(self.tournament.button, self.hero_seat, 9),
            community_cards=list(result.community_cards),
            starting_stack=start, ending_stack=hero.stack,
            blind_level=f"{level.small}/{level.big}",
            level_index=self.tournament.level_index,
            actions=list(result.actions), pot_total=result.pot_total,
            winner_seats=result.winner_seats(),
        )
        self.history.append(record)
