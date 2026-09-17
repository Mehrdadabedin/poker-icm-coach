"""Google OAuth 2.0 authorization-code flow, standard library only.

Trust model: the code is exchanged server-side with Google's token endpoint over
TLS, authenticated by our client secret, so the id_token reaches us on an
authenticated channel rather than through the browser. The claim checks below
(aud, iss, exp, sub, email_verified) sit on top of that channel. No JWT signature
library is used because the project forbids a new runtime dependency.

Tests never touch the network: every outbound call goes through
`_http_post_json`, a module-level seam the suite monkeypatches.
"""
from __future__ import annotations

import base64
import binascii
import json
import secrets
import threading
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass

AUTHORIZE_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
SCOPE = "openid email profile"
ISSUERS = frozenset({"accounts.google.com", "https://accounts.google.com"})
STATE_TTL_SECONDS = 600.0
CALLBACK_PATH = "/#/auth/callback"


class GoogleAuthError(Exception):
    """A failure that must return the browser to the app with an error flag."""


@dataclass(frozen=True)
class GoogleIdentity:
    subject: str
    email: str


def _http_post_json(url: str, body: bytes) -> dict[str, object]:
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    request = urllib.request.Request(url, data=body, headers=headers)
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def _b64url_decode(segment: str) -> bytes:
    return base64.urlsafe_b64decode(segment + "=" * (-len(segment) % 4))


def exchange_code(code: str, redirect_uri: str, client_id: str, client_secret: str) -> dict[str, object]:
    """Trade the authorization code for tokens (blocking; call off the event loop)."""
    body = urllib.parse.urlencode(
        {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }
    ).encode("ascii")
    try:
        return _http_post_json(TOKEN_ENDPOINT, body)
    except (OSError, ValueError) as exc:
        raise GoogleAuthError("token exchange failed") from exc


def decode_id_token_claims(id_token: str) -> dict[str, object]:
    """Decode the JWT payload. Signature checks are unnecessary, see module docstring."""
    parts = id_token.split(".")
    if len(parts) != 3:
        raise GoogleAuthError("malformed id_token")
    try:
        claims = json.loads(_b64url_decode(parts[1]))
    except (binascii.Error, ValueError, UnicodeDecodeError) as exc:
        raise GoogleAuthError("malformed id_token") from exc
    if not isinstance(claims, dict):
        raise GoogleAuthError("malformed id_token claims")
    return claims


def validate_claims(claims: dict[str, object], client_id: str) -> None:
    """Reject an id_token that is not for this client, issuer or moment in time."""
    audience = claims.get("aud")
    is_for_us = client_id in audience if isinstance(audience, list) else audience == client_id
    if not is_for_us:
        raise GoogleAuthError("id_token audience is not this client")
    if claims.get("iss") not in ISSUERS:
        raise GoogleAuthError("id_token issuer is not Google")
    expiry = claims.get("exp")
    if isinstance(expiry, bool) or not isinstance(expiry, (int, float)):
        raise GoogleAuthError("id_token has no expiry")
    if expiry <= time.time():
        raise GoogleAuthError("id_token is expired")
    subject = claims.get("sub")
    if not isinstance(subject, str) or not subject:
        raise GoogleAuthError("id_token has no subject")
    email = claims.get("email")
    if isinstance(email, str) and email and claims.get("email_verified") is not True:
        raise GoogleAuthError("id_token email is not verified")


def authenticate_code(
    code: str, redirect_uri: str, client_id: str, client_secret: str
) -> GoogleIdentity:
    """Exchange the code and return the identity the verified claims assert."""
    payload = exchange_code(code, redirect_uri, client_id, client_secret)
    id_token = payload.get("id_token")
    if not isinstance(id_token, str) or not id_token:
        raise GoogleAuthError("token response has no id_token")
    claims = decode_id_token_claims(id_token)
    validate_claims(claims, client_id)
    email = claims.get("email")
    return GoogleIdentity(
        subject=str(claims["sub"]), email=email if isinstance(email, str) else ""
    )


def allowed_origin(redirect_uri: str, allowed: list[str]) -> str | None:
    """Return the origin of `redirect_uri` when it is http(s) and allowlisted."""
    parsed = urllib.parse.urlsplit(redirect_uri)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return None
    if parsed.username or parsed.password:
        return None
    origin = f"{parsed.scheme}://{parsed.netloc}"
    if origin not in {candidate.rstrip("/") for candidate in allowed}:
        return None
    return origin


def authorize_url(client_id: str, redirect_uri: str, state: str) -> str:
    query = urllib.parse.urlencode(
        {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": SCOPE,
            "state": state,
            "prompt": "select_account",
        }
    )
    return f"{AUTHORIZE_ENDPOINT}?{query}"


def frontend_callback_url(origin: str, params: dict[str, str]) -> str:
    """Build the app landing URL. Parameters go in the fragment, never the path."""
    query = urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
    return f"{origin}{CALLBACK_PATH}?{query}"


class OAuthStateStore:
    """Single-use CSRF state nonces bound to the origin the browser must return to.

    The redirect target is read back from here, never from the query string, so a
    forged callback cannot aim a freshly minted token at another site.
    """

    def __init__(self, ttl: float = STATE_TTL_SECONDS) -> None:
        self._ttl = ttl
        self._lock = threading.Lock()
        self._states: dict[str, tuple[str, float]] = {}

    def create(self, origin: str) -> str:
        nonce = secrets.token_urlsafe(32)
        now = time.time()
        with self._lock:
            self._prune(now)
            self._states[nonce] = (origin, now + self._ttl)
        return nonce

    def consume(self, nonce: str) -> str | None:
        """Pop the nonce; unknown, expired and replayed values all return None."""
        if not nonce:
            return None
        with self._lock:
            entry = self._states.pop(nonce, None)
        if entry is None:
            return None
        origin, expires = entry
        return origin if time.time() <= expires else None

    def _prune(self, now: float) -> None:
        # Caller holds the lock. Without this an abandoned start leaks a nonce.
        self._states = {key: value for key, value in self._states.items() if value[1] > now}


state_store = OAuthStateStore()
