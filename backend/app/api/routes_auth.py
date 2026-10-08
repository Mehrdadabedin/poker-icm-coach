"""Authentication routes (A03/A04/A18)."""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import bearer_token, require_user
from app.core.config import settings
from app.database.session import engine
from app.services.auth import auth_store, normalize_username
from app.services.documents import DatabaseDocument, FileDocument
from app.services.user_registry import MIN_PASSWORD_LENGTH, auth_registry

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


def _seed(path: str) -> FileDocument | None:
    """Existing JSON files fill an empty database once, on its first save."""
    return FileDocument(path) if path else None


class RegisterRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class ChangePasswordRequest(BaseModel):
    new_password: str = Field(min_length=1, max_length=128)


def bind_auth_storage() -> None:
    """Bind the shared user registry + session store to AUTH_STORAGE. Blank file
    paths disable file persistence (the hermetic test suite)."""
    users, sessions = _abs(settings.auth_users_file), _abs(settings.auth_sessions_file)
    if settings.auth_storage == "database":
        auth_registry.bind_document(DatabaseDocument("users", engine, _seed(users)))
        auth_store.bind_document(DatabaseDocument("sessions", engine, _seed(sessions)))
    else:
        auth_registry.bind_path(users)
        auth_store.bind_path(sessions)


bind_auth_storage()


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
    username = normalize_username(request.username)
    is_admin = auth_registry.is_admin(username)
    return {
        "token": token,
        "username": username,
        "admin": is_admin,
        "must_change_password": is_admin and auth_registry.requires_password_change(username),
    }


@router.post("/logout")
def logout(_user: str = Depends(require_user),
           authorization: str = Header(default="")) -> dict:
    """Revoke the presented token."""
    auth_store.logout(bearer_token(authorization))
    return {"ok": True}


@router.post("/change-password")
def change_password(request: ChangePasswordRequest,
                    user: str = Depends(require_user)) -> dict:
    """Force-change the bootstrap Admin password on first login (A-ADM-fix).

    Only the caller's own account, and only while a forced change is pending.
    The new password is hashed with the app's PBKDF2 scheme and the forced
    flag is cleared, so the old bootstrap password stops working immediately.
    """
    if not auth_registry.requires_password_change(user):
        raise HTTPException(status_code=403, detail="password change not required")
    if len(request.new_password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"password must be at least {MIN_PASSWORD_LENGTH} characters",
        )
    auth_registry.change_password(user, request.new_password)
    return {"changed": True}


@router.get("/me")
def me(user: str = Depends(require_user)) -> dict:
    """Return the authenticated username for the presented token."""
    return {"username": user}
