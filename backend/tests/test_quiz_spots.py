"""Quiz spots (plan 110): built from a seed, validated, and answered by the coach."""
from __future__ import annotations

import random
from typing import get_args

import pytest

from app.core.config import settings
from app.schemas.coach_schemas import CoachAdviceRequest
from app.services import quiz_spots
from app.services.quiz_spots import (
    FACING_ALL_IN,
    FOLDED_TO_HERO,
    LEVEL_TEMPLATES,
    LEVELS,
    Template,
    build_spot,
    evaluate,
    find_question,
)

TEMPLATES: tuple[Template, ...] = get_args(Template)
SEEDS = range(500)


@pytest.mark.parametrize("template", TEMPLATES)
def test_the_same_seed_gives_the_same_spot_and_answer(template: Template) -> None:
    for seed in range(100):
        first, second = build_spot(template, seed), build_spot(template, seed)
        assert first == second, f"{template} seed {seed} built two different spots"
        if first:
            a, b = evaluate(first), evaluate(second)  # type: ignore[arg-type]
            assert a == b, f"the coach answered {template} seed {seed} two ways"


@pytest.mark.parametrize("template", TEMPLATES)
def test_every_template_builds_spots_the_coach_accepts(template: Template) -> None:
    built = 0
    for seed in SEEDS:
        spot = build_spot(template, seed)
        if spot is None:
            continue
        built += 1
        again = CoachAdviceRequest.model_validate(spot.request.model_dump())
        assert again == spot.request
        assert spot.request.stack >= 2 * spot.request.bigBlind
        assert spot.request.pot >= spot.request.smallBlind + spot.request.bigBlind
    assert built > 0.9 * len(SEEDS), f"{template} built a spot for only {built} of 500 seeds"


@pytest.mark.parametrize("template", TEMPLATES)
def test_the_choices_are_legal_for_the_spot(template: Template) -> None:
    for seed in SEEDS:
        spot = build_spot(template, seed)
        if spot is None:
            continue
        facing = spot.request.toCall > 0 and spot.villain_stack is not None
        assert spot.choices == (FACING_ALL_IN if facing else FOLDED_TO_HERO)
        verdict = evaluate(spot)
        if verdict:
            assert verdict.choice in spot.choices, f"{template} seed {seed}: answer not on offer"
            assert verdict.also_played in (None, *spot.choices)
            assert verdict.also_played != verdict.choice


def test_the_bubble_and_pay_jump_spots_match_their_names() -> None:
    for seed in range(200):
        bubble = build_spot("bubble", seed)
        assert bubble and bubble.request.playersRemaining == bubble.request.paidPositions + 1
        jump = build_spot("pay_jump", seed)
        assert jump and 3 <= jump.request.playersRemaining <= 6 and jump.request.paidPositions >= 2


@pytest.mark.parametrize("level", LEVELS)
def test_no_served_spot_is_below_the_minimum_confidence(level: quiz_spots.Level) -> None:
    minimum = settings.quiz_min_confidence
    assert minimum == 0.60
    for seed in range(40):
        found = find_question(level, random.Random(seed), set())
        assert found, f"no {level} question found for rng {seed}"
        verdict = evaluate(found[2])
        assert verdict and verdict.confidence >= minimum, (
            f"served a {found[1]} spot at confidence {verdict and verdict.confidence}")
        assert found[1] in LEVEL_TEMPLATES[level]


def test_it_gives_up_after_twenty_tries_per_template(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "quiz_min_confidence", 1.1)  # nothing is sure enough
    calls: list[str] = []
    real = quiz_spots.build_spot
    monkeypatch.setattr(quiz_spots, "build_spot", lambda t, s: calls.append(t) or real(t, s))
    assert find_question("easy", random.Random(1), set()) is None
    assert len(calls) == 20 * len(LEVEL_TEMPLATES["easy"]), "plan 110: 20 tries per template"


def test_a_spot_in_the_repeat_window_is_not_served_again() -> None:
    seen: set[tuple[str, str, str, int]] = set()
    for rng_seed in range(30):
        found = find_question("easy", random.Random(rng_seed), seen)
        assert found
        assert found[2].key not in seen, "served a spot from the repeat window"
        seen.add(found[2].key)


def test_short_stacks_are_only_the_small_blind_against_the_big_blind() -> None:
    """The coach's open ranges do not widen as stacks shrink, so the quiz asks short
    stacks only where it plays the shove table: folded to the small blind, or the big
    blind facing the small blind's shove, at 20 BB or less."""
    for seed in range(200):
        spot = build_spot("push_fold", seed)
        assert spot and spot.request.position == "SB" and len(spot.opponents) == 1, seed
        assert spot.request.stack / spot.request.bigBlind < 20, seed
        deep = build_spot("open_position", seed)
        assert deep and deep.request.stack / deep.request.bigBlind >= 30, seed


@pytest.mark.parametrize("template", ["call_allin", "bubble", "pay_jump"])
def test_all_in_questions_use_the_all_in_maths(template: Template) -> None:
    for seed in range(120):
        spot = build_spot(template, seed)
        assert spot is not None
        req = spot.request
        assert (req.position, spot.villain_position, spot.opponents) == ("BB", "SB", (0,)), seed
        # the shove already holds the small blind: counted once
        assert req.pot == req.bigBlind + req.ante * req.playersRemaining + spot.villain_stack, seed
        verdict = evaluate(spot)
        if verdict:  # was call_clears / call_below: pot odds plus 6%, with no ICM
            assert verdict.advice["reasonCode"].startswith("allin_"), (seed, verdict.advice["reasonCode"])


def test_the_question_shows_the_big_blinds_stack_only_when_folded_to_the_small_blind() -> None:
    from app.api.routes_quiz import _situation
    sb = build_spot("push_fold", 1)
    assert sb is not None
    expected = round((sb.opponents[0] + sb.request.bigBlind) / sb.request.bigBlind, 1)
    assert _situation(sb)["bigBlindStackBb"] == expected
    for template in ("open_position", "call_allin"):
        assert _situation(build_spot(template, 1))["bigBlindStackBb"] is None
