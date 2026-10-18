"""Google sign-in routes: provider availability plus the OAuth 2.0 code flow.

Handlers are sync `def` on purpose: the token exchange is a blocking network
call and FastAPI runs sync handlers in its threadpool, so the event loop stays
free (the same rule the websocket handler follows with run_in_threadpool).
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services import google_app_auth, google_config, google_oauth
from app.services.auth import auth_store
from app.services.user_registry import auth_registry, username_from_email

router = APIRouter(prefix="/api/auth", tags=["auth"])

GOOGLE = "google"
_NOT_CONFIGURED = "google sign-in is not configured"
_BAD_STATE = "invalid or expired oauth state"
_CALLBACK_SUFFIX = "/api/auth/google/callback"


class AppExchangeRequest(BaseModel):
    code: str = Field(min_length=1, max_length=64)
    verifier: str = Field(min_length=43, max_length=128)  # RFC 7636 bounds


@router.get("/providers")
def providers() -> dict[str, object]:
    """Public availability probe. Reports state and missing variable NAMES.

    Only names, never values: a deployment that forgot a credential has to be
    diagnosable from outside the process.
    """
    missing = google_config.missing_configuration(settings)
    return {
        GOOGLE: not missing,
        "apple": False,
        "phone": False,
        "google_missing": missing,
    }


@router.get("/google/start")
def google_start(request: Request, redirect_uri: str = Query(default=""),
                 app_challenge: str = Query(default="", max_length=64)) -> RedirectResponse:
    """Begin the flow: trust-check the caller's origin, then hand off to Google.

    `app_challenge` marks a start from the Android app (plan 088)."""
    missing = google_config.missing_configuration(settings)
    if missing:
        # Name the variables that are blank, so the operator knows what to set.
        raise HTTPException(status_code=503, detail=f"{_NOT_CONFIGURED}: missing {', '.join(missing)}")
    origin = google_oauth.allowed_origin(redirect_uri, settings.cors_origin_list)
    if origin is None:
        raise HTTPException(status_code=400, detail="redirect_uri is not allowed")
    if app_challenge and not google_app_auth.valid_challenge(app_challenge):
        raise HTTPException(status_code=400, detail="app_challenge is not a SHA-256 in base64url")
    state = google_oauth.state_store.create(origin)
    if app_challenge:
        google_app_auth.remember(state, app_challenge)
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
    challenge = google_app_auth.challenge_of(state)
    if not code or not google_config.is_configured(settings):
        return _failure(origin, challenge)
    try:
        identity = google_oauth.authenticate_code(
            code,
            backend_callback_url(request),
            settings.google_client_id,
            settings.google_client_secret,
        )
    except google_oauth.GoogleAuthError:
        return _failure(origin, challenge)
    username = _resolve_user(identity)
    if auth_registry.is_suspended(username):
        return _failure(origin, challenge, "account_suspended")
    if challenge:  # the app's Chrome tab: hand over a code, not the token
        code = google_app_auth.issue(username, challenge)
        return RedirectResponse(google_app_auth.app_redirect({"code": code}), status_code=302)
    token = auth_store.login(username)
    return RedirectResponse(
        google_oauth.frontend_callback_url(origin, {"token": token, "username": username}),
        status_code=302,
    )


@router.post("/google/app-exchange")
def google_app_exchange(body: AppExchangeRequest) -> dict[str, str]:
    """The Android app trades its one-time code and verifier for a session."""
    username = google_app_auth.redeem(body.code, body.verifier)
    if username is None:
        raise HTTPException(status_code=400, detail="invalid or expired code")
    if auth_registry.is_suspended(username):
        raise HTTPException(status_code=403, detail="this account is suspended")
    return {"token": auth_store.login(username), "username": username}


def _resolve_user(identity: google_oauth.GoogleIdentity) -> str:
    """Map one Google subject to one ICM user; never touch a password account."""
    existing = auth_registry.username_for_external(GOOGLE, identity.subject)
    if existing is not None:
        return existing
    candidate = username_from_email(identity.email)
    return auth_registry.register_external(candidate, GOOGLE, identity.subject, identity.email)


def _failure(origin: str, challenge: str | None,
             error: str = "google_signin_failed") -> RedirectResponse:
    """Send the browser back to the app: a raw JSON error page would strand it."""
    if challenge:
        return RedirectResponse(google_app_auth.app_redirect({"error": error}), status_code=302)
    return RedirectResponse(
        google_oauth.frontend_callback_url(origin, {"error": error}),
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
