"""Paths and limits for the ICM Master MCP server.

The server only ever reads files and issues read-only HTTP GETs. Nothing here
may write, and no value from a secret variable is ever read into a result.
"""
from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlsplit

# mcp/config.py -> repository root
REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = REPO_ROOT / "backend"
FRONTEND_DIR = REPO_ROOT / "frontend"
BACKEND_ENV_FILE = BACKEND_DIR / ".env"
FRONTEND_PROD_ENV_FILE = FRONTEND_DIR / ".env.production"

# Read-only endpoints this server is allowed to touch.
HEALTH_PATH = "/api/health"
PROVIDERS_PATH = "/api/auth/providers"
# FastAPI serves its schema at the root by default; this app does not move it.
OPENAPI_PATH = "/openapi.json"
ALLOWED_PATHS = frozenset({HEALTH_PATH, PROVIDERS_PATH, OPENAPI_PATH})

# Hosts the operator may point the probes at. Anything else is refused, so a
# tool call cannot be turned into a request against an arbitrary host.
DEFAULT_ALLOWED_HOSTS = ("127.0.0.1", "localhost", "::1")
ALLOWED_HOST_SUFFIXES = (".onrender.com",)
LOCAL_BASE_URL = "http://127.0.0.1:8000"
HTTP_TIMEOUT_SECONDS = 5.0

# Secret names: presence may be reported, values must never be returned.
SECRET_SETTING_NAMES = (
    "GOOGLE_CLIENT_SECRET",
    "DATABASE_URL",
    "AUTH_USERS_FILE",
    "AUTH_SESSIONS_FILE",
)


# Variable names whose VALUE may be read and reported: public URLs and plain
# settings. Credentials are never on this list; their presence is reported by
# name only.
NON_SECRET_READABLE = frozenset(
    {"GOOGLE_REDIRECT_URI", "CORS_ORIGINS", "API_HOST", "API_PORT"}
)


def _parse_env_file(path: Path) -> dict[str, str]:
    """Key/value pairs from a simple `KEY=value` file.

    Comments and blank or malformed lines are skipped; the first occurrence of
    a key wins.
    """
    try:
        text = path.read_text()
    except OSError:
        return {}
    values: dict[str, str] = {}
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, _, value = stripped.partition("=")
        values.setdefault(key.strip(), value.strip())
    return values


def read_backend_env_value(name: str) -> str | None:
    """Value of an allowlisted non-secret variable in backend/.env."""
    if name not in NON_SECRET_READABLE:
        raise ValueError(f"{name} is not on the readable allowlist")
    return _parse_env_file(BACKEND_ENV_FILE).get(name) or None


def backend_env_keys() -> frozenset[str]:
    """Names of the variables set to a non-empty value in backend/.env.

    Values are dropped on the line that reads them, so a secret cannot reach
    any caller of this function.
    """
    return frozenset(k for k, v in _parse_env_file(BACKEND_ENV_FILE).items() if v)


def production_backend_url() -> str | None:
    """Backend base URL the deployed frontend points at.

    Read from frontend/.env.production (VITE_API_URL): the deployed value is
    reported only when the repository actually states it.
    """
    return _parse_env_file(FRONTEND_PROD_ENV_FILE).get("VITE_API_URL") or None


def host_allowed(base_url: str) -> bool:
    host = (urlsplit(base_url).hostname or "").lower()
    if not host:
        return False
    allowed = set(DEFAULT_ALLOWED_HOSTS)
    for extra in os.environ.get("ICM_MCP_ALLOWED_HOSTS", "").split(","):
        if extra.strip():
            allowed.add(extra.strip().lower())
    return host in allowed or host.endswith(ALLOWED_HOST_SUFFIXES)


def resolve_base_url(base_url: str | None) -> tuple[str | None, str | None]:
    """Validate a caller-supplied base URL. Returns (url, error)."""
    candidate = (base_url or os.environ.get("ICM_MCP_BACKEND_URL") or LOCAL_BASE_URL).strip()
    parts = urlsplit(candidate)
    if parts.scheme not in {"http", "https"} or not parts.hostname:
        return None, f"not an http(s) URL: {candidate!r}"
    if not host_allowed(candidate):
        return None, f"host is not in the probe allowlist: {parts.hostname!r}"
    return candidate.rstrip("/"), None
