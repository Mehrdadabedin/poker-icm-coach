"""The opponent the hero is up against, and the hands they likely hold (plan 073).

The coach used to price every decision against a random hand: top pair beat a
random hand 74% of the time, so it said RAISE facing a turn bet on a board with
three clubs, and QJo got a fixed "~20%" facing any raise. Here the opponent's
range follows their preflop line (open, 3-bet, call) from their position, and
after the flop a bet or raise keeps mostly hands that hit the board or draw.
"""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from app.ai.preflop_ranges import open_range_for
from app.equity.equity_engine import _INT, _all_cards, hero_vs_weighted, range_combos
from app.equity.fast_eval import score
from app.game.hand_result import HandAction
from app.poker.card import Card
from app.strategy.hand_codec import HandCell, parse_range

AGGRESSIVE = ("bet", "raise", "all_in")
THREE_BET = frozenset(parse_range("JJ+,AQs+,AKo,KQs,A5s,A4s"))  # value plus a few bluffs
RERAISE_VALUE = frozenset(parse_range("QQ+,AKs,AKo"))  # what a caller would have 3-bet
ANY_TWO = frozenset(
    HandCell(hi, lo, s) for hi in range(2, 15) for lo in range(2, hi + 1)
    for s in ((None,) if hi == lo else (True, False))
)
# how likely a combo is to keep playing this way, by how it fits the board
WEIGHTS = {True: {"made": 1.0, "draw": 0.7, "air": 0.2},   # they bet or raised
           False: {"made": 1.0, "draw": 0.8, "air": 0.6}}  # they only checked or called
SEED = 7
TRIALS = 1000  # about +-3 points; 3,000 took over 5 s on Render's free instance (plan 074)


@dataclass(frozen=True, slots=True)
class VillainRead:
    seat: int
    position: str
    preflop: str  # "open", "3bet", "call" or "passive" (limped or checked a blind)
    aggressive: bool  # bet or raised on the current street


def read_villain(log: list[HandAction], hero_seat: int, in_hand: set[int],
                 positions: dict[int, str], street: str) -> VillainRead | None:
    """The opponent still in the hand who put the hero to this decision: the last
    one to bet or raise (this street first), else the last one to act."""
    others = [a for a in log if a.seat != hero_seat and a.seat in in_hand]
    if not others:
        return None
    aggressors = [a for a in others if a.action in AGGRESSIVE]
    this_street = [a for a in aggressors if a.street == street]
    seat = (this_street or aggressors or others)[-1].seat
    return VillainRead(seat=seat, position=positions.get(seat, ""),
                       preflop=_preflop_line(log, seat), aggressive=bool(
                           [a for a in this_street if a.seat == seat]))


def _preflop_line(log: list[HandAction], seat: int) -> str:
    raised_before = False
    for a in (a for a in log if a.street == "preflop"):
        if a.seat == seat and a.action in AGGRESSIVE:
            return "3bet" if raised_before else "open"
        if a.seat == seat and a.action == "call" and raised_before:
            return "call"
        raised_before = raised_before or a.action in AGGRESSIVE
    return "passive"


def preflop_cells(read: VillainRead, stack_bb: int) -> frozenset[HandCell]:
    if read.preflop == "3bet":
        return THREE_BET
    if read.preflop == "passive" or not read.position:
        return ANY_TWO
    cells = frozenset(open_range_for(read.position, max(1, stack_bb)).cells)
    return cells if read.preflop == "open" else cells - RERAISE_VALUE


def _fit(combo: list[Card], board: list[Card]) -> str:
    """made: two pair or better, or a pair that uses a hole card; draw: four to a
    flush or to a straight with a hole card in it; air: everything else."""
    hole, table = [_INT[c] for c in combo], [_INT[c] for c in board]
    category = score(hole + table)[0]
    if category >= 2:
        return "made"
    hole_ranks = {r for r, _ in hole}
    if category == 1 and (len(hole_ranks) == 1 or hole_ranks & {r for r, _ in table}):
        return "made"
    if len(board) < 5:
        cards = hole + table
        if any(sum(1 for _, t in cards if t == s) >= 4 for s in {s for _, s in hole}):
            return "draw"
        ranks = {r for r, _ in cards}
        mine = set(hole_ranks)
        if 14 in ranks:
            ranks.add(1)
        if 14 in mine:
            mine.add(1)
        for low in range(1, 11):
            window = set(range(low, low + 5))
            if len(window & ranks) >= 4 and window & mine:
                return "draw"
    return "air"


@lru_cache(maxsize=256)
def _full_combos(cells: frozenset[HandCell]) -> tuple[tuple[Card, Card], ...]:
    """Every combo of a range from the full deck, built once per range (plan 074)."""
    return tuple((a, b) for a, b in range_combos(cells, _all_cards()))


def weighted_range(cells: frozenset[HandCell], board: list[Card], dead: list[Card],
                   aggressive: bool) -> list[tuple[list[Card], float]]:
    seen = set(dead) | set(board)
    combos = [[a, b] for a, b in _full_combos(cells) if a not in seen and b not in seen]
    if not board:
        return [(combo, 1.0) for combo in combos]
    weights = WEIGHTS[aggressive]
    return [(combo, weights[_fit(combo, board)]) for combo in combos]


@lru_cache(maxsize=4096)
def _equity(hero: tuple[Card, ...], board: tuple[Card, ...],
            cells: frozenset[HandCell], aggressive: bool) -> float:
    combos = weighted_range(cells, list(board), list(hero), aggressive)
    return hero_vs_weighted(list(hero), combos, list(board), trials=TRIALS, seed=SEED).equity


def equity_vs(hero: list[Card], board: list[Card], read: VillainRead, stack_bb: float) -> float | None:
    """Hero's equity against the opponent's likely hands, or None when the read
    leaves no live combos (the caller then falls back to a random hand)."""
    cells = preflop_cells(read, int(stack_bb))
    if not cells:
        return None
    key = (tuple(sorted(hero, key=str)), tuple(sorted(board, key=str)))
    try:
        return _equity(key[0], key[1], cells, read.aggressive)
    except ValueError:
        return None
