"""Coach limits of plan 109: per user, log first, enforce later."""
from __future__ import annotations

import logging

import pytest

from app.core.config import settings
from tests.rate_limit_helpers import ADVICE, from_ip, pro_token


def test_coach_only_logs_by_default(limits_on: None, caplog: pytest.LogCaptureFixture) -> None:
    client = from_ip("5.5.5.1", pro_token("rl_log"))
    with caplog.at_level(logging.WARNING):
        codes = {client.post("/api/coach/advice", json=ADVICE).status_code for _ in range(32)}
    assert codes == {200}
    lines = [r.getMessage() for r in caplog.records if "rate limit reached" in r.getMessage()]
    assert len(lines) == 1, "one line per window, however many requests go over"
    assert "rl_log" not in lines[0], "logs hold a hash, not the username"


def test_coach_page_blocks_in_enforce_mode(
    limits_on: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "rate_limit_coach_mode", "enforce")
    client = from_ip("5.5.5.2", pro_token("rl_page"))
    codes = [client.post("/api/coach/advice", json=ADVICE).status_code for _ in range(31)]
    assert codes == [200] * 30 + [429]


def test_one_players_coach_limit_does_not_touch_another(
    limits_on: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "rate_limit_coach_mode", "enforce")
    same_network = "5.5.5.3"
    first = from_ip(same_network, pro_token("rl_one"))
    for _ in range(31):
        first.post("/api/coach/advice", json=ADVICE)
    assert first.post("/api/coach/advice", json=ADVICE).status_code == 429
    second = from_ip(same_network, pro_token("rl_two"))
    assert second.post("/api/coach/advice", json=ADVICE).status_code == 200


def test_table_advice_and_compare_share_one_count(
    limits_on: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "rate_limit_coach_mode", "enforce")
    monkeypatch.setattr(settings, "rate_limit_coach_table", "3/60")
    client = from_ip("5.5.5.4", pro_token("rl_table"))
    paths = ["/api/game/none/coach", "/api/game/none/coach/compare"] * 2
    assert [client.post(path).status_code for path in paths] == [404, 404, 404, 429]
