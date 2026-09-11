"""Authentication (A03/A05/A18) — token/session side.

Models:
- A registered UserRegistry (see `app.services.user_registry`) maps username ->
  salted PBKDF2-SHA256 password hash. Users must register before they can sign
  in (A18 registration-first flow); registration and login are the only entry
  points.
- AuthStore issues a random bearer token on successful login; the browser
  presents it on every authenticated API call and the backend resolves the
  username from it server-side. A client-supplied username is NEVER trusted as
  authorization; invalid credentials yield 401.
- Tokens are revocable (logout) and expire after a TTL.
- Passwords are never stored in plaintext and never logged.

Session state persists best-effort to a JSON file; if the directory is
unwritable it silently falls back to in-memory so authentication still works.
"""
from __future__ import annotations

import json
import logging
import re
import secrets
import threading
import time
from pathlib import Path

logger = logging.getLogger(__name__)

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
    """Token -> username session registry (single-worker deployment).

    Sessions are persisted best-effort to a JSON file (bind_path) so a process
    restart does not invalidate valid sessions; expired sessions are dropped on
    load and lazily on lookup. Blank path disables persistence (tests).

    Expiry deadlines are wall-clock (`time.time`) because they are written to
    disk: `time.monotonic` is only comparable within one process, so persisted
    monotonic deadlines would make tokens outlive their TTL (or die instantly)
    after a restart.

    `_save` and `_load` take the lock themselves, so every caller must release
    it first. The lock is reentrant so that forgetting to is a redundant
    acquire rather than a worker thread wedged forever, which is what a
    non-reentrant lock did here on the first lookup of an expired token.
    """

    def __init__(self, ttl: float = TOKEN_TTL_SECONDS) -> None:
        self._ttl = ttl
        self._tokens: dict[str, tuple[str, float]] = {}  # token -> (username, expires_at)
        self._lock = threading.RLock()
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
                now = time.time()
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
            self._tokens[token] = (name, time.time() + self._ttl)
        self._save()
        return token

    def user_for_token(self, token: str | None) -> str | None:
        if not token:
            return None
        expired = False
        with self._lock:
            entry = self._tokens.get(token)
            if entry is None:
                return None
            username, expires = entry
            if time.time() > expires:
                del self._tokens[token]
                expired = True
        if expired:
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
