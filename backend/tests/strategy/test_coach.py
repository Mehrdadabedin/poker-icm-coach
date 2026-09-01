"""Strategy coach tests (Atomic Part 029)."""
from __future__ import annotations

from app.poker.card import card_from_str
from app.strategy.coach import Coach, CoachRequest
from app.strategy.coach_modes import filter_for_mode

H = card_from_str

PAYOUT = [0.4, 0.25, 0.15, 0.1, 0.06, 0.04]


def base_request(**kw) -> CoachRequest:
    defaults = dict(
        hero=[H("As"), H("Ah")], position="BTN", stack=30000, big_blind=1000,
        small_blind=500, ante=0, pot=1800, to_call=0, board=[], street="preflop",
        players_remaining=9, paid_positions=6, stacks=[30000] * 9,
        payout=list(PAYOUT), facing_raise=False, hero_seat=0, mode="advanced",
    )
    defaults.update(kw)
    return CoachRequest(**defaults)


def recommend(**kw):
    return Coach().recommend(base_request(**kw))


def test_recommendation_has_action_and_reason() -> None:
    rec = recommend()
    assert rec.recommended_action
    assert rec.reasoning


def test_premium_hand_opens_raise() -> None:
    rec = recommend(hero=[H("As"), H("Ah")], position="BTN", stack=30000)
    assert rec.recommended_action == "RAISE"
    assert rec.alternative_action in ("CALL", "3-BET", "OPEN JAM", "FOLD", "CHECK")


def test_trash_from_utg_folds() -> None:
    rec = recommend(hero=[H("7h"), H("2d")], position="UTG", stack=30000)
    assert rec.recommended_action == "FOLD"


def test_short_stack_premium_jams() -> None:
    rec = recommend(hero=[H("As"), H("Ah")], position="BTN", stack=8000)  # 8 BB
    assert rec.recommended_action in ("OPEN JAM", "ALL-IN")


def test_facing_raise_premium_threebets() -> None:
    rec = recommend(hero=[H("As"), H("Ah")], position="CO", stack=30000,
                    to_call=3000, pot=6000, facing_raise=True)
    assert rec.recommended_action in ("3-BET", "RAISE", "RESHOVE", "ALL-IN")


def test_facing_raise_trash_folds() -> None:
    rec = recommend(hero=[H("7h"), H("2d")], position="CO", stack=30000,
                    to_call=3000, pot=6000, facing_raise=True)
    assert rec.recommended_action == "FOLD"


def test_steal_spot_suggests_raise() -> None:
    rec = recommend(hero=[H("As"), H("9h")], position="BTN", stack=30000)
    assert rec.recommended_action in ("RAISE", "OPEN JAM", "3-BET")


def test_dynamic_recalculation_position() -> None:
    utg = recommend(hero=[H("Qh"), H("Js")], position="UTG", stack=30000)
    btn = recommend(hero=[H("Qh"), H("Js")], position="BTN", stack=30000)
    assert utg.recommended_action != btn.recommended_action or (
        utg.confidence != btn.confidence or utg.reasoning != btn.reasoning
    )


def test_postflop_strong_bet() -> None:
    rec = recommend(
        hero=[H("As"), H("Kh")], board=[H("Ac"), H("Kd"), H("7s")],
        street="flop", to_call=0, pot=4000, stack=30000,
    )
    assert rec.recommended_action in ("BET", "RAISE", "CHECK")


def test_postflop_weak_facing_bet_folds() -> None:
    rec = recommend(
        hero=[H("7h"), H("2d")], board=[H("As"), H("Kd"), H("Qs")],
        street="flop", to_call=3000, pot=6000, stack=30000,
    )
    assert rec.recommended_action == "FOLD"


def test_icm_pressure_affects_bubble_call() -> None:
    # hero 18 BB, villain jams, on the bubble: marginal call gets ICM pressure flag
    rec = recommend(
        hero=[H("Qh"), H("Js")], position="BB", stack=18000, to_call=16000,
        pot=34000, players_remaining=7, paid_positions=6, facing_raise=True,
        stacks=[18000, 16000] + [22000] * 7,
    )
    assert rec.icm_pressure
    assert rec.risk_premium


def test_coach_never_returns_none_for_legal_states() -> None:
    for street, board, to_call in [
        ("preflop", [], 0),
        ("flop", [H("Ac"), H("7d"), H("2s")], 500),
        ("turn", [H("Ac"), H("7d"), H("2s"), H("9h")], 0),
        ("river", [H("Ac"), H("7d"), H("2s"), H("9h"), H("4c")], 3000),
    ]:
        rec = recommend(board=board, street=street, to_call=to_call)
        assert rec.recommended_action


def test_modes_filter_detail() -> None:
    rec = recommend()
    advanced = filter_for_mode(rec, "advanced")
    beginner = filter_for_mode(rec, "beginner")
    # beginner output is a strict subset of advanced output
    assert set(beginner.recommendation_detail) <= set(advanced.recommendation_detail)
    assert beginner.recommended_action == advanced.recommended_action


def test_raise_recommendation_icm_ev_matches_action() -> None:
    """A RAISE recommendation must display a RAISE-vs-FOLD ICM EV, never a
    CALL-vs-FOLD comparison that contradicts the recommendation."""
    rec = recommend(
        hero=[H("As"), H("Kh")], board=[H("Ac"), H("Kd"), H("7s")],
        street="flop", to_call=2000, pot=6000, facing_raise=True,
    )
    assert rec.recommended_action == "RAISE"
    icm_ev = rec.recommendation_detail.get("ICM EV", "")
    assert "RAISE vs FOLD" in icm_ev, f"ICM EV must describe RAISE, got: {icm_ev}"
    assert "call" not in icm_ev.lower(), f"ICM EV must not describe CALL: {icm_ev}"
    assert rec.ev is not None and rec.ev["action"] == "RAISE"
    assert rec.ev["chipRecommendation"] == "RAISE"


def test_fold_recommendation_icm_ev_matches_action() -> None:
    rec = recommend(
        hero=[H("7h"), H("2d")], position="CO", stack=30000,
        to_call=3000, pot=6000, facing_raise=True,
    )
    assert rec.recommended_action == "FOLD"
    icm_ev = rec.recommendation_detail.get("ICM EV", "")
    assert icm_ev.startswith("FOLD"), f"ICM EV must describe FOLD, got: {icm_ev}"
    assert rec.ev is not None and rec.ev["action"] == "FOLD"
    assert rec.ev["chipRecommendation"] == "FOLD"


def test_threebet_recommendation_icm_ev_matches_action() -> None:
    rec = recommend(
        hero=[H("As"), H("Ah")], position="CO", stack=30000,
        to_call=3000, pot=6000, facing_raise=True,
    )
    assert rec.recommended_action in ("3-BET", "RAISE", "RESHOVE", "ALL-IN")
    icm_ev = rec.recommendation_detail.get("ICM EV", "")
    action = rec.recommended_action
    assert action in icm_ev, f"ICM EV must describe {action}, got: {icm_ev}"


def test_icm_ev_fold_baseline_is_current_stack() -> None:
    """Folding keeps the hero's current stack (correct baseline)."""
    rec = recommend(
        hero=[H("Qh"), H("Js")], position="BB", stack=18000, to_call=16000,
        pot=34000, players_remaining=7, paid_positions=6, facing_raise=True,
        stacks=[18000, 16000] + [22000] * 7,
    )
    # fold equity must be the ICM equity of the CURRENT stacks (hero 18000)
    from app.icm.icm_engine import icm_equities

    eq_fold = icm_equities([18000, 16000] + [22000] * 7, list(PAYOUT))[0]
    shown = float(rec.recommendation_detail.get("TOURNAMENT EQUITY", "0"))
    assert abs(shown - round(eq_fold, 3)) < 1e-9  # display uses 3 decimals


def test_chip_ev_label_matches_recommendation() -> None:
    """Chip EV action label and recommendation must match the decision."""
    rec = recommend(
        hero=[H("As"), H("Kh")], board=[H("Ac"), H("Kd"), H("7s")],
        street="flop", to_call=2000, pot=6000, facing_raise=True,
    )
    assert rec.ev["action"] == rec.recommended_action
    # positive EV -> the action itself is the chip recommendation
    if rec.ev["evClass"] == "POSITIVE EV":
        assert rec.ev["chipRecommendation"] == rec.recommended_action
