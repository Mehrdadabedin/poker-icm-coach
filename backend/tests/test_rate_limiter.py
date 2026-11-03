"""The counters and the client address behind plan 109, without any route."""
from __future__ import annotations

from types import SimpleNamespace

import pytest
from pydantic import ValidationError
from starlette.datastructures import Headers

from app.api.client_ip import client_ip
from app.core.config import Settings, settings
from app.services.rate_limit import RateLimiter, Rule

RULE = Rule(2, 60)


class Clock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def request(peer: str | None, *forwarded: str) -> SimpleNamespace:
    raw = [("x-forwarded-for", value) for value in forwarded]
    return SimpleNamespace(client=SimpleNamespace(host=peer) if peer else None,
                           headers=Headers(raw=[(k.encode(), v.encode()) for k, v in raw]))


def test_blocks_past_the_limit_and_says_how_long() -> None:
    clock = Clock()
    limiter = RateLimiter(clock)
    assert limiter.hit("k", RULE) == 0
    clock.now += 10
    assert limiter.hit("k", RULE) == 0
    assert limiter.hit("k", RULE) == 50


def test_the_window_slides() -> None:
    clock = Clock()
    limiter = RateLimiter(clock)
    limiter.hit("k", RULE)
    clock.now += 30
    limiter.hit("k", RULE)
    clock.now += 31
    assert limiter.hit("k", RULE) == 0, "the first count left the window"
    assert limiter.hit("k", RULE) > 0, "the second is still inside it"


def test_a_blocked_request_does_not_extend_the_wait() -> None:
    clock = Clock()
    limiter = RateLimiter(clock)
    limiter.hit("k", RULE)
    limiter.hit("k", RULE)
    for _ in range(5):
        limiter.hit("k", RULE)
    clock.now += 60
    assert limiter.hit("k", RULE) == 0


def test_release_and_clear_give_counts_back() -> None:
    limiter = RateLimiter(Clock())
    limiter.hit("k", RULE)
    limiter.hit("k", RULE)
    limiter.release("k")
    assert limiter.hit("k", RULE) == 0
    limiter.clear("k")
    assert limiter.hit("k", RULE) == 0


def test_keys_do_not_share_counts() -> None:
    limiter = RateLimiter(Clock())
    limiter.hit("a", Rule(1, 60))
    assert limiter.hit("b", Rule(1, 60)) == 0


def test_memory_is_bounded() -> None:
    limiter = RateLimiter(Clock(), max_keys=10)
    for n in range(50):
        limiter.hit(f"k{n}", RULE)
    assert limiter.key_count() == 10


def test_expired_keys_are_swept() -> None:
    clock = Clock()
    limiter = RateLimiter(clock)
    for n in range(1000):
        limiter.hit(f"old{n}", RULE)
    clock.now += 61
    for n in range(100):
        limiter.hit(f"new{n}", RULE)
    assert limiter.key_count() == 100


def test_rule_text() -> None:
    assert Rule.parse("5/900") == Rule(5, 900)


@pytest.mark.parametrize("bad", ["5", "0/60", "5/0", "x/60", "-1/60"])
def test_a_bad_limit_stops_the_app_starting(bad: str) -> None:
    with pytest.raises(ValidationError):
        Settings(rate_limit_login_pair=bad)


def test_limits_are_off_until_the_host_is_set_up() -> None:
    fields = Settings.model_fields
    assert fields["rate_limits_enabled"].default is False
    assert fields["trusted_proxy_hops"].default == 0
    assert fields["rate_limit_coach_mode"].default == "log"
    assert settings.rate_limits_enabled is False


def test_zero_hops_ignores_the_header() -> None:
    assert client_ip(request("10.0.0.1", "9.9.9.9"), 0) == "10.0.0.1"


def test_hops_count_from_the_right_so_a_faked_entry_is_ignored() -> None:
    faked = request("10.0.0.1", "6.6.6.6, 1.1.1.1, 2.2.2.2")
    assert client_ip(faked, 1) == "2.2.2.2"
    assert client_ip(faked, 2) == "1.1.1.1"


def test_several_headers_read_as_one_list() -> None:
    assert client_ip(request("10.0.0.1", "1.1.1.1", "2.2.2.2"), 1) == "2.2.2.2"


def test_too_few_entries_falls_back_to_the_connection() -> None:
    assert client_ip(request("10.0.0.1", "1.1.1.1"), 2) == "10.0.0.1"
    assert client_ip(request("10.0.0.1"), 1) == "10.0.0.1"


def test_a_garbage_entry_falls_back_to_the_connection() -> None:
    assert client_ip(request("10.0.0.1", "not-an-address"), 1) == "10.0.0.1"


def test_ipv6_counts_as_its_network() -> None:
    first = client_ip(request("10.0.0.1", "2001:db8:1:2::a"), 1)
    second = client_ip(request("10.0.0.1", "2001:db8:1:2::b"), 1)
    other = client_ip(request("10.0.0.1", "2001:db8:1:3::a"), 1)
    assert first == second == "2001:db8:1:2::/64"
    assert other != first


def test_an_ipv4_mapped_address_is_the_same_visitor() -> None:
    assert client_ip(request("::ffff:1.2.3.4"), 0) == "1.2.3.4"


def test_no_connection_address_still_gives_a_key() -> None:
    assert client_ip(request(None), 0) == "unknown"
