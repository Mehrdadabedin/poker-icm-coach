"""Quiz questions built from the engine, never from a question bank (plan 110).

A seed and a template rebuild a spot exactly. The coach decides the answer, so
the quiz and the table coach cannot disagree, and a question costs no API credit.
"""
from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Literal

from pydantic import ValidationError

from app.core.config import settings
from app.game.positions import ROTATION_TABLES
from app.schemas.coach_schemas import CoachAdviceRequest
from app.services.session_coach import advice_dict, request_from_advice
from app.strategy.coach import Coach, CoachRequest
from app.strategy.hand_classes import all_starting_hands
from app.strategy.villain_range import VillainRead

Template = Literal["push_fold", "call_allin", "bubble", "pay_jump", "open_position"]
Level = Literal["easy", "medium", "hard"]
Choice = Literal["fold", "call", "raise", "allin"]

LEVELS: tuple[Level, ...] = ("easy", "medium", "hard")
LEVEL_TEMPLATES: dict[Level, tuple[Template, ...]] = {
    "easy": ("push_fold", "open_position"),
    "medium": ("call_allin", "bubble"),
    "hard": ("pay_jump",),
}
TRIES_PER_TEMPLATE = 20
FACING_ALL_IN: tuple[Choice, ...] = ("fold", "call")
FOLDED_TO_HERO: tuple[Choice, ...] = ("fold", "raise", "allin")
_CHOICE_OF_ACTION: dict[str, Choice] = {
    "FOLD": "fold", "CHECK": "fold", "CALL": "call", "RAISE": "raise",
    "OPEN JAM": "allin", "RESHOVE": "allin", "ALL-IN": "allin",
}
_HANDS = all_starting_hands()
_coach = Coach()


@dataclass(frozen=True)
class Spot:
    template: Template
    request: CoachAdviceRequest
    hand_class: str
    opponents: tuple[int, ...] = ()  # chips behind of each opponent still in the hand
    villain_stack: int | None = None  # chips of the player who is all in
    villain_position: str = ""

    def coach_request(self) -> CoachRequest:
        """The request the table coach would get at this decision point."""
        req = request_from_advice(self.request)
        req.opponents = self.opponents
        if self.villain_stack is not None:
            req.villain = VillainRead(seat=1, position=self.villain_position,
                                      preflop="open", aggressive=True)
        return req

    @property
    def choices(self) -> tuple[Choice, ...]:
        return FACING_ALL_IN if self.villain_stack is not None else FOLDED_TO_HERO

    @property
    def key(self) -> tuple[str, str, str, int]:
        """What the repeat window compares: the same hand in the same kind of spot."""
        req = self.request
        return (self.hand_class, self.template, req.position, req.stack // req.bigBlind // 5)


@dataclass(frozen=True)
class Verdict:
    action: str
    choice: Choice
    also_played: Choice | None
    confidence: float
    advice: dict


def _payout(paid: int) -> list[float]:
    weights = [0.6 ** place for place in range(paid)]
    return [round(w / sum(weights), 4) for w in weights]


def _acting_order(players: int) -> list[str]:
    """Seats in preflop order for this many players left."""
    return ROTATION_TABLES[players][3:] + ["BTN", "SB", "BB"]


def _hero_cards(rng: random.Random, hand: dict) -> list[dict]:
    name = hand["name"]
    suits = rng.sample("shdc", 2)
    if name.endswith("s"):
        suits[1] = suits[0]
    return [{"rank": name[0], "suit": suits[0]}, {"rank": name[1], "suit": suits[1]}]


def _weight(name: str, favour_strong: bool) -> int:
    """Calling a shove is rarely right with a random hand, so that template deals
    pairs, aces and broadway hands five times as often."""
    strong = name[0] == name[1] or name[0] == "A" or (name[0] in "AKQJT" and name[1] in "AKQJT")
    return 5 if favour_strong and strong else 1


def _spot(rng: random.Random, template: Template, *, players: int, paid: int,
          positions: list[str], hero_bb: tuple[int, int], others_bb: tuple[int, int],
          villain_bb: tuple[int, int] | None = None,
          favour_strong: bool = False) -> Spot | None:
    bb = rng.choice([200, 400, 500, 1000, 2000, 5000])
    sb, ante = bb // 2, rng.choice([0, 0, bb // 10])
    hero = rng.randint(*hero_bb) * bb
    position = rng.choice(positions)
    others = [rng.randint(*others_bb) * bb for _ in range(players - 1)]
    villain = rng.randint(*villain_bb) * bb if villain_bb else None
    order = _acting_order(players)
    behind = len(order) - 1 - order.index(position)
    villain_position = ""
    opponents: tuple[int, ...]
    if villain is not None:
        # Only the small blind shoves into the big blind: its range is the one the
        # coach knows (the shove table), and an all-in player has no chips behind.
        others[0], villain_position, opponents = villain, "SB", (0,)
    else:
        opponents = tuple(others[:behind])
    blind_in = {"SB": sb, "BB": bb}.get(position, 0)
    bet = villain if villain is not None else bb
    shover_blind = sb if villain is not None else 0  # already inside the shove
    hand = rng.choices(_HANDS, [_weight(h["name"], favour_strong) for h in _HANDS])[0]
    try:
        request = CoachAdviceRequest.model_validate({
            "heroCards": _hero_cards(rng, hand), "position": position, "stack": hero,
            "bigBlind": bb, "smallBlind": sb, "ante": ante,
            "pot": sb + bb + ante * players + (villain or 0) - shover_blind,
            "toCall": max(0, bet - blind_in), "playersRemaining": players,
            "paidPositions": paid, "stacks": [hero, *others], "payout": _payout(paid),
            "facingRaise": villain is not None})
    except ValidationError:
        return None
    if request.stack < 2 * bb or request.pot < sb + bb:
        return None
    return Spot(template, request, hand["name"], opponents, villain, villain_position)


def build_spot(template: Template, seed: int) -> Spot | None:
    rng = random.Random(seed)
    # Short stacks only where the coach knows the maths: folded to the small blind,
    # or the big blind facing the small blind's shove, up to 20 BB. Other seats at
    # these depths still use the open ranges, which do not widen as stacks shrink.
    if template == "push_fold":
        players = rng.randint(6, 9)
        return _spot(rng, template, players=players, paid=rng.randint(2, 3),
                     positions=["SB"], hero_bb=(5, 19), others_bb=(5, 40))
    if template == "open_position":
        players = rng.randint(6, 9)
        return _spot(rng, template, players=players, paid=rng.randint(2, 3),
                     positions=_acting_order(players)[:-1], hero_bb=(30, 40), others_bb=(10, 50))
    if template == "call_allin":
        players = rng.randint(3, 9)
        paid = rng.randint(2, 3)
    elif template == "bubble":
        paid = rng.randint(2, 5)
        players = paid + 1
    else:
        players = rng.randint(3, 6)
        paid = rng.choice([p for p in range(2, players + 1) if p != players - 1])
    return _spot(rng, template, players=players, paid=paid, positions=["BB"], hero_bb=(6, 30),
                 others_bb=(3, 40), villain_bb=(5, 19), favour_strong=True)


def evaluate(spot: Spot) -> Verdict | None:
    """The coach's answer. None when it is not one of the choices on offer."""
    advice = advice_dict(_coach.recommend(spot.coach_request()))
    choice = _CHOICE_OF_ACTION.get(advice["recommendedAction"])
    if choice is None or choice not in spot.choices:
        return None
    also = _CHOICE_OF_ACTION.get(advice["alternativeAction"])
    return Verdict(advice["recommendedAction"], choice,
                   also if also in spot.choices and also != choice else None,
                   advice["confidence"], advice)


def find_question(level: Level, rng: random.Random,
                  seen: set[tuple[str, str, str, int]]) -> tuple[int, Template, Spot] | None:
    """A spot the coach is sure about and the player has not just had, or None."""
    templates = list(LEVEL_TEMPLATES[level])
    rng.shuffle(templates)
    for template in templates:
        for _ in range(TRIES_PER_TEMPLATE):
            seed = rng.getrandbits(48)
            spot = build_spot(template, seed)
            if spot is None or spot.key in seen:
                continue
            verdict = evaluate(spot)
            if verdict and verdict.confidence >= settings.quiz_min_confidence:
                return seed, template, spot
    return None
