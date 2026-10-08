"""Registered-user credential store (A18 registration-first auth)."""
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import re
import threading

from app.core.config import settings
from app.services.auth import normalize_username
from app.services.documents import Document, FileDocument
from app.services.user_moderation import Moderation

MIN_PASSWORD_LENGTH = 8
USERNAME_MAX_LENGTH = 24
EXTERNAL_PROVIDERS = ("google",)
_PBKDF2_ROUNDS = 200_000
# An email local part is not a username; keep only allowed characters.
_USERNAME_UNSAFE_RE = re.compile(r"[^A-Za-z0-9_\- ]+")
# Decoy salt: unknown usernames still pay one derivation (no timing oracle).
_DECOY_SALT = b"\x00" * 16


def _derive(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ROUNDS)


def _hashed(password: str) -> dict[str, object]:
    salt = os.urandom(16)
    return {
        "salt": base64.b64encode(salt).decode("ascii"),
        "hash": base64.b64encode(_derive(password, salt)).decode("ascii"),
    }


def username_from_email(email: str) -> str:
    """Derive the username candidate from an email local part (may collide)."""
    cleaned = " ".join(_USERNAME_UNSAFE_RE.sub("", (email or "").split("@", 1)[0]).split())
    return cleaned[:USERNAME_MAX_LENGTH] if len(cleaned) >= 2 else "player"


class UserRegistry(Moderation):
    """Users: username -> salted PBKDF2-SHA256 hash or external identity
    {provider, subject, email}. register/verify are constant time; external
    entries have no hash. Persisted as one document (file or database row)."""

    def __init__(self, users_file: str = "") -> None:
        self._users: dict[str, dict[str, object]] = {}
        self._lock = threading.RLock()
        self._document: Document | None = None
        if users_file:
            self.bind_path(users_file)

    def bind_document(self, document: Document | None) -> None:
        """(Re)bind persistence and load it; None keeps users in memory only."""
        with self._lock:
            self._document = document
            self._users = (document.load() if document else None) or {}

    def bind_path(self, users_file: str) -> None:
        """(Re)bind a JSON file (blank disables persistence)."""
        self.bind_document(FileDocument(users_file) if users_file else None)

    def _save(self) -> None:
        """Callers hold the lock, so saves cannot land out of order."""
        if self._document is not None:
            self._document.save(self._users)

    def register(self, username: str, password: str) -> str:
        name = normalize_username(username)
        if len(password) < MIN_PASSWORD_LENGTH:
            raise ValueError(f"password must be at least {MIN_PASSWORD_LENGTH} characters")
        with self._lock:
            if name in self._users:
                raise ValueError("that username is already registered")
            self._users[name] = _hashed(password)
            self._save()
        return name

    def verify(self, username: str, password: str) -> bool:
        try:
            name = normalize_username(username)
        except ValueError:
            name = ""
        with self._lock:
            entry = self._users.get(name)
        salt_b64, hash_b64 = (entry.get("salt"), entry.get("hash")) if entry else (None, None)
        if not entry or not salt_b64 or not hash_b64:
            # Unknown and password-less entries pay one derivation (no oracle).
            _derive(password, _DECOY_SALT)
            return False
        return hmac.compare_digest(
            _derive(password, base64.b64decode(str(salt_b64))),
            base64.b64decode(str(hash_b64)),
        )

    def username_for_external(self, provider: str, subject: str) -> str | None:
        """Return the local username linked to an external identity, if any."""
        if not subject:
            return None
        with self._lock:
            return self._linked_username(provider, subject)

    def register_external(self, username: str, provider: str, subject: str, email: str) -> str:
        """Link a Google identity to a local account (idempotent; a colliding
        username gets a numeric suffix, never taking over a password account)."""
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
        """Caller holds the lock."""
        for name, entry in self._users.items():
            if entry.get("provider") == provider and entry.get("subject") == subject:
                return name
        return None

    def _free_username(self, base: str) -> str:
        """Pick an unused username; callers hold the lock."""
        if base not in self._users:
            return base
        for index in range(2, 1000):
            suffix = str(index)
            stem = base[: USERNAME_MAX_LENGTH - len(suffix)].rstrip() or "player"
            candidate = f"{stem}{suffix}"
            if candidate not in self._users:
                return candidate
        raise ValueError("could not allocate a username")

    def is_admin(self, username: str) -> bool:
        """Admin (A01): persisted ``admin`` flag or ADMIN_USERNAMES config."""
        with self._lock:
            if (self._users.get(username) or {}).get("admin") is True:
                return True
        try:
            names = {normalize_username(r.strip()) for r in (settings.admin_usernames or "").split(",") if r.strip()}
        except ValueError:
            return False
        return username in names

    def account_snapshot(self) -> list[tuple[str, str | None]]:
        """A02 safe rows: (username, provider) per account."""
        with self._lock:
            return sorted((n, p if isinstance(p, str) else None)
                          for n, e in self._users.items() for p in [e.get("provider")])

    def bootstrap_admin(self, password: str) -> bool:
        """Deterministic, idempotent bootstrap: create the initial Admin."""
        name = "Admin"
        with self._lock:
            if name in self._users:
                return False
            self._users[name] = {**_hashed(password), "admin": True, "change_password": True}
            self._save()
        return True

    def requires_password_change(self, username: str) -> bool:
        with self._lock:
            return bool((self._users.get(username) or {}).get("change_password"))

    def change_password(self, username: str, new_password: str) -> None:
        if len(new_password) < MIN_PASSWORD_LENGTH:
            raise ValueError(f"password must be at least {MIN_PASSWORD_LENGTH} characters")
        with self._lock:
            if username not in self._users:
                raise KeyError(username)
            entry = self._users[username]
            entry.update(_hashed(new_password))
            entry["change_password"] = False
            self._save()

auth_registry = UserRegistry()
