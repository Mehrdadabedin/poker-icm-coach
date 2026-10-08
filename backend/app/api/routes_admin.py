"""Admin routes (admin.md A03): the account API for the Admin frontend.

Every endpoint depends on the A01 `require_admin`. Reads return only safe
fields; users.json and the stored documents are never served directly. The
write endpoints suspend, unsuspend or delete an account (see account_admin).
"""
from __future__ import annotations

from collections.abc import Callable

from fastapi import APIRouter, Depends, HTTPException, Path, Query

from app.api.deps import require_admin
from app.services import account_admin
from app.services import user_registry_admin as accounts

router = APIRouter(prefix="/api/admin", tags=["admin"])

DEFAULT_LIMIT = 50
MAX_LIMIT = 200
Username = Path(min_length=1, max_length=64)


@router.get("/users/summary")
def users_summary(_: str = Depends(require_admin)) -> dict:
    """Safe account metrics (Admin only)."""
    counts = accounts.account_summary()
    return {
        "total_registered_accounts": counts["total"],
        "local_accounts": counts[accounts.LOCAL],
        "google_accounts": counts[accounts.GOOGLE],
    }


@router.get("/users")
def list_users(
    limit: int = Query(default=DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    offset: int = Query(default=0, ge=0),
    _: str = Depends(require_admin),
) -> dict:
    """Safe, bounded list of registered accounts (Admin only).

    Offset/limit pagination over the stable sorted snapshot; the full user
    count is always returned so clients can page predictably. Never includes
    credential, token, OAuth subject or session material.
    """
    all_rows = accounts.list_registered_accounts()
    page = all_rows[offset:offset + limit]
    return {
        "users": [
            {"username": row.username, "provider": row.provider,
             "suspended": row.suspended, "admin": row.admin}
            for row in page
        ],
        "total": len(all_rows),
        "limit": limit,
        "offset": offset,
    }


def _moderate[T](action: Callable[[str, str], T], username: str, admin: str) -> T:
    """Map the account rules to HTTP: unknown is 404, protected is 400."""
    try:
        return action(username, admin)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="user not found") from exc
    except account_admin.ProtectedAccount as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/users/{username}/suspend")
def suspend_user(username: str = Username, admin: str = Depends(require_admin)) -> dict:
    """Suspend an account and sign it out everywhere."""
    revoked = _moderate(account_admin.suspend, username, admin)
    return {"username": username, "suspended": True, "logins_revoked": revoked}


@router.post("/users/{username}/unsuspend")
def unsuspend_user(username: str = Username, admin: str = Depends(require_admin)) -> dict:
    _moderate(account_admin.unsuspend, username, admin)
    return {"username": username, "suspended": False}


@router.delete("/users/{username}")
def delete_user(username: str = Username, admin: str = Depends(require_admin)) -> dict:
    """Delete an account, its logins and its live tables."""
    removed = _moderate(account_admin.delete, username, admin)
    return {"username": username, "deleted": True, **removed}
