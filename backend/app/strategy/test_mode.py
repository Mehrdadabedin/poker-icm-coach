"""TEST MODE: grade hero decisions after the fact (PREFERRED/ACCEPTABLE/SUBOPTIMAL)."""
from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class Grade(StrEnum):
    PREFERRED = "PREFERRED"
    ACCEPTABLE = "ACCEPTABLE"
    SUBOPTIMAL = "SUBOPTIMAL"


@dataclass(frozen=True, slots=True)
class DecisionComparison:
    hero_action: str
    coach_action: str
    grade: Grade
    explanation: str
    icm_factors: str
    range_note: str


# The engine names hero actions FOLD/CHECK/CALL/BET/RAISE/ALL_IN while the
# coach answers in poker terms. Each pair below is one move written two ways;
# compared as raw words, a jam the coach asked for was graded SUBOPTIMAL.
SAME_ACTION = {
    ("CALL", "CHECK"), ("CHECK", "CALL"),
    ("ALL-IN", "OPEN JAM"), ("ALL-IN", "RESHOVE"),
    ("RAISE", "OPEN RAISE"), ("CALL", "CALL JAM"),
}


def compare_decisions(
    hero_action: str,
    coach_action: str,
    equivalent: set[tuple[str, str]] | None = None,
) -> DecisionComparison:
    """Grade the hero's action versus the coach recommendation.

    PREFERRED: same action (or a documented near-equivalent).
    ACCEPTABLE: a reasonable alternative with close expected value.
    SUBOPTIMAL: a materially worse action, explained, never mocked.
    """
    hero_action = hero_action.replace("_", "-")  # engine ALL_IN, coach ALL-IN
    equivalent = equivalent or SAME_ACTION
    if hero_action == coach_action or (hero_action, coach_action) in equivalent:
        return DecisionComparison(
            hero_action=hero_action, coach_action=coach_action, grade=Grade.PREFERRED,
            explanation=f"{hero_action} matches the recommended line.",
            icm_factors="No ICM penalty for this line.",
            range_note=f"Coach range: {coach_action}.",
        )
    if _acceptable(hero_action, coach_action):
        return DecisionComparison(
            hero_action=hero_action, coach_action=coach_action, grade=Grade.ACCEPTABLE,
            explanation=f"{hero_action} is a reasonable alternative to {coach_action}.",
            icm_factors="Minor ICM adjustment; verify stack coverage.",
            range_note=f"Coach preferred {coach_action}.",
        )
    return DecisionComparison(
        hero_action=hero_action, coach_action=coach_action, grade=Grade.SUBOPTIMAL,
        explanation=f"{hero_action} diverges from the recommended {coach_action}.",
        icm_factors="Review ICM pressure and pot odds before this line.",
        range_note=f"Stronger option: {coach_action}.",
    )


def _acceptable(hero: str, coach: str) -> bool:
    """Actions generally considered close in expected value."""
    pairs = {
        ("RAISE", "3-BET"), ("3-BET", "RAISE"), ("RAISE", "OPEN JAM"),
        ("OPEN JAM", "RAISE"), ("ALL-IN", "OPEN JAM"), ("OPEN JAM", "ALL-IN"),
        ("CALL", "CALL JAM"), ("CALL JAM", "CALL"), ("CHECK", "CALL JAM"),
        ("BET", "RAISE"), ("RAISE", "BET"), ("FOLD", "CHECK"), ("CHECK", "FOLD"),
        ("ALL-IN", "RESHOVE"), ("RESHOVE", "ALL-IN"),
        ("RAISE", "4-BET"), ("4-BET", "RAISE"), ("ALL-IN", "CALL JAM"),
    }
    return (hero, coach) in pairs
