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

Session state persists as one document (a JSON file, or a database row when
AUTH_STORAGE=database); see `app.services.documents`.
"""
from __future__ import annotations

import logging
import re
import secrets
import threading
import time

from app.services.documents import Document, FileDocument

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

    Sessions are persisted (bind_document / bind_path) so a process restart
    does not invalidate valid sessions; expired sessions are dropped on load
    and lazily on lookup. No document disables persistence (tests).

    Expiry deadlines are wall-clock (`time.time`) because they are persisted:
    `time.monotonic` is only comparable within one process, so persisted
    monotonic deadlines would make tokens outlive their TTL (or die instantly)
    after a restart.

    `_save` takes the lock itself, so every caller must release it first. The
    lock is reentrant so that forgetting to is a redundant acquire rather than
    a worker thread wedged forever, which is what a non-reentrant lock did here
    on the first lookup of an expired token. The write happens outside the
    lock, so a slow database never blocks token lookups.
    """

    def __init__(self, ttl: float = TOKEN_TTL_SECONDS) -> None:
        self._ttl = ttl
        self._tokens: dict[str, tuple[str, float]] = {}  # token -> (username, expires_at)
        self._lock = threading.RLock()
        self._document: Document | None = None
        self._write_lock = threading.Lock()
        self._snapshots = 0  # snapshots taken, under _lock
        self._written = 0  # newest snapshot saved, under _write_lock

    def bind_document(self, document: Document | None) -> None:
        """(Re)bind persistence and load it. None stops persisting and keeps the
        current sessions, so tokens issued before a test fixture rebinds survive."""
        if document is None:
            with self._lock:
                self._document = None
            return
        rows = document.load()
        now = time.time()
        try:
            tokens = {tok: (name, exp) for tok, (name, exp) in (rows or {}).items() if exp > now}
        except (ValueError, TypeError, AttributeError):
            logger.warning("could not read stored sessions; starting empty")
            tokens = {}
        with self._lock:
            self._document = document
            self._tokens = tokens

    def bind_path(self, sessions_file: str) -> None:
        """(Re)bind a JSON file (blank disables persistence)."""
        self.bind_document(FileDocument(sessions_file) if sessions_file else None)

    def _save(self) -> None:
        with self._lock:
            document = self._document
            self._snapshots += 1
            snapshot, rows = self._snapshots, dict(self._tokens)
        if document is None:
            return
        with self._write_lock:
            # A thread that snapshotted earlier but reached the write later
            # must not overwrite a newer snapshot: that would drop a login.
            if snapshot < self._written:
                return
            document.save(rows)
            self._written = snapshot

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

    def revoke_user(self, username: str) -> int:
        """Sign a user out everywhere (admin suspend/delete). Returns the count."""
        with self._lock:
            mine = [tok for tok, (name, _exp) in self._tokens.items() if name == username]
            for token in mine:
                del self._tokens[token]
        if mine:
            self._save()
        return len(mine)


auth_store = AuthStore()
