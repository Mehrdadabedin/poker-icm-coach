"""Repeatable deals for recording the ad video (scripts/ad-video).

DEAL_SEED unset keeps every table on a fresh random generator. Never set it on
a deployment: every table would then deal the same cards.
"""
from __future__ import annotations

import random

from app.core.config import settings


def new_rng() -> random.Random:
    return random.Random(settings.deal_seed)
