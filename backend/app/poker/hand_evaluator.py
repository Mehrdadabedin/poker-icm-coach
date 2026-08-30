"""Best-5-of-7 Texas Hold'em hand evaluator."""
from __future__ import annotations

from collections import Counter

from app.poker.card import Card
from app.poker.hand_rank import CATEGORY_NAMES, HandCategory, HandRank


def _straight_high(distinct_ranks: list[int]) -> int | None:
    """Return the high rank of any 5-run, or None. Aces can be low (wheel)."""
    ranks = sorted(set(distinct_ranks), reverse=True)
    if len(ranks) < 5:
        return None
    for top in ranks:
        if all(r in ranks for r in range(top, top - 5, -1)):
            return top
    if {14, 2, 3, 4, 5} <= set(ranks):
        return 5
    return None


def best_hand(cards: list[Card]) -> HandRank:
    """Pick the strongest 5-card hand from 5..7 cards."""
    if not 5 <= len(cards) <= 7:
        raise ValueError(f"expected 5..7 cards, got {len(cards)}")
    if len(set(cards)) != len(cards):
        raise ValueError("duplicate cards in evaluation")

    ranks = [c.rank.value for c in cards]
    counts = Counter(ranks)
    uniq = sorted(counts, reverse=True)

    flush_ranks: list[int] = []
    for suit in {c.suit for c in cards}:
        suited = [c.rank.value for c in cards if c.suit == suit]
        if len(suited) >= 5:
            flush_ranks = sorted(suited, reverse=True)
            break

    straight_high = _straight_high(uniq)

    if flush_ranks:
        sf_high = _straight_high(list(dict.fromkeys(flush_ranks)))
        if sf_high is not None:
            wheel = sf_high == 5 and 14 in flush_ranks and 5 in flush_ranks
            top = 5 if wheel else sf_high
            cards5 = _straight_cards(cards, top)
            return HandRank(HandCategory.STRAIGHT_FLUSH, (sf_high,), cards5)

    if 4 in counts.values():
        quad_rank = max(r for r, c in counts.items() if c == 4)
        kicker = max(r for r in uniq if r != quad_rank)
        return HandRank(HandCategory.FOUR_OF_A_KIND, (quad_rank, kicker), _cards_for(cards, {quad_rank: 4, kicker: 1}))

    trips = [r for r, c in sorted(counts.items(), reverse=True) if c == 3]
    pairs = [r for r, c in sorted(counts.items(), reverse=True) if c == 2]
    if trips and (len(trips) >= 2 or pairs):
        trip_rank = trips[0]
        fill_rank = trips[1] if len(trips) >= 2 else pairs[0]
        return HandRank(HandCategory.FULL_HOUSE, (trip_rank, fill_rank), _cards_for(cards, {trip_rank: 3, fill_rank: 2}))

    if flush_ranks:
        return HandRank(HandCategory.FLUSH, tuple(flush_ranks[:5]), _cards_for(cards, {r: 1 for r in flush_ranks[:5]}))

    if straight_high is not None:
        wheel = straight_high == 5 and 14 in set(ranks)
        top = 5 if wheel else straight_high
        return HandRank(HandCategory.STRAIGHT, (straight_high,), tuple(_straight_cards(cards, top)))

    if trips:
        trip_rank = trips[0]
        kickers = [r for r in uniq if r != trip_rank][:2]
        return HandRank(HandCategory.THREE_OF_A_KIND, (trip_rank, *kickers), _cards_for(cards, {trip_rank: 3, kickers[0]: 1, kickers[1]: 1}))

    if len(pairs) >= 2:
        high_pair, low_pair = pairs[0], pairs[1]
        kicker = next(r for r in uniq if r not in (high_pair, low_pair))
        return HandRank(HandCategory.TWO_PAIR, (high_pair, low_pair, kicker), _cards_for(cards, {high_pair: 2, low_pair: 2, kicker: 1}))

    if pairs:
        pair_rank = pairs[0]
        kickers = [r for r in uniq if r != pair_rank][:3]
        return HandRank(HandCategory.PAIR, (pair_rank, *kickers), _cards_for(cards, {pair_rank: 2, **{k: 1 for k in kickers}}))

    top5 = uniq[:5]
    return HandRank(HandCategory.HIGH_CARD, tuple(top5), _cards_for(cards, {r: 1 for r in top5}))


def _cards_for(cards: list[Card], want: dict[int, int]) -> tuple[Card, ...]:
    """Pick cards matching rank->count requests (prefers high cards)."""
    picked: list[Card] = []
    by_rank: dict[int, list[Card]] = {}
    for c in sorted(cards, key=lambda x: x.rank.value, reverse=True):
        by_rank.setdefault(c.rank.value, []).append(c)
    for rank, count in want.items():
        picked.extend(by_rank[rank][:count])
    return tuple(picked)


def _straight_cards(cards: list[Card], high: int) -> tuple[Card, ...]:
    """Return the five cards forming a straight ending at `high` (wheel aware)."""
    ranks_needed = {high, high - 1, high - 2, high - 3, high - 4}
    if high == 5:
        ranks_needed = {5, 4, 3, 2, 14}
    chosen: list[Card] = []
    for rank in sorted(ranks_needed, reverse=True):
        for c in cards:
            if c.rank.value == rank and c not in chosen:
                chosen.append(c)
                break
    return tuple(chosen)


def compare_hands(a: HandRank, b: HandRank) -> int:
    """Return 1 if a wins, -1 if b wins, 0 if tied."""
    if a > b:
        return 1
    if b > a:
        return -1
    return 0


def hand_name(rank: HandRank) -> str:
    if rank.category == HandCategory.STRAIGHT_FLUSH and rank.tiebreak[0] == 14:
        return "Royal Flush"
    return CATEGORY_NAMES[rank.category]
