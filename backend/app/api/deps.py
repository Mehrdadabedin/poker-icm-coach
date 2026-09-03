"""FastAPI dependencies for authenticated API access (A03/A05/A12)."""
from __future__ import annotations

from fastapi import Header, HTTPException

from app.services.auth import auth_store

_401 = HTTPException(status_code=401, detail="authentication required")


def require_user(authorization: str = Header(default="")) -> str:
    """Resolve the authenticated username from the Authorization header.

    Accepts `Bearer <token>`. Never trusts a client-supplied username.
    """
    token = bearer_token(authorization)
    user = auth_store.user_for_token(token)
    if user is None:
        raise _401
    return user


def optional_user(authorization: str = Header(default="")) -> str | None:
    """Like require_user but returns None when no valid token is present."""
    token = bearer_token(authorization)
    return auth_store.user_for_token(token)


def bearer_token(authorization: str) -> str | None:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer" and parts[1]:
        return parts[1]
    return None
