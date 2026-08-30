"""Dealing: hole cards, burn-and-turn street dealing."""
from __future__ import annotations

from app.game.player import Player
from app.poker.card import Card
from app.poker.deck import Deck


def deal_hole_cards(players: list[Player], deck: Deck) -> None:
    """Deal exactly two private cards to every active player."""
    dealt: set[Card] = set()
    for _ in range(2):
        for player in players:
            if player.sit_out or player.is_eliminated:
                continue
            card = deck.draw()
            dealt.add(card)
            player.hole_cards.append(card)
    if len(dealt) != sum(1 for p in players if not p.sit_out and not p.is_eliminated) * 2:
        raise RuntimeError("hole card collision detected")


def _burn_and_draw(deck: Deck, count: int) -> list[Card]:
    """Burn one card then draw `count` community cards."""
    deck.draw()  # burn card (never revealed, never reused)
    return deck.draw_n(count)


def deal_flop(deck: Deck) -> list[Card]:
    return _burn_and_draw(deck, 3)


def deal_turn(deck: Deck) -> list[Card]:
    return _burn_and_draw(deck, 1)


def deal_river(deck: Deck) -> list[Card]:
    return _burn_and_draw(deck, 1)
