"""Tournament stage detection and bubble pressure heuristics.

Stage detection uses players remaining, paid positions and blind level.
Pressure ratings are heuristic (labeled HEURISTIC in coach output).
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum


class TournamentStage(IntEnum):
    EARLY = 1
    MIDDLE = 2
    LATE = 3
    BUBBLE_APPROACHING = 4
    BUBBLE = 5
    POST_BUBBLE = 6
    FINAL_TABLE = 7
    FINAL_TABLE_BUBBLE = 8
    SHORT_HANDED = 9
    HEADS_UP = 10


STAGE_LABELS = {
    TournamentStage.EARLY: "EARLY",
    TournamentStage.MIDDLE: "MIDDLE",
    TournamentStage.LATE: "LATE",
    TournamentStage.BUBBLE_APPROACHING: "BUBBLE APPROACHING",
    TournamentStage.BUBBLE: "BUBBLE",
    TournamentStage.POST_BUBBLE: "POST-BUBBLE",
    TournamentStage.FINAL_TABLE: "FINAL TABLE",
    TournamentStage.FINAL_TABLE_BUBBLE: "FINAL TABLE BUBBLE",
    TournamentStage.SHORT_HANDED: "SHORT-HANDED",
    TournamentStage.HEADS_UP: "HEADS-UP",
}


class PressureLevel(IntEnum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    VERY_HIGH = 4


PRESSURE_LABELS = {
    PressureLevel.LOW: "LOW",
    PressureLevel.MEDIUM: "MEDIUM",
    PressureLevel.HIGH: "HIGH",
    PressureLevel.VERY_HIGH: "VERY HIGH",
}


@dataclass(frozen=True, slots=True)
class StageInfo:
    players_remaining: int
    paid_positions: int
    hero_stack_bb: float
    average_stack_bb: float
    shortest_stack_bb: float
    level_index: int
    stage: TournamentStage

    @property
    def label(self) -> str:
        return STAGE_LABELS[self.stage]


@dataclass(frozen=True, slots=True)
class BubblePressure:
    level: PressureLevel
    label: str
    distance_to_bubble: int
    short_stacks: int

    def __str__(self) -> str:
        return self.label


def detect_stage(
    players_remaining: int,
    paid_positions: int,
    hero_stack_bb: float,
    average_stack_bb: float,
    shortest_stack_bb: float,
    level_index: int,
) -> StageInfo:
    """Classify the tournament stage from live table numbers."""
    if players_remaining < 1:
        raise ValueError("players_remaining must be >= 1")
    if players_remaining == 2:
        stage = TournamentStage.HEADS_UP
    elif players_remaining == 9 and paid_positions >= 9:
        stage = TournamentStage.FINAL_TABLE
    elif players_remaining == 8 and paid_positions >= 9:
        stage = TournamentStage.FINAL_TABLE_BUBBLE
    elif players_remaining <= 5 and paid_positions >= 9:
        stage = TournamentStage.SHORT_HANDED
    elif players_remaining <= paid_positions:
        stage = TournamentStage.POST_BUBBLE
    elif players_remaining == paid_positions + 1:
        stage = TournamentStage.BUBBLE
    elif players_remaining <= paid_positions + 2 and level_index >= 6:
        stage = TournamentStage.BUBBLE_APPROACHING
    elif level_index >= 8:
        stage = TournamentStage.LATE
    elif level_index >= 4:
        stage = TournamentStage.MIDDLE
    else:
        stage = TournamentStage.EARLY
    return StageInfo(
        players_remaining=players_remaining, paid_positions=paid_positions,
        hero_stack_bb=hero_stack_bb, average_stack_bb=average_stack_bb,
        shortest_stack_bb=shortest_stack_bb, level_index=level_index, stage=stage,
    )


def bubble_pressure(info: StageInfo) -> BubblePressure:
    """Heuristic pressure rating: closest to bubble + short stacks -> higher."""
    distance = max(0, info.players_remaining - info.paid_positions)
    short = 1 if info.shortest_stack_bb <= 6 else 0
    hero_short = 1 if info.hero_stack_bb <= 8 else 0
    score = 0
    if info.stage in (TournamentStage.BUBBLE, TournamentStage.FINAL_TABLE_BUBBLE):
        score += 4
    elif info.stage == TournamentStage.BUBBLE_APPROACHING:
        score += 2
    score += short * 2 + hero_short
    if score >= 6:
        level = PressureLevel.VERY_HIGH
    elif score >= 4:
        level = PressureLevel.HIGH
    elif score >= 2:
        level = PressureLevel.MEDIUM
    else:
        level = PressureLevel.LOW
    return BubblePressure(
        level=level, label=PRESSURE_LABELS[level],
        distance_to_bubble=distance, short_stacks=short + hero_short,
    )
