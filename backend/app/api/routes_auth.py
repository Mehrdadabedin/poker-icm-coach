"""Authentication routes (A03/A04)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import bearer_token, require_user
from app.services.auth import auth_store, normalize_username

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)


@router.post("/login")
def login(request: LoginRequest) -> dict:
    """Issue a bearer token for a username (username-only sign-in)."""
    try:
        normalized = normalize_username(request.username)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    token = auth_store.login(normalized)
    return {"token": token, "username": normalized}


@router.post("/logout")
def logout(_user: str = Depends(require_user),
           authorization: str = Header(default="")) -> dict:
    """Revoke the presented token."""
    auth_store.logout(bearer_token(authorization))
    return {"ok": True}


@router.get("/me")
def me(user: str = Depends(require_user)) -> dict:
    """Return the authenticated username for the presented token."""
    return {"username": user}
