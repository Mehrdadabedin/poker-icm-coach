"""Coach display modes: BEGINNER / INTERMEDIATE / ADVANCED."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class CoachMode(StrEnum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


# detail keys shown at each mode (advanced = everything)
_MODE_KEYS = {
    CoachMode.BEGINNER: {"ACTION", "WHY"},
    CoachMode.INTERMEDIATE: {
        "ACTION", "WHY", "POSITION", "STACK", "EFFECTIVE STACK",
        "POT ODDS", "ICM PRESSURE",
    },
    CoachMode.ADVANCED: None,  # all keys
}


@dataclass(slots=True)
class CoachRecommendationView:
    recommended_action: str
    confidence: float
    reasoning: str
    alternative_action: str
    recommendation_detail: dict[str, str] = field(default_factory=dict)

    @property
    def summary(self) -> str:
        return f"{self.recommended_action} ({self.confidence:.0%})"


def filter_for_mode(rec, mode: str) -> CoachRecommendationView:
    """Strip detail keys not shown at the requested mode."""
    keys = _MODE_KEYS.get(CoachMode(mode), _MODE_KEYS[CoachMode.ADVANCED])
    detail = rec.recommendation_detail
    if keys is not None:
        detail = {k: v for k, v in detail.items() if k in keys}
    return CoachRecommendationView(
        recommended_action=rec.recommended_action,
        confidence=rec.confidence,
        reasoning=rec.reasoning,
        alternative_action=rec.alternative_action,
        recommendation_detail=detail,
    )
