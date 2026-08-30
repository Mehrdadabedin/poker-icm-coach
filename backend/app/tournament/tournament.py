"""Tournament configuration and nine-seat table state."""
from __future__ import annotations

from dataclasses import dataclass, field

from app.game.player import Player
from app.tournament.blind_structure import BlindLevel, BlindStructure, default_structure

STARTING_STACK = 45_000


@dataclass(frozen=True, slots=True)
class PayoutStructure:
    """Payout percentages by finish position; must sum to 1.0."""

    percentages: tuple[float, ...] = (0.4, 0.25, 0.15, 0.1, 0.06, 0.04)

    def __post_init__(self) -> None:
        if not self.percentages:
            raise ValueError("payout structure is empty")
        if any(p <= 0 for p in self.percentages):
            raise ValueError("every payout must be positive")
        if abs(sum(self.percentages) - 1.0) > 1e-9:
            raise ValueError("payout percentages must sum to 1.0")

    @property
    def paid_positions(self) -> int:
        return len(self.percentages)

    @classmethod
    def nine_player(cls) -> PayoutStructure:
        return cls((0.40, 0.25, 0.15, 0.10, 0.06, 0.04))

    @classmethod
    def eighteen_player(cls) -> PayoutStructure:
        return cls((0.32, 0.21, 0.15, 0.10, 0.08, 0.06, 0.04, 0.04))

    @classmethod
    def twenty_seven_player(cls) -> PayoutStructure:
        return cls((0.34, 0.22, 0.15, 0.10, 0.07, 0.05, 0.03, 0.02, 0.02))

    @classmethod
    def forty_five_player(cls) -> PayoutStructure:
        return cls((0.36, 0.22, 0.14, 0.09, 0.06, 0.04, 0.03, 0.02, 0.01, 0.01, 0.01, 0.01))

    @classmethod
    def ninety_player(cls) -> PayoutStructure:
        return cls((0.35, 0.20, 0.12, 0.08, 0.06, 0.05, 0.04, 0.03, 0.02, 0.01,
                    0.01, 0.01, 0.01, 0.005, 0.005))

    @classmethod
    def custom(cls, percentages: tuple[float, ...]) -> PayoutStructure:
        return cls(percentages)


@dataclass(slots=True)
class Tournament:
    """The authoritative tournament state: seats, structure, level, payouts."""

    players: list[Player]
    structure: BlindStructure = field(default_factory=default_structure)
    level_index: int = 0
    button: int = 0
    ante_mode: str = "none"  # none | traditional | bba
    payout: PayoutStructure = field(default_factory=PayoutStructure.nine_player)
    hand_number: int = 0

    def current_blind_level(self) -> BlindLevel:
        return self.structure.level_at(self.level_index)

    def active_players(self) -> list[Player]:
        return [p for p in self.players if not p.is_eliminated and not p.sit_out]

    def advance_level(self) -> BlindLevel:
        self.level_index = min(self.level_index + 1, len(self.structure) - 1)
        return self.current_blind_level()

    def seat_of(self, player: Player) -> int:
        return player.seat

    def next_hand(self) -> None:
        self.hand_number += 1
        for p in self.players:
            p.new_hand()


def build_default_tournament() -> Tournament:
    """Nine seats: one human hero and eight computer opponents."""
    players = [
        Player(name="Hero", stack=STARTING_STACK, seat=0, is_human=True),
        *[
            Player(name=f"Bot {i}", stack=STARTING_STACK, seat=i, is_human=False)
            for i in range(1, 9)
        ],
    ]
    return Tournament(players=players)
