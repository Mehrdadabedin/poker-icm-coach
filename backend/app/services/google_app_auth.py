"""Google sign-in for the Android app (plan 088).

Google refuses its sign-in page inside an app's web view, so the app opens it
in a Chrome tab instead. That tab cannot hand a session to the web view, so the
callback sends a one-time code to the app's own link scheme, and the web view
trades it here for a token. Any app may register the same scheme and catch the
link, so the code alone is useless: the trade also needs the verifier the web
view kept, whose SHA-256 it sent when the flow began (PKCE, RFC 7636).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import threading
import time
import urllib.parse

from app.services.google_oauth import STATE_TTL_SECONDS

APP_REDIRECT = "com.pokericmcoach.app://auth"  # the Capacitor appId as a link scheme
CODE_TTL_SECONDS = 120.0
CHALLENGE_LENGTH = 43  # SHA-256 in base64url without padding
_B64URL = frozenset("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_")


def valid_challenge(value: str) -> bool:
    return len(value) == CHALLENGE_LENGTH and set(value) <= _B64URL


def challenge_for(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("ascii", errors="replace")).digest()
    return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")


class _SingleUse[V]:
    """Values that expire and can be read once."""

    def __init__(self, ttl: float) -> None:
        self._ttl = ttl
        self._lock = threading.Lock()
        self._items: dict[str, tuple[V, float]] = {}

    def put(self, key: str, value: V) -> None:
        now = time.time()
        with self._lock:
            self._items = {k: v for k, v in self._items.items() if v[1] > now}
            self._items[key] = (value, now + self._ttl)

    def pop(self, key: str) -> V | None:
        with self._lock:
            entry = self._items.pop(key, None)
        if entry is None or entry[1] < time.time():
            return None
        return entry[0]


_challenges: _SingleUse[str] = _SingleUse(STATE_TTL_SECONDS)  # OAuth state -> challenge
_codes: _SingleUse[tuple[str, str]] = _SingleUse(CODE_TTL_SECONDS)  # code -> user, challenge


def remember(state: str, challenge: str) -> None:
    """The flow behind this OAuth state was started by the app."""
    _challenges.put(state, challenge)


def challenge_of(state: str) -> str | None:
    """The app's challenge for this state, or None for a website sign-in."""
    return _challenges.pop(state)


def issue(username: str, challenge: str) -> str:
    code = secrets.token_urlsafe(32)
    _codes.put(code, (username, challenge))
    return code


def redeem(code: str, verifier: str) -> str | None:
    """The user the code was issued to, if the verifier matches. One try only."""
    entry = _codes.pop(code)
    if entry is None:
        return None
    username, challenge = entry
    return username if hmac.compare_digest(challenge_for(verifier), challenge) else None


def app_redirect(params: dict[str, str]) -> str:
    return f"{APP_REDIRECT}?{urllib.parse.urlencode(params)}"
