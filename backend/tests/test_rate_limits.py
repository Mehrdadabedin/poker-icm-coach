"""The limits of plan 109 on the real routes. Security checks count work, not time."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.services.user_registry import auth_registry
from tests.api_helpers import TEST_PASSWORD, register_user
from tests.rate_limit_helpers import LOGIN, from_ip

SIGNUP = "/api/auth/register"

def login(client: TestClient, user: str, password: str = "wrong-password") -> int:
    return client.post(LOGIN, json={"username": user, "password": password}).status_code


def test_the_sixth_failed_sign_in_is_blocked_with_a_wait(limits_on: None) -> None:
    register_user("rl_a")
    client = from_ip("1.1.1.1")
    assert [login(client, "rl_a") for _ in range(5)] == [401] * 5
    response = client.post(LOGIN, json={"username": "rl_a", "password": "wrong-password"})
    assert response.status_code == 429
    assert response.json()["detail"] == "too_many_requests"
    assert 0 < int(response.headers["Retry-After"]) <= 900


def test_a_blocked_sign_in_runs_no_password_check(
    limits_on: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    register_user("rl_b")
    client = from_ip("1.1.1.2")
    calls = []
    real = auth_registry.verify

    def counting(*args: str) -> bool:
        calls.append(args)
        return real(*args)

    monkeypatch.setattr(auth_registry, "verify", counting)
    for _ in range(8):
        login(client, "rl_b")
    assert len(calls) == 5, "only the 5 allowed attempts may reach the password hash"


def test_a_success_clears_the_count(limits_on: None) -> None:
    register_user("rl_c")
    client = from_ip("1.1.1.3")
    for _ in range(4):
        login(client, "rl_c")
    assert login(client, "rl_c", TEST_PASSWORD) == 200
    assert [login(client, "rl_c") for _ in range(5)] == [401] * 5


def test_another_address_can_still_sign_in_to_the_same_account(limits_on: None) -> None:
    register_user("rl_d")
    attacker = from_ip("1.1.1.4")
    for _ in range(6):
        login(attacker, "rl_d")
    assert login(attacker, "rl_d", TEST_PASSWORD) == 429
    assert login(from_ip("2.2.2.4"), "rl_d", TEST_PASSWORD) == 200


def test_changing_case_or_spaces_does_not_reset_the_count(limits_on: None) -> None:
    register_user("rl_e")
    client = from_ip("1.1.1.5")
    for name in ["rl_e", "RL_E", " rl_e ", "Rl_E", "rl_E"]:
        login(client, name)
    assert login(client, "RL_e") == 429


def test_one_address_trying_many_accounts_is_blocked(limits_on: None) -> None:
    client = from_ip("1.1.1.6")
    codes = [login(client, f"guess{n}") for n in range(31)]
    assert codes[:30] == [401] * 30
    assert codes[30] == 429


def test_a_faked_forwarded_entry_does_not_change_the_key(limits_on: None) -> None:
    register_user("rl_f")
    for n in range(5):
        login(from_ip(f"6.6.6.{n}, 1.1.1.7"), "rl_f")
    assert login(from_ip("6.6.6.200, 1.1.1.7"), "rl_f") == 429


def test_sign_up_stops_at_the_new_account_limit(limits_on: None) -> None:
    client = from_ip("3.3.3.1")
    codes = [
        client.post(SIGNUP, json={"username": f"rlnew{n}", "password": TEST_PASSWORD}).status_code
        for n in range(6)
    ]
    assert codes == [200] * 5 + [429]


def test_a_refused_sign_up_uses_an_attempt_but_not_a_new_account(limits_on: None) -> None:
    client = from_ip("3.3.3.2")
    register_user("rltaken")
    for _ in range(5):
        taken = client.post(SIGNUP, json={"username": "rltaken", "password": TEST_PASSWORD})
        assert taken.status_code == 400
    fresh = client.post(SIGNUP, json={"username": "rlfresh", "password": TEST_PASSWORD})
    assert fresh.status_code == 200, "refused sign-ups must not fill the new-account limit"


def test_sign_up_stops_at_the_attempt_limit(limits_on: None) -> None:
    client = from_ip("3.3.3.3")
    register_user("rltaken2")
    codes = [
        client.post(SIGNUP, json={"username": "rltaken2", "password": TEST_PASSWORD}).status_code
        for _ in range(21)
    ]
    assert codes == [400] * 20 + [429]


def test_google_routes_are_limited_per_address(limits_on: None) -> None:
    client = from_ip("4.4.4.1")
    body = {"code": "x", "verifier": "v" * 43}
    codes = [client.post("/api/auth/google/app-exchange", json=body).status_code for _ in range(31)]
    assert codes[:30] == [400] * 30
    assert codes[30] == 429


def test_off_means_off() -> None:
    assert settings.rate_limits_enabled is False
    register_user("rl_off")
    client = from_ip("7.7.7.7")
    assert {login(client, "rl_off") for _ in range(10)} == {401}


def test_the_browser_can_read_how_long_to_wait(limits_on: None) -> None:
    origin = settings.cors_origin_list[0]
    client = from_ip("8.8.8.8")
    client.headers["Origin"] = origin
    for n in range(30):
        client.post(LOGIN, json={"username": f"cors{n}", "password": "wrong-password"})
    response = client.post(LOGIN, json={"username": "cors", "password": "wrong-password"})
    assert response.status_code == 429
    assert "retry-after" in response.headers["access-control-expose-headers"].lower()
