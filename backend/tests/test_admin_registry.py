"""A02 tests: read-only UserRegistry account helpers (admin.md A02).

The helpers take an optional registry so each test drives a deterministic
tmp-file registry without touching the shared in-memory singleton or any live
data file. Credential-shaped fake values are used purely for fixture data."""
from __future__ import annotations

from dataclasses import asdict

from app.services import user_registry_admin as admin
from app.services.user_registry import UserRegistry

LOCAL_ENTRY = {"salt": "s1", "hash": "h1"}
GOOGLE_ENTRY = {"provider": "google", "subject": "sub-77", "email": "u@example.com"}


def _registry(tmp_path, users: dict[str, dict[str, str]]) -> UserRegistry:
    import json

    path = tmp_path / "users.json"
    path.write_text(json.dumps(users, sort_keys=True), encoding="utf-8")
    return UserRegistry(users_file=str(path))


def test_empty_registry_counts_zero(tmp_path) -> None:
    registry = _registry(tmp_path, {})
    assert admin.total_registered_accounts(registry) == 0
    assert admin.account_summary(registry) == {"total": 0, "local": 0, "google": 0}
    assert admin.list_registered_accounts(registry) == []


def test_local_accounts_counted(tmp_path) -> None:
    registry = _registry(tmp_path, {"alice": LOCAL_ENTRY, "bob": LOCAL_ENTRY})
    assert admin.account_summary(registry) == {"total": 2, "local": 2, "google": 0}


def test_google_accounts_counted(tmp_path) -> None:
    registry = _registry(tmp_path, {"carol": GOOGLE_ENTRY, "dave": GOOGLE_ENTRY})
    assert admin.account_summary(registry) == {"total": 2, "local": 0, "google": 2}


def test_mixed_accounts_counted(tmp_path) -> None:
    registry = _registry(
        tmp_path,
        {"alice": LOCAL_ENTRY, "bob": LOCAL_ENTRY, "carol": GOOGLE_ENTRY},
    )
    assert admin.account_summary(registry) == {"total": 3, "local": 2, "google": 1}
    assert admin.total_registered_accounts(registry) == 3


def test_unknown_provider_falls_back_to_local(tmp_path) -> None:
    """The established representation only stores 'google'; anything else is
    treated as a local/password account (no provider inference invented)."""
    registry = _registry(tmp_path, {"odd": {"provider": "apple", "salt": "s"}})
    assert admin.account_summary(registry) == {"total": 1, "local": 1, "google": 0}


def test_safe_enumeration_fields_only(tmp_path) -> None:
    registry = _registry(
        tmp_path,
        {"alice": LOCAL_ENTRY, "carol": GOOGLE_ENTRY},
    )
    rows = admin.list_registered_accounts(registry)
    assert [asdict(r) for r in rows] == [
        {"username": "alice", "provider": "local"},
        {"username": "carol", "provider": "google"},
    ]
    assert all(set(asdict(r)) == {"username", "provider"} for r in rows)


def test_credentials_never_returned(tmp_path) -> None:
    registry = _registry(
        tmp_path,
        {"alice": LOCAL_ENTRY, "carol": GOOGLE_ENTRY},
    )
    for row in admin.list_registered_accounts(registry):
        rendered = repr(row)
        for forbidden in ("salt", "hash", "subject", "email", "provider=(" ):
            assert forbidden not in rendered.replace("'", "").replace('"', "")
    # counts derive from rows, so hashes can never enter them either
    assert admin.account_summary(registry)["total"] == 2


def test_read_only_helpers_do_not_touch_store(monkeypatch, tmp_path) -> None:
    import json

    from app.services.documents import FileDocument
    from app.services.user_registry import auth_registry

    path = tmp_path / "live.json"
    path.write_text(json.dumps({"keep": LOCAL_ENTRY}), encoding="utf-8")
    monkeypatch.setattr(auth_registry, "_document", FileDocument(str(path)))
    monkeypatch.setattr(auth_registry, "_users", {"keep": dict(LOCAL_ENTRY)})
    before = path.read_text(encoding="utf-8")
    _ = admin.total_registered_accounts(auth_registry)
    _ = admin.account_summary(auth_registry)
    _ = admin.list_registered_accounts(auth_registry)
    assert path.read_text(encoding="utf-8") == before
    assert admin.total_registered_accounts(auth_registry) == 1


def test_google_identity_is_not_implicitly_admin(tmp_path, monkeypatch) -> None:
    """A Google-linked account is a normal user unless explicitly authorized."""
    from app.core.config import settings

    registry = _registry(tmp_path, {"carol": GOOGLE_ENTRY, "alice": LOCAL_ENTRY})
    monkeypatch.setattr(settings, "admin_usernames", "")
    assert registry.is_admin("carol") is False
    assert registry.is_admin("alice") is False
    monkeypatch.setattr(settings, "admin_usernames", "carol")
    assert registry.is_admin("carol") is True
