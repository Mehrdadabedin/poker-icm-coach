"""Admin actions on accounts: suspend, unsuspend and delete.

The rules live here rather than in the route: an admin can never act on their
own account or on another admin, so moderation can never lock every admin out.
Suspending sets the flag before revoking tokens, so a login that slips in
between is still refused by the flag.
"""
from __future__ import annotations

from app.services.auth import auth_store
from app.services.session_store import session_store
from app.services.user_registry import auth_registry


class ProtectedAccount(ValueError):
    """The target is the acting admin or another admin."""


def _check(target: str, actor: str) -> None:
    """KeyError for an unknown account, ProtectedAccount for a protected one."""
    if not auth_registry.has_account(target):
        raise KeyError(target)
    if target == actor:
        raise ProtectedAccount("you cannot suspend or delete your own account")
    if auth_registry.is_admin(target):
        raise ProtectedAccount("admin accounts cannot be suspended or deleted")


def suspend(target: str, actor: str) -> int:
    """Suspend and sign out everywhere. Returns the number of logins revoked."""
    _check(target, actor)
    auth_registry.set_suspended(target, True)
    return auth_store.revoke_user(target)


def unsuspend(target: str, actor: str) -> None:
    _check(target, actor)
    auth_registry.set_suspended(target, False)


def delete(target: str, actor: str) -> dict[str, int]:
    """Remove the account, its logins and its live tables."""
    _check(target, actor)
    auth_registry.delete(target)
    return {
        "logins_revoked": auth_store.revoke_user(target),
        "tables_closed": session_store.remove_owned_by(target),
    }
