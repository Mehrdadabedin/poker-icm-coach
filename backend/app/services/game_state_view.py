"""Build the safe public game-state view (hidden info filtered)."""
from __future__ import annotations

from app.game.actions import legal_actions
from app.game.hand_setup import in_hand_seats
from app.game.positions import position_for
from app.services.hand_review import build_review

_RANK_CHAR = {2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9",
              10: "T", 11: "J", 12: "Q", 13: "K", 14: "A"}
_SUIT_CHAR = {0: "c", 1: "d", 2: "h", 3: "s"}


def card_model(card) -> dict:
    return {"rank": _RANK_CHAR[card.rank.value], "suit": _SUIT_CHAR[card.suit.value]}


def build_state_view(session) -> dict:
    """Public JSON-able state; never leaks opponents' hole cards or future streets."""
    eng = session.engine
    tournament = session.tournament
    street_contrib = eng._street.contributions
    level = tournament.current_blind_level()
    button = tournament.button
    players = []
    for p in tournament.players:
        players.append({
            "seat": p.seat,
            "name": p.name,
            "stack": p.stack,
            "stackInBB": round(p.stack / max(1, level.big), 1),
            "position": position_for(button, p.seat, len(tournament.players)),
            "bet": street_contrib.get(p.seat, 0),
            "folded": p.folded,
            "isHero": p.is_human,
            "isDealer": p.seat == button,
            "sitsOut": p.sit_out or p.is_eliminated,
            "holeCards": [card_model(c) for c in p.hole_cards] if p.is_human and p.hole_cards else None,
        })
    actor = eng.current_actor
    hero = tournament.players[session.hero_seat]
    hero_contrib = street_contrib.get(session.hero_seat, 0)
    hero_legal = []
    if actor == session.hero_seat:
        hero_legal = legal_actions(
            eng._street.current_bet, hero_contrib, hero.stack, level.big, eng._street.last_raise,
        )
    in_hand_count = len(in_hand_seats(tournament.players))
    total_chips = sum(p.stack for p in tournament.players)
    active_count = sum(1 for p in tournament.players if not p.is_eliminated)
    return {
        "tableId": session.session_id,
        "handNumber": tournament.hand_number,
        "players": players,
        "totalChips": total_chips,
        "averageStack": total_chips // active_count if active_count else 0,
        "actionLog": [
            {"seat": a.seat, "action": a.action, "amount": a.amount, "street": a.street}
            for a in eng._log
        ],
        "review": build_review(session),
        "playersRemaining": sum(1 for p in tournament.players if not p.is_eliminated),
        "inHand": in_hand_count,
        "communityCards": [card_model(c) for c in eng._board],
        "pot": _pot_total(tournament),
        "smallBlind": level.small,
        "bigBlind": level.big,
        "ante": tournament.structure.ante_for(tournament.ante_mode, level),
        "level": session.timer.level,
        "secondsLeft": session.timer.seconds_left,
        "inBreak": session.timer.in_break,
        "street": eng.street,
        "currentActor": actor,
        "dealerSeat": button,
        "heroSeat": session.hero_seat,
        "waitingForHero": actor == session.hero_seat and not eng.is_complete,
        "phase": session.phase(),
        "legalActions": [
            {"kind": a.type.value, "amount": a.amount, "minAmount": a.min_amount,
             "maxAmount": a.max_amount} for a in hero_legal
        ],
        "toCall": max(0, eng._street.current_bet - hero_contrib),
    }


def _pot_total(tournament) -> int:
    return sum(p.bet_total for p in tournament.players)
