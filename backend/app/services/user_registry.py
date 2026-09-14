"""Registered-user credential store (A18 registration-first auth).

Split out of `app.services.auth` so both modules stay inside the project's
200-line file limit; `auth.py` keeps the token/session side.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import re
import threading
from pathlib import Path

from app.services.auth import normalize_username

logger = logging.getLogger(__name__)

MIN_PASSWORD_LENGTH = 8
USERNAME_MAX_LENGTH = 24
EXTERNAL_PROVIDERS = ("google",)
_PBKDF2_ROUNDS = 200_000

# An email local part is not a username: keep only the characters
# normalize_username accepts, then trim to the allowed length.
_USERNAME_UNSAFE_RE = re.compile(r"[^A-Za-z0-9_\- ]+")
# Fixed decoy salt: an unknown username still pays for one PBKDF2 derivation,
# so response time does not tell an attacker which usernames are registered.
_DECOY_SALT = b"\x00" * 16


def _derive(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ROUNDS)


def username_from_email(email: str) -> str:
    """Derive the username candidate from an email local part (may collide)."""
    local = (email or "").split("@", 1)[0]
    cleaned = " ".join(_USERNAME_UNSAFE_RE.sub("", local).split())
    if len(cleaned) < 2:
        return "player"
    return cleaned[:USERNAME_MAX_LENGTH]


class UserRegistry:
    """Registered users: username -> salted PBKDF2-SHA256 password hash.

    - register(username, password) validates and stores a hashed credential.
    - verify(username, password) returns True only for a registered user with a
      matching password (constant-time compare, constant-time miss). An entry
      with no credential (an external identity) always returns False.
    - register_external links a Google account to a local username; the entry
      keeps no salt/hash, so it is unreachable by password login.
    - Best-effort JSON persistence to `users_file` (blank disables it).
    """

    def __init__(self, users_file: str = "") -> None:
        # username -> {"salt","hash"} for a password account, or
        # {"provider","subject","email"} for an external identity.
        self._users: dict[str, dict[str, str]] = {}
        self._lock = threading.RLock()
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
        self._users = {}
        if self._path is not None:
            self._load()

    def register(self, username: str, password: str) -> str:
        name = normalize_username(username)
        if len(password) < MIN_PASSWORD_LENGTH:
            raise ValueError(f"password must be at least {MIN_PASSWORD_LENGTH} characters")
        salt = os.urandom(16)
        key = _derive(password, salt)
        with self._lock:
            if name in self._users:
                raise ValueError("that username is already registered")
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
            name = ""
        with self._lock:
            entry = self._users.get(name)
        salt_b64 = entry.get("salt") if entry else None
        hash_b64 = entry.get("hash") if entry else None
        if not entry or not salt_b64 or not hash_b64:
            # Unknown user and password-less entry (external identity) both pay
            # for one derivation, so timing says nothing about which applied.
            _derive(password, _DECOY_SALT)
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(hash_b64)
        return hmac.compare_digest(_derive(password, salt), expected)

    def username_for_external(self, provider: str, subject: str) -> str | None:
        """Return the local username linked to an external identity, if any."""
        if not subject:
            return None
        with self._lock:
            return self._linked_username(provider, subject)

    def register_external(self, username: str, provider: str, subject: str, email: str) -> str:
        """Link an external identity to a local account, creating it if needed.

        Idempotent for a repeat sign-in with the same subject. A colliding
        username gets a numeric suffix, so an existing password account is never
        overwritten or taken over.
        """
        if provider not in EXTERNAL_PROVIDERS:
            raise ValueError("unsupported provider")
        if not subject:
            raise ValueError("external subject is required")
        try:
            base = normalize_username(username)
        except ValueError:
            base = "player"
        with self._lock:
            existing = self._linked_username(provider, subject)
            if existing is not None:
                return existing
            name = self._free_username(base)
            self._users[name] = {"provider": provider, "subject": subject, "email": email}
            self._save()
        return name

    def _linked_username(self, provider: str, subject: str) -> str | None:
        # Caller holds the lock.
        for name, entry in self._users.items():
            if entry.get("provider") == provider and entry.get("subject") == subject:
                return name
        return None

    def _free_username(self, base: str) -> str:
        """Pick an unused username, suffixing numerically when `base` is taken."""
        # Caller holds the lock.
        if base not in self._users:
            return base
        for index in range(2, 1000):
            suffix = str(index)
            stem = base[: USERNAME_MAX_LENGTH - len(suffix)].rstrip() or "player"
            candidate = f"{stem}{suffix}"
            if candidate not in self._users:
                return candidate
        raise ValueError("could not allocate a username")


auth_registry = UserRegistry()
