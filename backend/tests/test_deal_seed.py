from __future__ import annotations

import pytest

from app.core.config import settings
from app.services.game_session import GameSession


def hero_cards(session: GameSession) -> list[str]:
    return [str(c) for c in session.tournament.players[session.hero_seat].hole_cards]


def deal(seed: int | None, monkeypatch: pytest.MonkeyPatch) -> list[str]:
    monkeypatch.setattr(settings, "deal_seed", seed)
    session = GameSession()
    session.start()
    return hero_cards(session)


def test_same_seed_deals_the_same_cards(monkeypatch: pytest.MonkeyPatch) -> None:
    assert deal(7, monkeypatch) == deal(7, monkeypatch)


def test_unset_seed_deals_random_cards(monkeypatch: pytest.MonkeyPatch) -> None:
    deals = {tuple(deal(None, monkeypatch)) for _ in range(12)}
    assert len(deals) > 1
