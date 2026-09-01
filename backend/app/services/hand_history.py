"""Hand history: records, store, and readable replay."""
from __future__ import annotations

from dataclasses import dataclass

from app.game.hand_result import HandAction
from app.poker.card import Card

POSITION_LABEL = {"UTG": "UTG", "UTG+1": "UTG+1", "MP": "MP", "LJ": "LJ", "HJ": "HJ",
                  "CO": "CO", "BTN": "BTN", "SB": "SB", "BB": "BB"}


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
