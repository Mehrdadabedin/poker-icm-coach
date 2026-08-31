"""Hand-review payload: showdown reveals and hand result facts.

Built from the authoritative finished-hand state. Folded players are never
given fake showdown cards; only players who reached showdown get their hole
cards revealed. Bot decision explanations live in bot_review.py.
"""
from __future__ import annotations

from app.game.hand_setup import _blind_seats, active_seats
from app.game.positions import position_for
from app.poker.card import Card
from app.poker.hand_evaluator import best_hand
from app.poker.hand_rank import CATEGORY_NAMES, HandCategory
from app.services.bot_review import _pressure, build_explanations
from app.strategy.hand_codec import RANK_CHAR


_SUIT_CHAR = {0: "c", 1: "d", 2: "h", 3: "s"}


def card_model(card: Card) -> dict:
    return {"rank": RANK_CHAR[card.rank.value], "suit": _SUIT_CHAR[card.suit.value]}


def hand_description(hand) -> str:
    c, t = hand.category, hand.tiebreak
    r = RANK_CHAR.__getitem__
    if c == HandCategory.PAIR:
        return f"Pair of {r(t[0])}s"
    if c == HandCategory.TWO_PAIR:
        return f"Two Pair, {r(t[0])}s & {r(t[1])}s"
    if c == HandCategory.THREE_OF_A_KIND:
        return f"Three of a Kind, {r(t[0])}s"
    if c == HandCategory.FULL_HOUSE:
        return f"Full House, {r(t[0])}s full of {r(t[1])}s"
    if c == HandCategory.FOUR_OF_A_KIND:
        return f"Four of a Kind, {r(t[0])}s"
    if c in (HandCategory.STRAIGHT, HandCategory.FLUSH, HandCategory.STRAIGHT_FLUSH):
        return f"{CATEGORY_NAMES[c]}, {r(t[0])} high"
    if c == HandCategory.HIGH_CARD:
        return f"High Card {r(t[0])}"
    return CATEGORY_NAMES[c]


def build_review(session) -> dict | None:
    eng = session.engine
    if eng is None or not eng.is_complete or eng.result is None:
        return None
    result = eng.result
    tournament = session.tournament
    hero = session.hero_seat
    players = tournament.players
    level = tournament.current_blind_level()
    board = list(result.community_cards)
    hero_start = result.starting_stacks.get(hero, 0)
    hero_end = result.ending_stacks.get(hero, 0)
    winners = result.winner_seats()
    hero_won = hero in winners
    chop = len(winners) > 1 or any(len(w.seats) > 1 for w in result.winners)

    real_showdown = len(result.showed_down) > 1
    showdown = []
    for seat in result.showed_down:
        cards = list(result.hole_cards.get(seat, []))
        revealed = real_showdown
        hand = best_hand(cards + board) if revealed and len(cards) == 2 and len(board) >= 3 else None
        showdown.append({
            "seat": seat, "name": players[seat].name,
            "cards": [card_model(c) for c in cards] if revealed else [],
            "handName": hand_description(hand) if hand else None,
            "isHero": seat == hero, "won": seat in winners,
        })

    hero_cards = list(result.hole_cards.get(hero, []))
    hero_hand = (hand_description(best_hand(hero_cards + board)) if
                 len(hero_cards) == 2 and len(board) >= 3 and hero in result.showed_down else None)
    winner_hand = None
    for s in winners:
        cards = list(result.hole_cards.get(s, []))
        if len(cards) == 2 and len(board) >= 3 and s in result.showed_down:
            h = best_hand(cards + board)
            if winner_hand is None or h > winner_hand:
                winner_hand = h
    winning_name = (hand_description(winner_hand) if winner_hand else
                    ("Uncontested (all others folded)" if len(result.showed_down) <= 1 else None))

    active = sorted(active_seats(players))
    sb, bb = _blind_seats(result.button, set(active), len(players))
    actions = [
        {"seat": sb, "name": players[sb].name, "action": "small_blind", "amount": level.small, "street": "preflop"},
        {"seat": bb, "name": players[bb].name, "action": "big_blind", "amount": level.big, "street": "preflop"},
    ]
    actions += [{"seat": a.seat, "name": players[a.seat].name, "action": a.action,
                 "amount": a.amount, "street": a.street} for a in result.actions]

    committed = {s: 0 for s in active}
    committed[sb], committed[bb] = level.small, level.big
    for a in result.actions:
        cap = result.starting_stacks.get(a.seat, 0)
        if a.action in ("bet", "raise", "all_in") and a.amount is not None:
            committed[a.seat] = max(committed.get(a.seat, 0), min(a.amount, cap))
        elif a.action == "call" and a.amount is not None:
            committed[a.seat] = min(cap, committed.get(a.seat, 0) + a.amount)
    all_in = [s for s in active if result.starting_stacks.get(s, 0) > 0
              and committed.get(s, 0) >= result.starting_stacks.get(s, 0)]

    rb = sorted(result.starting_stacks.values(), reverse=True)
    ra = sorted(result.ending_stacks.values(), reverse=True)
    pressure = _pressure(session, result, level)
    return {
        "handNumber": result.hand_number, "pot": result.pot_total,
        "board": [card_model(c) for c in board],
        "heroSeat": hero, "heroCards": [card_model(c) for c in result.hole_cards.get(hero, [])],
        "heroStart": hero_start, "heroEnd": hero_end,
        "heroNet": hero_end - hero_start, "heroWon": hero_won, "chop": chop,
        "heroPosition": position_for(result.button, hero, 9),
        "heroRankBefore": rb.index(hero_start) + 1, "heroRankAfter": ra.index(hero_end) + 1,
        "winners": winners, "foldedSeats": list(result.folded), "allInSeats": all_in,
        "showdown": showdown, "actions": actions,
        "explanations": build_explanations(session, result, level, pressure),
        "winningHandName": winning_name, "heroHandName": hero_hand,
        "losingHandName": hero_hand, "pressure": pressure.title(),
    }
