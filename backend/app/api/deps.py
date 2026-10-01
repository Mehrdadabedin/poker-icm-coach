"""FastAPI dependencies for authenticated API access (A03/A05/A12)."""
from __future__ import annotations

from fastapi import Header, HTTPException

from app.services.auth import auth_store
from app.services.user_registry import auth_registry

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


def bearer_token(authorization: str) -> str | None:
    if not authorization:
        return None
    parts = authorization.split()
    if len(parts) == 2 and parts[0].lower() == "bearer" and parts[1]:
        return parts[1]
    return None

def require_admin(authorization: str = Header(default="")) -> str:
    """Resolve the authenticated username and require Admin level (A01).

    401 for an unauthenticated/invalid token; 403 for a valid normal user.
    Server-side gate so future Admin APIs stay protected from any client that
    holds a normal user token; the frontend can never elevate access.
    """
    user = require_user(authorization)
    if not auth_registry.is_admin(user):
        raise HTTPException(status_code=403, detail="admin access required")
    return user
