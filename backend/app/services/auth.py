"""Username authentication (A03/A05).

Simplest secure approach appropriate to this application:

- The backend issues a random bearer token on login.
- The browser presents the token on every authenticated API call; the
  backend resolves the username from the token server-side.
- A client-supplied username is NEVER trusted as authorization: sending
  another user's name without their token yields 401.
- Tokens are revocable (logout) and expire after a TTL.
- No password is required by the product spec (username-only sign-in); the
  token is the proof of identity.
"""
from __future__ import annotations

import re
import secrets
import threading
import time

TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60  # 7 days
USERNAME_RE = re.compile(r"^[A-Za-z0-9_\- ]{2,24}$")


def normalize_username(raw: str) -> str:
    """Trim, collapse spaces and validate a username."""
    name = " ".join((raw or "").strip().split())
    if not USERNAME_RE.match(name):
        raise ValueError(
            "username must be 2-24 characters (letters, digits, space, _ or -)"
        )
    return name


class AuthStore:
    """In-memory token -> username registry (single-worker deployment)."""

    def __init__(self, ttl: float = TOKEN_TTL_SECONDS) -> None:
        self._ttl = ttl
        self._tokens: dict[str, tuple[str, float]] = {}  # token -> (username, expires_at)
        self._lock = threading.Lock()

    def login(self, username: str) -> str:
        name = normalize_username(username)
        token = secrets.token_urlsafe(32)
        with self._lock:
            self._tokens[token] = (name, time.monotonic() + self._ttl)
        return token

    def user_for_token(self, token: str | None) -> str | None:
        if not token:
            return None
        with self._lock:
            entry = self._tokens.get(token)
            if entry is None:
                return None
            username, expires = entry
            if time.monotonic() > expires:
                del self._tokens[token]
                return None
        return username

    def logout(self, token: str | None) -> None:
        if not token:
            return
        with self._lock:
            self._tokens.pop(token, None)


auth_store = AuthStore()
