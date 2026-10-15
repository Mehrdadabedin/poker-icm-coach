"""Heads-up push/fold maths for the coach benchmark (plan 080).

The small blind (0.5 BB) shoves or folds; the big blind (1 BB) calls or
folds. Both start with S big blinds. The Nash equilibrium of this game is a
mathematical fact (no opinion about how people play), found here by
fictitious play: each side keeps answering the other's average strategy.

`bubble_call_gaps` prices the big blind's call on a three-handed bubble with
the exact ICM model, against the small blind's chip-EV Nash shoving range.
"""
from __future__ import annotations

from collections.abc import Sequence
from typing import Any

import numpy as np

from app.icm.icm_engine import icm_equities

Table = dict[str, Any]  # "equity" and "weight", 169 x 169, lists or arrays
ROUNDS = 3000


def _arrays(t: Table) -> tuple[np.ndarray, np.ndarray]:
    return np.asarray(t["weight"]), np.asarray(t["equity"])


def shove_gaps(s: float, call: np.ndarray, t: Table) -> np.ndarray:
    """Small blind's shove minus fold, in BB, per class: above 0 means shove."""
    w, e = _arrays(t)
    payoff = (1 - call)[None, :] * 1.0 + call[None, :] * (2 * s * e - s)
    return (w * payoff).sum(axis=1) / w.sum(axis=1) + 0.5


def call_gaps(s: float, shove: np.ndarray, t: Table) -> np.ndarray:
    """Big blind's call minus fold, in BB, per class: above 0 means call."""
    w, e = _arrays(t)
    mass = (w * shove[None, :]).sum(axis=1)
    ev = (w * shove[None, :] * (2 * s * e - s)).sum(axis=1) / np.where(mass > 0, mass, 1)
    return np.where(mass > 0, ev + 1.0, -np.inf)


def solve(s: float, t: Table) -> tuple[np.ndarray, np.ndarray]:
    """Average shove and call frequencies per class at S big blinds."""
    t = {k: np.asarray(v) for k, v in t.items()}  # once, not on every round
    n = len(t["equity"])
    shove, call = np.ones(n), np.zeros(n)
    for k in range(1, ROUNDS + 1):
        call += ((call_gaps(s, shove, t) > 0).astype(float) - call) / k
        shove += ((shove_gaps(s, call, t) > 0).astype(float) - shove) / k
    return shove, call


def bubble_call_gaps(stacks: Sequence[float], payouts: Sequence[float],
                     shove: np.ndarray, t: Table) -> np.ndarray:
    """Big blind's call minus fold, in % of the prize pool, three-handed.

    stacks = (button, small blind, big blind) in BB before the blinds; the
    button has folded and the small blind has shoved."""
    btn, sb, bb = stacks
    risk = min(sb, bb)

    def equity_of_bb(after: tuple[float, float, float]) -> float:
        return icm_equities([round(x * 100) for x in after], payouts)[2]

    fold = equity_of_bb((btn, sb + 1, bb - 1))
    win, lose = equity_of_bb((btn, sb - risk, bb + risk)), equity_of_bb((btn, sb + risk, bb - risk))
    w, e = _arrays(t)
    mass = (w * shove[None, :]).sum(axis=1)
    call = (w * shove[None, :] * (e * win + (1 - e) * lose)).sum(axis=1) / mass
    return 100 * (call - fold)
