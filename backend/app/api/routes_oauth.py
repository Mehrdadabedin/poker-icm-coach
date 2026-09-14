"""Google sign-in routes: provider availability plus the OAuth 2.0 code flow.

Handlers are sync `def` on purpose: the token exchange is a blocking network
call and FastAPI runs sync handlers in its threadpool, so the event loop stays
free (the same rule the websocket handler follows with run_in_threadpool).
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import RedirectResponse

from app.core.config import settings
from app.services import google_oauth
from app.services.auth import auth_store
from app.services.user_registry import auth_registry, username_from_email

router = APIRouter(prefix="/api/auth", tags=["auth"])

GOOGLE = "google"
_NOT_CONFIGURED = "google sign-in is not configured"
_BAD_STATE = "invalid or expired oauth state"
_CALLBACK_SUFFIX = "/api/auth/google/callback"


@router.get("/providers")
def providers() -> dict[str, bool]:
    """Public availability probe. Returns booleans only, never a credential."""
    return {GOOGLE: google_oauth.is_configured(settings), "apple": False, "phone": False}


@router.get("/google/start")
def google_start(request: Request, redirect_uri: str = Query(default="")) -> RedirectResponse:
    """Begin the flow: trust-check the caller's origin, then hand off to Google."""
    if not google_oauth.is_configured(settings):
        raise HTTPException(status_code=503, detail=_NOT_CONFIGURED)
    origin = google_oauth.allowed_origin(redirect_uri, settings.cors_origin_list)
    if origin is None:
        raise HTTPException(status_code=400, detail="redirect_uri is not allowed")
    state = google_oauth.state_store.create(origin)
    authorize = google_oauth.authorize_url(
        settings.google_client_id, backend_callback_url(request), state
    )
    return RedirectResponse(authorize, status_code=302)


@router.get("/google/callback")
def google_callback(
    request: Request, code: str = Query(default=""), state: str = Query(default="")
) -> RedirectResponse:
    """Finish the flow and put the browser back into the app."""
    origin = google_oauth.state_store.consume(state)
    if origin is None:
        # The nonce is single-use and expires, so a replayed or forged state fails.
        raise HTTPException(status_code=400, detail=_BAD_STATE)
    if not code or not google_oauth.is_configured(settings):
        return _failure(origin)
    try:
        identity = google_oauth.authenticate_code(
            code,
            backend_callback_url(request),
            settings.google_client_id,
            settings.google_client_secret,
        )
    except google_oauth.GoogleAuthError:
        return _failure(origin)
    username = _resolve_user(identity)
    token = auth_store.login(username)
    return RedirectResponse(
        google_oauth.frontend_callback_url(origin, {"token": token, "username": username}),
        status_code=302,
    )


def _resolve_user(identity: google_oauth.GoogleIdentity) -> str:
    """Map one Google subject to one ICM user; never touch a password account."""
    existing = auth_registry.username_for_external(GOOGLE, identity.subject)
    if existing is not None:
        return existing
    candidate = username_from_email(identity.email)
    return auth_registry.register_external(candidate, GOOGLE, identity.subject, identity.email)


def _failure(origin: str) -> RedirectResponse:
    """Send the browser back to the app: a raw JSON error page would strand it."""
    return RedirectResponse(
        google_oauth.frontend_callback_url(origin, {"error": "google_signin_failed"}),
        status_code=302,
    )


def backend_callback_url(request: Request) -> str:
    """Public callback URL, honouring the proxy headers Render terminates TLS with."""
    if settings.google_redirect_uri:
        return settings.google_redirect_uri
    proto = _first(request.headers.get("x-forwarded-proto")) or request.url.scheme
    host = _first(request.headers.get("x-forwarded-host")) or _first(request.headers.get("host"))
    return f"{proto}://{host or request.url.netloc}{_CALLBACK_SUFFIX}"


def _first(value: str | None) -> str:
    """First entry of a comma-separated proxy header (proxies append duplicates)."""
    return (value or "").split(",")[0].strip()
