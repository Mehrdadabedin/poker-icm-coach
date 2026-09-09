"""Authentication (A03/A05/A18).

Models:
- A registered UserRegistry maps username -> salted PBKDF2-SHA256 password hash.
  Users must register before they can sign in (A18 registration-first flow);
  registration and login are the only entry points.
- AuthStore issues a random bearer token on successful login; the browser
  presents it on every authenticated API call and the backend resolves the
  username from it server-side. A client-supplied username is NEVER trusted as
  authorization; invalid credentials yield 401.
- Tokens are revocable (logout) and expire after a TTL.
- Passwords are never stored in plaintext and never logged.

The user registry persists best-effort to a JSON file (auth_users_file); if the
directory is unwritable it silently falls back to in-memory so authentication
still works.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import threading
import time
from pathlib import Path

logger = logging.getLogger(__name__)

TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60  # 7 days
USERNAME_RE = re.compile(r"^[A-Za-z0-9_\- ]{2,24}$")
MIN_PASSWORD_LENGTH = 8
_PBKDF2_ROUNDS = 200_000

def normalize_username(raw: str) -> str:
    """Trim, collapse spaces and validate a username."""
    name = " ".join((raw or "").strip().split())
    if not USERNAME_RE.match(name):
        raise ValueError(
            "username must be 2-24 characters (letters, digits, space, _ or -)"
        )
    return name

class AuthStore:
    """Token -> username session registry (single-worker deployment).

    Sessions are persisted best-effort to a JSON file (bind_path) so a process
    restart does not invalidate valid sessions; expired sessions are dropped on
    load and lazily on lookup. Blank path disables persistence (tests).
    """

    def __init__(self, ttl: float = TOKEN_TTL_SECONDS) -> None:
        self._ttl = ttl
        self._tokens: dict[str, tuple[str, float]] = {}  # token -> (username, expires_at)
        self._lock = threading.Lock()
        self._path: Path | None = None

    def bind_path(self, sessions_file: str) -> None:
        """(Re)bind the persistence path (blank disables file persistence)."""
        self._path = Path(sessions_file) if sessions_file else None
        if self._path is not None:
            self._load()

    def _load(self) -> None:
        try:
            if self._path is not None and self._path.is_file():
                rows = json.loads(self._path.read_text(encoding="utf-8"))
                now = time.monotonic()
                with self._lock:
                    self._tokens = {
                        tok: (name, exp)
                        for tok, (name, exp) in rows.items()
                        if exp > now
                    }
        except (OSError, ValueError, TypeError, AttributeError):
            logger.warning("could not load sessions file; starting empty")

    def _save(self) -> None:
        if self._path is None:
            return
        try:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            with self._lock:
                rows = dict(self._tokens)
            self._path.write_text(
                json.dumps(rows, indent=2, sort_keys=True), encoding="utf-8"
            )
        except OSError:
            logger.warning("could not persist sessions file")

    def login(self, username: str) -> str:
        name = normalize_username(username)
        token = secrets.token_urlsafe(32)
        with self._lock:
            self._tokens[token] = (name, time.monotonic() + self._ttl)
        self._save()
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
                self._save()
                return None
        return username

    def logout(self, token: str | None) -> None:
        if not token:
            return
        with self._lock:
            self._tokens.pop(token, None)
        self._save()

auth_store = AuthStore()

class UserRegistry:
    """Registered users: username -> salted PBKDF2-SHA256 password hash.

    - register(username, password) validates and stores a hashed credential.
    - verify(username, password) returns True only for a registered user with a
      matching password (constant-time compare).
    - Best-effort JSON persistence to `users_file` (blank disables it).
    """

    def __init__(self, users_file: str = "") -> None:
        self._users: dict[str, dict[str, str]] = {}  # username -> {salt, hash}
        self._lock = threading.Lock()
        self._path = Path(users_file) if users_file else None
        if self._path is not None:
            self._load()

    def _load(self) -> None:
        try:
            if self._path is not None and self._path.is_file():
                self._users = json.loads(self._path.read_text(encoding="utf-8"))
        except (OSError, ValueError):  # pragma: no cover - env dependent
            logger.warning("could not load users file; starting empty")

    def _save(self) -> None:
        if self._path is None:
            return
        try:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            self._path.write_text(
                json.dumps(self._users, indent=2, sort_keys=True), encoding="utf-8"
            )
        except OSError:  # pragma: no cover - env dependent
            logger.warning("could not persist users file")

    def bind_path(self, users_file: str) -> None:
        """(Re)bind the persistence path (blank disables file persistence)."""
        self._path = Path(users_file) if users_file else None
        if self._path is not None:
            self._load()

    def register(self, username: str, password: str) -> str:
        name = normalize_username(username)
        if len(password) < MIN_PASSWORD_LENGTH:
            raise ValueError(f"password must be at least {MIN_PASSWORD_LENGTH} characters")
        with self._lock:
            if name in self._users:
                raise ValueError("that username is already registered")
            salt = os.urandom(16)
            key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ROUNDS)
            self._users[name] = {
                "salt": base64.b64encode(salt).decode("ascii"),
                "hash": base64.b64encode(key).decode("ascii"),
            }
            self._save()
        return name

    def verify(self, username: str, password: str) -> bool:
        try:
            name = normalize_username(username)
        except ValueError:
            return False
        with self._lock:
            entry = self._users.get(name)
            if entry is None:
                return False
            salt = base64.b64decode(entry["salt"])
            expected = base64.b64decode(entry["hash"])
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ROUNDS)
        return hmac.compare_digest(actual, expected)

auth_store = AuthStore()
auth_registry = UserRegistry()
