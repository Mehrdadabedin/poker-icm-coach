"""Where the limits of plan 109 apply. Off until RATE_LIMITS_ENABLED is set.

Off is the default because a wrong TRUSTED_PROXY_HOPS would count every visitor
behind a host's proxy as one address, and one person could block everyone.
Warnings, because the app configures no log level and Render shows those.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request

from app.api.client_ip import client_ip, forwarded_entries, short_hash
from app.api.deps import require_pro
from app.core.config import settings
from app.services.rate_limit import RateLimiter, Rule

logger = logging.getLogger(__name__)
limiter = RateLimiter()


def _blocked(wait: int) -> HTTPException:
    return HTTPException(status_code=429, detail="too_many_requests",
                         headers={"Retry-After": str(wait)})


def _note_once(bucket: str, identity: str, rule: Rule, wait: int) -> None:
    """One line per key per window, so a flood cannot also fill the logs."""
    if limiter.hit(f"noted:{bucket}:{identity}", Rule(1, rule.seconds)) == 0:
        logger.warning("rate limit reached: %s key=%s retry_after=%ss mode=%s", bucket,
                       short_hash(identity), wait,
                       settings.rate_limit_coach_mode if bucket.startswith("coach") else "enforce")


def _take(bucket: str, identity: str, setting: str) -> int:
    rule = Rule.parse(setting)
    wait = limiter.hit(f"{bucket}:{identity}", rule)
    if wait:
        _note_once(bucket, identity, rule, wait)
    return wait


def _ip(request: Request) -> str:
    return client_ip(request, settings.trusted_proxy_hops)


def _log_client_ip(request: Request) -> None:
    """Step 6 of the plan: shows which header entry is the visitor, in hashes only."""
    if settings.rate_limit_log_client_ip:
        logger.warning("client ip check: peer=%s forwarded=%s chosen=%s",
                       short_hash(request.client.host if request.client else "unknown"),
                       [short_hash(entry) for entry in forwarded_entries(request)],
                       short_hash(_ip(request)))


@dataclass
class LoginAttempt:
    """Counted before the password check. A success takes its counts back."""
    pair_key: str = ""
    ip_key: str = ""

    def succeeded(self) -> None:
        if self.pair_key:
            limiter.clear(self.pair_key)
            limiter.release(self.ip_key)


def begin_login(request: Request, username: str) -> LoginAttempt:
    _log_client_ip(request)
    if not settings.rate_limits_enabled:
        return LoginAttempt()
    ip = _ip(request)
    pair = f"{' '.join(username.split()).casefold()}|{ip}"
    wait = _take("login_pair", pair, settings.rate_limit_login_pair)
    if wait:
        raise _blocked(wait)
    wait = _take("login_ip", ip, settings.rate_limit_login_ip)
    if wait:
        limiter.release(f"login_pair:{pair}")
        raise _blocked(wait)
    return LoginAttempt(f"login_pair:{pair}", f"login_ip:{ip}")


@dataclass
class SignupAttempt:
    """Holds a place in the new-account limits until the account exists."""
    keys: tuple[str, ...] = ()

    def refused(self) -> None:
        for key in self.keys:
            limiter.release(key)


def begin_signup(request: Request) -> SignupAttempt:
    _log_client_ip(request)
    if not settings.rate_limits_enabled:
        return SignupAttempt()
    ip = _ip(request)
    wait = _take("signup_attempts", ip, settings.rate_limit_signup_attempts)
    if wait:
        raise _blocked(wait)
    wait = _take("signup_hour", ip, settings.rate_limit_signup_hour)
    if wait:
        raise _blocked(wait)
    wait = _take("signup_day", ip, settings.rate_limit_signup_day)
    if wait:
        limiter.release(f"signup_hour:{ip}")
        raise _blocked(wait)
    return SignupAttempt((f"signup_hour:{ip}", f"signup_day:{ip}"))


def limit_google(request: Request) -> None:
    if settings.rate_limits_enabled:
        wait = _take("google", _ip(request), settings.rate_limit_google)
        if wait:
            raise _blocked(wait)


def _limit_coach(bucket: str, user: str, setting: str) -> None:
    wait = _take(bucket, user, setting)
    if wait and settings.rate_limit_coach_mode == "enforce":
        raise _blocked(wait)


def limit_table_coach(user: str = Depends(require_pro)) -> None:
    """Advice and compare share one count: about 2 requests per decision in play."""
    if settings.rate_limits_enabled:
        _limit_coach("coach_table", user, settings.rate_limit_coach_table)


def limit_coach_page(user: str = Depends(require_pro)) -> None:
    if settings.rate_limits_enabled:
        _limit_coach("coach_page_minute", user, settings.rate_limit_coach_page_minute)
        _limit_coach("coach_page_day", user, settings.rate_limit_coach_page_day)
