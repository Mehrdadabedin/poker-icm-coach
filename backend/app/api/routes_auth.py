"""Authentication routes (A03/A04/A18)."""
from __future__ import annotations

from pathlib import Path

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

# Resolve relative persistence paths against the backend root so registered
# users/sessions survive restarts regardless of the process working directory
# (e.g. uvicorn started from a different folder in deployment).
_BACKEND_ROOT = Path(__file__).resolve().parents[2]


def _abs(path_str: str) -> str:
    if not path_str:
        return ""
    p = Path(path_str)
    return str(_BACKEND_ROOT / p) if not p.is_absolute() else str(p)


class RegisterRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


# Bind the shared user registry + session store to the configured persistence
# files (blank disables file persistence, e.g. in the hermetic test suite).
auth_registry.bind_path(_abs(settings.auth_users_file))
auth_store.bind_path(_abs(settings.auth_sessions_file))


@router.post("/register")
def register(request: RegisterRequest) -> dict:
    """Register a new user and authorize them immediately (A18).
    Passwords are hashed, never stored/logged in plaintext. The returned token
    is a valid session for the new account, so the user can enter the private
    table right away without a second sign-in."""
    try:
        username = auth_registry.register(request.username, request.password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    token = auth_store.login(username)
    return {"username": username, "registered": True, "token": token}


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
