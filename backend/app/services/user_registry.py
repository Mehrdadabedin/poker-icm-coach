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
import threading
from pathlib import Path

from app.services.auth import normalize_username

logger = logging.getLogger(__name__)

MIN_PASSWORD_LENGTH = 8
_PBKDF2_ROUNDS = 200_000
# Fixed decoy material: an unknown username is verified against this so a
# failed lookup costs the same PBKDF2 work as a real one (no timing oracle
# telling an attacker which usernames are registered).
_DECOY_SALT = b"\x00" * 16
_DECOY_HASH = hashlib.pbkdf2_hmac("sha256", b"decoy", _DECOY_SALT, _PBKDF2_ROUNDS)


def _derive(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ROUNDS)


class UserRegistry:
    """Registered users: username -> salted PBKDF2-SHA256 password hash.

    - register(username, password) validates and stores a hashed credential.
    - verify(username, password) returns True only for a registered user with a
      matching password (constant-time compare, constant-time miss).
    - Best-effort JSON persistence to `users_file` (blank disables it).
    """

    def __init__(self, users_file: str = "") -> None:
        self._users: dict[str, dict[str, str]] = {}  # username -> {salt, hash}
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
        if entry is None:
            # Same work as a hit, then fail: constant-time username miss.
            hmac.compare_digest(_derive(password, _DECOY_SALT), _DECOY_HASH)
            return False
        salt = base64.b64decode(entry["salt"])
        expected = base64.b64decode(entry["hash"])
        return hmac.compare_digest(_derive(password, salt), expected)


auth_registry = UserRegistry()
