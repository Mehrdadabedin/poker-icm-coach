"""Which redirect URI the backend expects for Google sign-in.

The value is reported with its source, so an invented URL is impossible: either
GOOGLE_REDIRECT_URI is set and reported as such, or the URI is derived from a
base URL the repository states, or the answer is "cannot determine".
"""
from __future__ import annotations

import os
import re

from config import BACKEND_DIR, production_backend_url, read_backend_env_value
from diagnostics.oauth_routes import static_scan

OAUTH_MODULE = BACKEND_DIR / "app/services/google_oauth.py"
FRAGMENT_RE = re.compile(r"[\"\']([^\"\']*#/auth/callback[^\"\']*)[\"\']")


def _frontend_fragment() -> str | None:
    try:
        text = OAUTH_MODULE.read_text()
    except OSError:
        return None
    match = FRAGMENT_RE.search(text)
    return match.group(1) if match else None


def check_google_callback_configuration(base_url: str | None = None, scan: dict | None = None) -> dict:
    """Expected redirect URI, its source, and the frontend return target.

    `scan`: see `static_scan`.
    """
    scan = static_scan() if scan is None else scan
    callback_path = None
    for route in scan.get("routes", []):
        if route["path"].endswith("/google/callback"):
            callback_path = route["path"]
    override = os.environ.get("GOOGLE_REDIRECT_URI", "").strip()
    override_source = "process environment"
    if not override:
        file_value = read_backend_env_value("GOOGLE_REDIRECT_URI")
        if file_value is not None:
            override = file_value.strip()
            override_source = "backend/.env"
    local_base = (base_url or os.environ.get("ICM_MCP_BACKEND_URL") or "http://127.0.0.1:8000").rstrip("/")
    production_base = production_backend_url()
    environments = {
        "local": {
            "base_url": local_base,
            "expected_redirect_uri": f"{local_base}{callback_path}" if callback_path else None,
            "source": "derived_from_base_url",
        },
        "production": {
            "base_url": production_base,
            "expected_redirect_uri": f"{production_base}{callback_path}"
            if (production_base and callback_path)
            else None,
            "source": "derived_from_production_base_url" if production_base else "unknown",
        },
    }
    if override:
        for entry in environments.values():
            entry["expected_redirect_uri"] = override
            entry["source"] = f"GOOGLE_REDIRECT_URI ({override_source})"
    notes = []
    if callback_path is None:
        notes.append("callback route not found in the router source, so no URI can be derived")
    if not override:
        notes.append(
            "GOOGLE_REDIRECT_URI is unset, so the deployed API derives the URI per "
            "request from the proxy headers"
        )
    if scan.get("proxy_headers_documented"):
        notes.append("x-forwarded-proto / x-forwarded-host handling is present in the router")
    if production_base is None:
        notes.append("frontend/.env.production does not state a backend URL")
    return {
        "callback_path": callback_path,
        "callback_path_source": scan.get("source_file"),
        "configured_base_url": local_base,
        "expected_redirect_uri": environments["local"]["expected_redirect_uri"],
        "redirect_uri_source": environments["local"]["source"],
        "environments": environments,
        "override_present": bool(override),
        "frontend_return_target": _frontend_fragment(),
        "determinable": bool(override or callback_path),
        "read_only": True,
        "notes": notes,
    }
