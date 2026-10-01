"""Admin routes (admin.md A03): protected read-only account API.

Prepended Admin-only endpoints, reusing the A01 `require_admin` dependency.
These are the ONLY application interface for the future Admin frontend to read
account information; users.json is never served directly. Read-only from the
account perspective: no writes to users.json/sessions.json or auth state.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.api.deps import require_admin
from app.services import user_registry_admin as accounts

router = APIRouter(prefix="/api/admin", tags=["admin"])

DEFAULT_LIMIT = 50
MAX_LIMIT = 200


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
            {"username": row.username, "provider": row.provider} for row in page
        ],
        "total": len(all_rows),
        "limit": limit,
        "offset": offset,
    }
