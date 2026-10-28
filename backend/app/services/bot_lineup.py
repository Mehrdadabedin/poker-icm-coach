"""Which bots a new tournament gets (plan 100).

Pro and Admin choose the lineup (A26, A27). Free gets 8 random bots from the
four personalities the table shows by name, whatever the client sent.
"""
from __future__ import annotations

import random

from app.ai.personalities import profile_for
from app.services.plans import is_pro

FREE_PERSONALITIES = ("tag", "lag", "tight_passive", "loose_passive")
SEATS = 8


def resolve_bots(user: str, profile: str | None,
                 bots: list[str] | None) -> tuple[str | None, list[str] | None]:
    """(profile, lineup) for the new table. ValueError carries the 422 detail."""
    if not is_pro(user):
        return None, random.choices(FREE_PERSONALITIES, k=SEATS)
    try:
        if profile is not None:
            profile_for(profile)
        if bots is not None and len(bots) != SEATS:
            raise ValueError("bots must contain exactly 8 profiles")
        for name in bots or []:
            try:
                profile_for(name)
            except KeyError as exc:
                raise ValueError(f"unknown bot profile: {name}") from exc
    except KeyError as exc:
        raise ValueError("unknown bot profile") from exc
    return profile, bots
