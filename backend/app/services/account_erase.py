"""Remove an account and everything that belongs to it (plan 095).

Shared by the Admin delete and the player's own delete, so both remove the
same data: the account, its logins, its live tables, its saved history, its
photo and its profile.
"""
from __future__ import annotations

from app.services import history_archive, plans, portraits, profiles
from app.services.auth import auth_store
from app.services.session_store import session_store
from app.services.user_registry import auth_registry


def erase_account(username: str) -> dict[str, int]:
    """KeyError for an unknown username. The account goes first, so no new
    login can start while the rest is removed."""
    auth_registry.delete(username)
    return {
        "logins_revoked": auth_store.revoke_user(username),
        "tables_closed": session_store.remove_owned_by(username),
        "history_deleted": history_archive.archive.delete_owner(username),
        "portrait_deleted": int(portraits.store.delete(username)),
        "profile_deleted": int(profiles.store.delete(username)),
        "plan_deleted": int(plans.store.delete(username)),
    }
