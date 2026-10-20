"""Bot decision explanations reconstructed from the real hand log.

For every bot action the payload carries the true position, hole cards,
stack depth, pot odds, equity estimate and tournament-stage pressure at the
moment of the action, plus a readable decision summary built from those
numbers. Explanations are state-derived, never generic filler.
"""
from __future__ import annotations

from app.ai.ai_framework import pot_odds
from app.ai.postflop_ai import equity_estimate
from app.game.hand_setup import blind_seats
from app.game.positions import position_labels
from app.poker.card import Card
from app.services.bot_texts import DECISION, FACED, coded
from app.strategy.bubble import bubble_pressure, detect_stage
from app.strategy.coach_analysis import _preflop_equity
from app.strategy.hand_codec import RANK_CHAR
from app.strategy.range_matrix import cell_name

_SYM = {0: 0x2663, 1: 0x2666, 2: 0x2665, 3: 0x2660}
_BOARD_LEN = {"preflop": 0, "flop": 3, "turn": 4, "river": 5}


def _hand_text(cards: list[Card]) -> str:
    return " ".join(f"{RANK_CHAR[c.rank.value]}{chr(_SYM[c.suit.value])}" for c in cards)


def _code(cards: list[Card]) -> str:
    hi = max(c.rank.value for c in cards)
    lo = min(c.rank.value for c in cards)
    suited = None if hi == lo else cards[0].suit == cards[1].suit
    return cell_name(hi, lo, suited)


def _equity(cards: list[Card], street: str, board: list[Card]) -> float:
    if street == "preflop":
        return _preflop_equity(_code(cards))
    try:
        return equity_estimate(cards, board, [])
    except ValueError:
        return 0.0


def hand_pressure(session, result, level) -> str:
    tournament = session.tournament
    stacks = list(result.starting_stacks.values()) or [1]
    info = detect_stage(
        players_remaining=sum(1 for p in tournament.players if not p.is_eliminated),
        paid_positions=tournament.payout.paid_positions,
        hero_stack_bb=result.starting_stacks[session.hero_seat] / max(1, level.big),
        average_stack_bb=(sum(stacks) / len(stacks)) / max(1, level.big),
        shortest_stack_bb=min(stacks) / max(1, level.big),
        level_index=tournament.level_index,
    )
    return bubble_pressure(info).label


def _faced(street: str, bet: int, to_call: int, level) -> dict[str, object]:
    if to_call == 0:
        return coded(FACED, "unopened" if street == "preflop" else "no_bet")
    if street == "preflop":
        return coded(FACED, "raise_to" if bet > level.big else "big_blind", amount=bet)
    return coded(FACED, "bet", amount=bet)


def _decision(action: str, hand: str, stack_bb: float, equity: float,
              pot_odds: float, pressure: str, position: str) -> dict[str, object]:
    p, eq, odds = pressure.title(), f"{equity:.0%}", f"{pot_odds:.0%}"
    if action == "fold":
        return coded(DECISION, "fold", hand=hand, eq=eq, odds=odds, pos=position, pressure=p)
    if action == "call":
        code = "call_profitable" if equity >= pot_odds else "call_marginal"
        return coded(DECISION, code, hand=hand, eq=eq, odds=odds, pos=position, pressure=p)
    if action in ("bet", "raise"):
        return coded(DECISION, "bet", hand=hand, pos=position, eq=eq, bb=stack_bb, odds=odds)
    return coded(DECISION, "all_in", hand=hand, bb=stack_bb, eq=eq, pressure=p)


def build_explanations(session, result, level, pressure: str) -> list[dict]:
    players = session.tournament.players
    hero = session.hero_seat
    # Same hand-scoped seat set as build_review: a finished tournament may
    # already have one survivor while the completed hand still shows the two
    # seats that posted the blinds. (A41)
    hand = sorted(s for s, start in result.starting_stacks.items() if start > 0)
    if len(hand) < 2:
        return []
    sb, bb = blind_seats(result.button, set(hand), len(players))
    start = result.starting_stacks
    contrib = {s: 0 for s in hand}
    contrib[sb], contrib[bb] = level.small, level.big
    cum = dict(contrib)
    bet, street, board = level.big, "preflop", []
    out = []
    for a in result.actions:
        if a.street != street:
            street, bet, contrib = a.street, 0, {s: 0 for s in hand}
            board = list(result.community_cards[:_BOARD_LEN[street]])
        if a.seat == hero:
            continue
        sc = contrib.get(a.seat, 0)
        to_call = max(0, bet - sc)
        odds = pot_odds(to_call, sum(cum.values()))
        hole = list(result.hole_cards.get(a.seat, []))
        equity = _equity(hole, street, board) if len(hole) == 2 else 0.0
        stack_bb = round(max(0, start.get(a.seat, 0) - cum.get(a.seat, 0)) / max(1, level.big), 1)
        pos = position_labels(result.button, set(hand), len(players)).get(a.seat, "")
        faced = _faced(street, bet, to_call, level)
        why = _decision(a.action, _hand_text(hole) if len(hole) == 2 else "?",
                        stack_bb, equity, odds, pressure, pos)
        out.append({
            "seat": a.seat, "name": players[a.seat].name, "action": a.action,
            "amount": a.amount, "street": street, "position": pos,
            "hand": _hand_text(hole) if len(hole) == 2 else "",
            "handCode": _code(hole) if len(hole) == 2 else "",
            "stackBB": stack_bb, "potOdds": f"{odds:.0%}", "equity": f"{equity:.0%}",
            "icmPressure": pressure.title(),
            # the English text, and its code and details for other languages (plan 093)
            "faced": faced["text"], "facedCode": faced["code"], "facedParams": faced["params"],
            "reason": why["text"], "reasonCode": why["code"], "reasonParams": why["params"],
        })
        if a.action in ("bet", "raise", "all_in") and a.amount is not None:
            add = max(0, a.amount - sc)
            contrib[a.seat] += add
            cum[a.seat] = cum.get(a.seat, 0) + add
            bet = a.amount
        elif a.action == "call" and a.amount is not None:
            contrib[a.seat] += a.amount
            cum[a.seat] = cum.get(a.seat, 0) + a.amount
    return out
