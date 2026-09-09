"""Authentication routes (A03/A04/A18)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import bearer_token, require_user
from app.core.config import settings
from app.services.auth import (
    auth_registry,
    auth_store,
    normalize_username,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


# Bind the shared user registry to the configured persistence file (blank
# disables file persistence, e.g. in the hermetic test suite).
auth_registry.bind_path(settings.auth_users_file)


@router.post("/register")
def register(request: RegisterRequest) -> dict:
    """Register a new user (A18). Passwords are hashed, never stored/logged in
    plaintext. The user must then sign in with their credentials."""
    try:
        username = auth_registry.register(request.username, request.password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"username": username, "registered": True}


@router.post("/login")
def login(request: LoginRequest) -> dict:
    """Sign in with registered credentials; issue a bearer token on success.
    Invalid/unknown credentials yield a single generic 401 (no account hint)."""
    if not auth_registry.verify(request.username, request.password):
        raise HTTPException(status_code=401, detail="invalid username or password")
    token = auth_store.login(request.username)
    return {"token": token, "username": normalize_username(request.username)}


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
