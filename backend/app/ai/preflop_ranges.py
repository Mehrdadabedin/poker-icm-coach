"""Baseline preflop opening ranges by position and stack depth.

BASELINE STRATEGY RANGE — heuristic practice ranges, not solver-exact.
Band lookup picks the closest shallower band; deeper stacks reuse the
deepest defined band.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.strategy.hand_codec import HandCell, parse_range, range_weight

# band -> range shorthand per position (bands: 30, 20, 12, 8, 5 BB)
_BANDS = [30, 20, 12, 8, 5]

_DATA: dict[str, str] = {
    "UTG": "30:22+,A2s+,KTs+,QTs+,JTs,AJo+,KQo "
           "| 20:77+,A9s+,KQs+,AJo+,KTs+ | 12:88+,A8s+,AJo+,KTs+ "
           "| 8:66+,A6s+,ATo+,KQs+ | 5:44+,A4s+,K9s+,ATo+,KQo",
    "UTG+1": "30:22+,A2s+,K9s+,QTs+,J9s+,ATo+,KQo "
             "| 20:66+,A7s+,KQs+,ATo+,KTs+ | 12:77+,A7s+,ATo+,KTs+ "
             "| 8:55+,A5s+,KTs+,ATo+ | 5:33+,A3s+,K8s+,ATo+,KQo",
    "MP": "30:22+,A2s+,K8s+,Q9s+,J9s+,T9s,ATo+,KJo+,QJo "
          "| 20:55+,A6s+,KTs+,QJs,JTs,ATo+,KQo | 12:66+,A6s+,KTs+,QTs+,ATo+,KQo "
          "| 8:44+,A4s+,K9s+,QTs+,ATo+,KJo+ | 5:33+,A3s+,K7s+,Q9s+,JTs,ATo+,KTo+",
    "LJ": "30:22+,A2s+,K7s+,Q9s+,J9s+,T8s+,97s+,ATo+,KJo+,QJo "
          "| 20:44+,A5s+,K9s+,QTs+,JTs,T9s,ATo+,KQo | 12:55+,A5s+,K9s+,QTs+,JTs,ATo+,KQo "
          "| 8:33+,A3s+,K8s+,Q9s+,JTs,ATo+,KTo+ | 5:22+,A2s+,K5s+,Q8s+,J9s+,T9s,ATo+,K9o+",
    "HJ": "30:22+,A2s+,K6s+,Q8s+,J8s+,T8s+,98s,87s,ATo+,KJo+,QJo,JTo "
          "| 20:44+,A4s+,K8s+,Q9s+,JTs,T9s,98s,ATo+,KQo | 12:44+,A4s+,K8s+,Q9s+,JTs,T9s,ATo+,KQo "
          "| 8:22+,A2s+,K6s+,Q8s+,J9s+,T9s,ATo+,KTo+ | 5:22+,A2s+,K4s+,Q6s+,J8s+,T8s+,98s,ATo+,K9o+",
    "CO": "30:22+,A2s+,K5s+,Q8s+,J8s+,T8s+,97s+,86s+,75s+,65s,ATo+,KTo+,QTo+,JTo "
          "| 20:33+,A3s+,K7s+,Q9s+,J9s+,T9s,98s,ATo+,KQo | 12:33+,A3s+,K7s+,Q9s+,J9s+,T9s,98s,ATo+,KQo "
          "| 8:22+,A2s+,K4s+,Q7s+,J8s+,T8s+,98s,ATo+,KTo+ | 5:22+,A2s+,K3s+,Q5s+,J7s+,T8s+,97s+,ATo+,K9o+",
    "BTN": "30:22+,A2s+,K4s+,Q4s+,J7s+,T7s+,96s+,85s+,74s+,64s+,53s+,43s,A2o+,K7o+,Q9o+,J9o+ "
           "| 20:22+,A2s+,K4s+,Q7s+,J8s+,T8s+,97s+,86s+,76s,A2o+,K9o+,QTo+,JTo "
           "| 12:22+,A2s+,K4s+,Q7s+,J8s+,T8s+,97s+,86s+,76s,A2o+,K9o+,QTo+,JTo "
           "| 8:22+,A2s+,K2s+,Q5s+,J8s+,T8s+,97s+,A2o+,K8o+,QTo+ "
           "| 5:22+,A2s+,K2s+,Q4s+,J6s+,T8s+,97s+,86s+,75s+,A2o+,K5o+,Q9o+,J9o+",
    "SB": "30:22+,A2s+,K7s+,Q9s+,J8s+,T8s+,97s+,87s,ATo+,KJo+,QJo "
          "| 20:44+,A4s+,K9s+,QTs+,JTs,T9s,ATo+,KQo | 12:55+,A5s+,K9s+,QTs+,JTs,T9s,ATo+,KQo "
          "| 8:33+,A3s+,K8s+,Q9s+,JTs,T9s,ATo+,KTo+ | 5:22+,A2s+,K5s+,Q8s+,J9s+,T9s,A9o+,KTo+",
    "BB": "30:22+,A2s+,K4s+,Q6s+,J8s+,T8s+,97s+,86s+,75s+,64s+,A2o+,K9o+,QTo+,JTo "
          "| 20:33+,A3s+,K6s+,Q8s+,J9s+,T9s,98s,87s,ATo+,KQo | 12:33+,A3s+,K6s+,Q8s+,J9s+,T9s,98s,87s,ATo+,KQo "
          "| 8:22+,A2s+,K3s+,Q6s+,J8s+,T8s+,98s,A2o+,K9o+,QTo+ | 5:22+,A2s+,K2s+,Q4s+,J7s+,T7s+,97s+,86s+,A2o+,K7o+,Q9o+",
}

_OPEN_RANGES: dict[tuple[str, int], set[HandCell]] = {}


@dataclass(frozen=True, slots=True)
class OpenRange:
    position: str
    band: int
    cells: frozenset[HandCell]

    @property
    def weight(self) -> int:
        return range_weight(set(self.cells))


def _build() -> None:
    for position, row in _DATA.items():
        for part in row.split("|"):
            band_text, _, range_text = part.strip().partition(":")
            band = int(band_text.strip())
            _OPEN_RANGES[(position, band)] = parse_range(range_text)


_build()


def _band_for(depth_bb: int) -> int:
    for band in _BANDS:
        if depth_bb >= band:
            return band
    return _BANDS[-1]


def open_range_for(position: str, stack_bb: int) -> OpenRange:
    """Opening range for a position at the given effective stack depth."""
    band = _band_for(stack_bb)
    cells = frozenset(_OPEN_RANGES.get((position, band), _OPEN_RANGES.get((position, _BANDS[0]), set())))
    return OpenRange(position=position, band=band, cells=cells)


def range_combo_count(position: str, stack_bb: int) -> int:
    return open_range_for(position, stack_bb).weight
