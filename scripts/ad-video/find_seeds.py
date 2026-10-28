"""Find DEAL_SEED values for the spots of the ad video (plan 098).

Run from backend/: uv run python ../scripts/ad-video/find_seeds.py SPOT [MAX_SEEDS]
SPOT is one of:
  co     hand 1, hero in the CO with 8h Qs and the coach says FOLD (not in the open range)
  shove  10 BB stacks: the coach's reason is the SB shove range, at 6 BB or more behind, within 30 hands
  icm    10 BB stacks: the coach's reason is an ICM all-in call, within 12 hands
Until the spot the hero folds, or checks when that is free, as the recorder does. A hit prints
the seed and the number of the hand.
"""
from __future__ import annotations

import sys

from app.core.config import settings
from app.services.game_session import GameSession

SMALL = {"starting_stack": 2000, "small_blind": 100, "big_blind": 200, "level_minutes": 600}


def fold_or_check(session: GameSession) -> None:
    legal = {a["kind"] for a in session.state()["legalActions"]}
    session.hero_action("check" if "check" in legal else "fold")


def hit_co(seed: int) -> bool:
    session = GameSession()
    session.start()
    hero = session.tournament.players[session.hero_seat]
    cards = sorted(str(c) for c in hero.hole_cards)
    advice = session.coach_advice()
    return (cards == sorted(["8♥", "Q♠"]) and advice["recommendedAction"] == "FOLD"
            and advice["reasonCode"] == "open_out")


def hit_reason(prefix: str, hands: int):
    def check(seed: int) -> bool:
        session = GameSession(**SMALL)
        session.start()
        for _ in range(hands):
            while session.state()["waitingForHero"]:
                advice = session.coach_advice()
                if advice["reasonCode"].startswith(prefix) and int(advice["reasonParams"].get("depth", 99)) >= 6:
                    return True
                fold_or_check(session)
            if session.phase() != "handOver" or session.status != "active":
                return False
            if session.tournament.players[session.hero_seat].stack == 0:
                return False  # busted: the recording would need a re-entry
            session.next_hand()
        return False
    return check


def main() -> None:
    spot, limit = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 3000
    check = {"co": hit_co, "shove": hit_reason("sb_shove", 30), "icm": hit_reason("allin_icm", 12)}[spot]
    for seed in range(limit):
        settings.deal_seed = seed
        if check(seed):
            print("seed", seed)
            if spot != "co":
                break


if __name__ == "__main__":
    main()
