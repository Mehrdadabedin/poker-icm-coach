"""Request body for setting a player's plan (plan 100)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class PlanIn(BaseModel):
    plan: Literal["free", "pro"]
