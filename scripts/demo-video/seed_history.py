"""Give the local demo account a saved history, so the demo video can show the
Report and Hand History with real numbers (plan 082).

Usage (needs the local PostgreSQL from docker compose):
  cd backend && uv run python ../scripts/demo-video/seed_history.py demoplayer

Plays TOURNAMENTS practice tournaments for that account through the real
game engine and saves them like live play. The player mostly follows the
coach (FOLLOW of the time) and bets a mix of sizes, so the Report has
mistakes, leaks and a bet-size chart to show. Replaces that account's
saved history; nothing else in the database is touched.
"""
from __future__ import annotations

import random
import sys

from sqlalchemy import text

from app.database.session import engine
from app.services import history_archive
from app.services.game_session import GameSession

TOURNAMENTS, HANDS, FOLLOW = 5, 45, 0.82
PLACES, DAYS_AGO = [2, 1, 4, 3, 6], [1.2, 4, 9, 15, 22]
SHARES = [0.33, 0.5, 0.5, 0.66, 0.66, 0.75, 1.0]  # postflop bets, as a share of the pot
AGGRESSIVE = ("RAISE", "OPEN RAISE", "3-BET", "BET")
SHOVES = ("OPEN JAM", "RESHOVE", "ALL-IN")


def sized(state: dict, kind: str, rng: random.Random) -> int:
    legal = {a["kind"]: a for a in state["legalActions"]}[kind]
    if state["street"] == "preflop":
        target = state["bigBlind"] * 2.5 if state["toCall"] <= state["bigBlind"] else state["toCall"] * 3
    else:
        target = state["pot"] * rng.choice(SHARES)
    return int(min(legal["maxAmount"], max(legal["minAmount"], round(target, -1))))


def choose(advice: str, state: dict, rng: random.Random) -> tuple[str, int | None]:
    kinds = {a["kind"] for a in state["legalActions"]}
    if rng.random() > FOLLOW:  # a mistake: the other natural choice
        advice = "CALL" if advice in ("FOLD", "CHECK") or advice in AGGRESSIVE else "FOLD"
    if advice in SHOVES and "all_in" in kinds:
        return "all_in", None
    if advice in AGGRESSIVE:
        for kind in ("bet", "raise"):
            if kind in kinds:
                return kind, sized(state, kind, rng)
    if advice in ("CALL", "CALL JAM") and "call" in kinds:
        return "call", None
    if "check" in kinds:
        return "check", None
    return ("fold", None) if advice == "FOLD" or "call" not in kinds else ("call", None)


def play(owner: str, label: str, rng: random.Random) -> str:
    session = GameSession(starting_stack=45_000, rng=random.Random(rng.randrange(10**6)), owner=owner, table_label=label)
    session.start()
    hands = 0
    while hands < HANDS:
        if session.phase() == "handOver":
            hands += 1
            session.next_hand()
            if session.tournament.players[session.hero_seat].awaiting_reentry:
                session.reentry()
            continue
        state = session.state()
        if not state["waitingForHero"]:
            continue
        kind, amount = choose(str(session.coach_advice()["recommendedAction"]).upper(), state, rng)
        session.hero_action(kind, amount)
    return session.session_id


def main() -> None:
    owner = sys.argv[1] if len(sys.argv) > 1 else "demoplayer"
    if not history_archive.bind_history_archive(engine, True).enabled:
        sys.exit("no history database: start PostgreSQL first (docker compose up -d postgres)")
    with engine.begin() as c:
        c.execute(text("DELETE FROM history_hands WHERE owner = :o"), {"o": owner})
        c.execute(text("DELETE FROM history_tournaments WHERE owner = :o"), {"o": owner})
    rng = random.Random(82)
    for n, (place, days) in enumerate(zip(PLACES, DAYS_AGO, strict=True)):
        table = play(owner, "BCDEF"[n], rng)
        with engine.begin() as c:
            c.execute(text("UPDATE history_tournaments SET status = 'finished', finish_place = :p, "
                           "started_at = now() - make_interval(secs => :d * 86400) WHERE id = :i"),
                      {"p": place, "d": days, "i": table})
        print(f"table {'BCDEF'[n]}: {HANDS} hands, finished {place}")


if __name__ == "__main__":
    main()
