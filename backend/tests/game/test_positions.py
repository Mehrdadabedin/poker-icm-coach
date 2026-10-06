"""Position mapping tests (Atomic Part 005)."""
from __future__ import annotations

import random

import pytest

from app.game.actions import Action, ActionType
from app.game.positions import (
    POSITION_ORDER,
    all_positions,
    position_for,
    position_labels,
)
from app.services.game_session import GameSession


def test_nine_positions_clockwise() -> None:
    assert len(POSITION_ORDER) == 9
    assert POSITION_ORDER == [
        "UTG", "UTG+1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB",
    ]


def test_all_positions_helper() -> None:
    assert set(all_positions(9)) == set(POSITION_ORDER)


def test_mapping_all_seats_for_dealer_zero() -> None:
    # Dealer at seat 0 -> UTG seat 1 ... BB seat 8 (dealer 9-seat order).
    expected = {
        0: "BTN", 1: "SB", 2: "BB", 3: "UTG", 4: "UTG+1",
        5: "MP", 6: "LJ", 7: "HJ", 8: "CO",
    }
    for seat, label in expected.items():
        assert position_for(dealer_seat=0, seat=seat, num_seats=9) == label, seat


def test_blinds_next_to_button() -> None:
    # For dealer 3: SB = seat 4, BB = seat 5.
    assert position_for(3, 4, 9) == "SB"
    assert position_for(3, 5, 9) == "BB"
    assert position_for(3, 3, 9) == "BTN"


def test_mapping_other_dealer() -> None:
    assert position_for(7, 8, 9) == "SB"
    assert position_for(7, 0, 9) == "BB"
    assert position_for(7, 7, 9) == "BTN"
    assert position_for(7, 1, 9) == "UTG"


def test_wrap_around() -> None:
    # Dealer 8: seats wrap: seat 0 = SB, seat 1 = BB, seat 2 = UTG.
    assert position_for(8, 0, 9) == "SB"
    assert position_for(8, 1, 9) == "BB"
    assert position_for(8, 2, 9) == "UTG"


def test_invalid_seat_raises() -> None:
    with pytest.raises(ValueError):
        position_for(0, 9, 9)
    with pytest.raises(ValueError):
        position_for(0, -1, 9)


def test_six_max_supported() -> None:
    # 6-max rotation: BTN, SB, BB, UTG, HJ, CO
    assert len(all_positions(6)) == 6
    assert position_for(0, 0, 6) == "BTN"
    assert position_for(0, 1, 6) == "SB"
    assert position_for(0, 2, 6) == "BB"
    assert position_for(0, 3, 6) == "UTG"
    assert position_for(0, 4, 6) == "HJ"
    assert position_for(0, 5, 6) == "CO"


def test_ring_rotation_advances_with_button_9_handed() -> None:
    """As the button moves one seat clockwise each hand, every other seat
    advances one step through the ring; SB stays immediately to the left of
    the button and BB immediately to the left of SB."""
    ring = ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "LJ", "HJ", "CO"]
    for dealer in range(9):
        for seat in range(9):
            offset = (seat - dealer) % 9
            assert position_for(dealer, seat, 9) == ring[offset], (dealer, seat)
    # after one hand the button moves +1; labels advance by one ring step
    for dealer in range(9):
        assert position_for(dealer, dealer, 9) == "BTN"
        assert position_for(dealer, (dealer + 1) % 9, 9) == "SB"   # left of button
        assert position_for(dealer, (dealer + 2) % 9, 9) == "BB"   # left of SB


def test_ring_rotation_advances_with_button_6_handed() -> None:
    ring = ["BTN", "SB", "BB", "UTG", "HJ", "CO"]
    for dealer in range(6):
        for seat in range(6):
            offset = (seat - dealer) % 6
            assert position_for(dealer, seat, 6) == ring[offset], (dealer, seat)
    for dealer in range(6):
        assert position_for(dealer, dealer, 6) == "BTN"
        assert position_for(dealer, (dealer + 1) % 6, 6) == "SB"
        assert position_for(dealer, (dealer + 2) % 6, 6) == "BB"


def test_no_hardcoded_jump_after_utg_in_9_handed() -> None:
    """HJ must be preceded by LJ in the 9-handed ring (UTG+1 -> MP -> LJ -> HJ)."""
    from app.game.positions import ROTATION_ORDER_9, rotation_order

    assert ROTATION_ORDER_9.index("UTG") + 1 == ROTATION_ORDER_9.index("UTG+1")
    assert ROTATION_ORDER_9.index("LJ") + 1 == ROTATION_ORDER_9.index("HJ")
    assert rotation_order(9) == ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "LJ", "HJ", "CO"]
    assert rotation_order(6) == ["BTN", "SB", "BB", "UTG", "HJ", "CO"]


def test_multi_hand_hero_rotation_is_bb_sb_btn_co() -> None:
    """Across consecutive hands the hero advances one ring step per hand:
    BB -> SB -> BTN -> CO -> HJ -> ... (the next hand's button is this hand's
    small blind, i.e. the button walks +1 in seat index)."""
    from app.game.dealer_button import next_button

    ring = ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "LJ", "HJ", "CO"]
    hero_seat = 0
    dealer = 6  # first rotation -> 7, so the hero starts on BB
    dealer = next_button(dealer, 9, set(range(9)))
    seen = []
    for _ in range(5):
        seen.append(position_for(dealer, hero_seat, 9))
        dealer = next_button(dealer, 9, set(range(9)))
    assert seen[0] == "BB"
    for a, b in zip(seen, seen[1:], strict=False):
        assert (ring.index(a) - ring.index(b)) % 9 == 1, (seen, a, b)


def test_dealer_advances_in_seat_index_order() -> None:
    """The dealer's seat index advances +1 per hand (0 -> 1 -> ... -> 8 -> 0),
    matching the +1 position ring used by every other engine module."""
    from app.game.dealer_button import next_button

    expected = [0, 1, 2, 3, 4, 5, 6, 7, 8, 0]
    dealer = 0
    for exp in expected:
        assert dealer == exp
        dealer = next_button(dealer, 9, set(range(9)))


def _play_out(s: GameSession, guard: int = 5000) -> None:
    """Advance the current hand to completion (hero folds when asked)."""
    steps = 0
    while not s.engine.is_complete and steps < guard:
        actor = s.engine.current_actor
        if actor is None:
            break
        player = s.tournament.players[actor]
        if player.is_human:
            s.engine.act(actor, Action(ActionType.FOLD))
        else:
            s.engine.advance_bot(actor)
        steps += 1
    assert s.engine.is_complete, "hand did not complete"


def test_position_labels_short_handed_rings() -> None:
    """A43: 8 and 7 active seats drop early positions and keep the CO."""
    labels8 = position_labels(button=0, active_seats=set(range(8)), num_seats=9)
    assert labels8 == {0: "BTN", 1: "SB", 2: "BB", 3: "UTG", 4: "UTG+1",
                       5: "LJ", 6: "HJ", 7: "CO"}
    labels7 = position_labels(button=0, active_seats=set(range(7)), num_seats=9)
    assert labels7 == {0: "BTN", 1: "SB", 2: "BB", 3: "UTG", 4: "LJ",
                       5: "HJ", 6: "CO"}


def test_position_labels_omit_inactive_seats() -> None:
    """A43: busted seat gets no label, CO is present, exactly 8 labels."""
    labels = position_labels(button=0, active_seats={0, 1, 2, 3, 4, 5, 6, 7}, num_seats=9)
    assert len(labels) == 8
    assert 8 not in labels
    assert "CO" in labels.values()


def test_state_view_positions_only_active_players() -> None:
    """A43: the state view labels exactly the 8 active players; the busted
    seat has position None."""
    s = GameSession(starting_stack=10_000, rng=random.Random(3))
    s.start()
    _play_out(s)
    busted = s.tournament.players[3]
    busted.is_eliminated = True
    busted.sit_out = True
    state = s.state()
    views = {p["seat"]: p for p in state["players"]}
    assert views[3]["position"] is None
    active = [p for p in state["players"] if not p["sitsOut"]]
    assert len(active) == 8
    assert "CO" in [p["position"] for p in active]
