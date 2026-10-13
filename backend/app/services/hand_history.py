"""Hand history: records, store, and readable replay."""
from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass, field
from pathlib import Path

from app.game.hand_result import HandAction
from app.poker.card import Card, card_from_str

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class HandDecision:
    """One hero decision with the coach's verdict from the moment it was made."""

    street: str
    hero_action: str
    coach_action: str
    grade: str
    icm_pressure: str
    explanation: str
    stack_bb: float
    to_call: int
    board: list[str]


@dataclass(slots=True)
class HandHistoryRecord:
    """Everything recorded about one hero-involved hand."""

    hand_number: int
    hero_cards: list[Card]
    hero_position: str
    community_cards: list[Card]
    starting_stack: int
    ending_stack: int
    blind_level: str
    actions: list[HandAction]
    pot_total: int
    winner_seats: list[int]
    level_index: int = 1
    coach_recommendation: str | None = None
    hero_decision: str | None = None
    icm_pressure: str = "LOW"
    tournament_stage: str = ""
    grade: str | None = None
    username: str = ""
    table_label: str = ""
    timestamp: str = ""
    decisions: list[HandDecision] = field(default_factory=list)

    def net_chips(self) -> int:
        return self.ending_stack - self.starting_stack


class HandHistoryStore:
    """In-memory hand history (PostgreSQL persistence lands in part 033)."""

    def __init__(self) -> None:
        self._records: dict[int, HandHistoryRecord] = {}

    def __len__(self) -> int:
        return len(self._records)

    def append(self, record: HandHistoryRecord) -> None:
        self._records[record.hand_number] = record

    def hand(self, hand_number: int) -> HandHistoryRecord:
        try:
            return self._records[hand_number]
        except KeyError as exc:
            raise KeyError(f"no record for hand #{hand_number}") from exc

    def all(self) -> list[HandHistoryRecord]:
        return [self._records[k] for k in sorted(self._records)]

    def filter(self, stage: str | None = None, hero_decision: str | None = None) -> list[HandHistoryRecord]:
        records = self.all()
        if stage:
            records = [r for r in records if r.tournament_stage == stage]
        if hero_decision:
            records = [r for r in records if r.hero_decision == hero_decision]
        return records


class HistoryFileStore:
    """Best-effort JSONL persistence of hand records to the filesystem (A07).

    Writes are append-only and never fatal: a read-only or missing directory
    only logs a warning so gameplay is never affected.
    """

    def __init__(self, directory: str = "", session_id: str = "") -> None:
        self._path: Path | None = None
        if directory:
            self._path = Path(directory) / f"{session_id}.jsonl"
            try:
                self._path.parent.mkdir(parents=True, exist_ok=True)
            except OSError as exc:  # pragma: no cover - env dependent
                logger.warning("history persistence unavailable: %s", exc)
                self._path = None

    def append(self, record: HandHistoryRecord) -> None:
        if self._path is None:
            return
        try:
            with self._path.open("a", encoding="utf-8") as fh:
                fh.write(json.dumps(record_to_dict(record), default=str) + "\n")
        except OSError:  # pragma: no cover - env dependent
            logger.warning("could not persist hand %s", record.hand_number)


def record_to_dict(record: HandHistoryRecord) -> dict:
    """The hand as JSON: the history file and the saved history (plan 076)."""
    return {
        "hand_number": record.hand_number,
        "username": record.username,
        "table_label": record.table_label,
        "timestamp": record.timestamp,
        "hero_cards": [c.ascii() for c in record.hero_cards],
        "hero_position": record.hero_position,
        "community_cards": [c.ascii() for c in record.community_cards],
        "starting_stack": record.starting_stack,
        "ending_stack": record.ending_stack,
        "blind_level": record.blind_level,
        "level_index": record.level_index,
        "pot_total": record.pot_total,
        "winner_seats": record.winner_seats,
        "actions": [
            {"seat": a.seat, "action": a.action, "amount": a.amount, "street": a.street}
            for a in record.actions
        ],
        "decisions": [asdict(d) for d in record.decisions],
        "hero_decision": record.hero_decision,
        "coach_recommendation": record.coach_recommendation,
        "grade": record.grade,
        "icm_pressure": record.icm_pressure,
        "tournament_stage": record.tournament_stage,
    }


def record_from_dict(data: dict) -> HandHistoryRecord:
    """A saved hand back as a record; fields older rows lack take defaults."""
    record = HandHistoryRecord(
        hand_number=data["hand_number"],
        hero_cards=[card_from_str(c) for c in data.get("hero_cards", [])],
        hero_position=data.get("hero_position", ""),
        community_cards=[card_from_str(c) for c in data.get("community_cards", [])],
        starting_stack=data.get("starting_stack", 0), ending_stack=data.get("ending_stack", 0),
        blind_level=data.get("blind_level", ""), level_index=data.get("level_index", 1),
        actions=[HandAction(**a) for a in data.get("actions", [])],
        pot_total=data.get("pot_total", 0), winner_seats=list(data.get("winner_seats", [])),
        username=data.get("username", ""), table_label=data.get("table_label", ""),
        timestamp=data.get("timestamp", ""),
        decisions=[HandDecision(**d) for d in data.get("decisions", [])],
    )
    record.hero_decision = data.get("hero_decision")
    record.coach_recommendation = data.get("coach_recommendation")
    record.grade = data.get("grade")
    record.icm_pressure = data.get("icm_pressure", "LOW")
    record.tournament_stage = data.get("tournament_stage", "")
    return record


def replay(record: HandHistoryRecord) -> str:
    """Render a readable multi-line hand replay."""
    cards = ", ".join(c.ascii() for c in record.hero_cards)
    board = ", ".join(c.ascii() for c in record.community_cards) or "—"
    lines = [
        f"Hand #{record.hand_number} — {record.blind_level} blinds",
        f"Hero ({record.hero_position}): {cards}",
        f"Board: {board}",
        f"Pot: {record.pot_total:,} | Stage: {record.tournament_stage} | ICM: {record.icm_pressure}",
        "Actions:",
    ]
    for action in record.actions:
        amount = f" {action.amount:,}" if action.amount else ""
        lines.append(f"  Seat {action.seat} ({action.street}): {action.action}{amount}")
    lines.append(f"Winner(s): seat(s) {', '.join(map(str, record.winner_seats))}")
    if record.coach_recommendation:
        lines.append(f"Coach: {record.coach_recommendation} | Hero: {record.hero_decision or '—'} | {record.grade or 'no grade'}")
    return "\n".join(lines)
