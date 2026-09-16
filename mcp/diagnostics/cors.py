"""CORS configuration as the backend declares it. Inspected, never changed."""
from __future__ import annotations

import os
import re

from config import BACKEND_DIR, backend_env_keys, read_backend_env_value

CONFIG_MODULE = BACKEND_DIR / "app/core/config.py"
MAIN_MODULE = BACKEND_DIR / "app/main.py"
DEFAULT_RE = re.compile(r"cors_origins:\s*str\s*=\s*[\"\']([^\"\']*)[\"\']")
MIDDLEWARE_RE = re.compile(r"add_middleware\(\s*CORSMiddleware,(.*?)\)\s*\n\)?", re.S)
FRONTEND_PROD_ORIGIN = "https://icm-master-frontend.onrender.com"


def _origins_and_source() -> tuple[list[str], str]:
    # Presence decides the source, not truthiness: a variable set to an empty
    # value means "no origins allowed", which is different from "not set".
    if "CORS_ORIGINS" in os.environ:
        raw = os.environ["CORS_ORIGINS"]
        return [o.strip() for o in raw.split(",") if o.strip()], "process environment"
    if "CORS_ORIGINS" in backend_env_keys():
        value = read_backend_env_value("CORS_ORIGINS") or ""
        return [o.strip() for o in value.split(",") if o.strip()], "backend/.env"
    try:
        match = DEFAULT_RE.search(CONFIG_MODULE.read_text())
    except OSError:
        return [], "unknown"
    if not match:
        return [], "unknown"
    return [o.strip() for o in match.group(1).split(",") if o.strip()], "default in app/core/config.py"


def _middleware_flags() -> dict:
    """What the CORSMiddleware call actually passes. Absent means default."""
    try:
        text = MAIN_MODULE.read_text()
    except OSError:
        return {"source": None, "allow_credentials": "unknown", "allow_methods": "unknown",
                "allow_headers": "unknown"}
    block = MIDDLEWARE_RE.search(text)
    if not block:
        # No CORS middleware call to read: say so instead of guessing defaults.
        return {"source": None, "allow_credentials": "unknown", "allow_methods": "unknown",
                "allow_headers": "unknown", "allow_origins": "unknown"}
    body = block.group(1)

    def value(name: str) -> str:
        found = re.search(rf"{name}\s*=\s*([^,\n]+)", body)
        return found.group(1).strip() if found else "not set (framework default)"

    return {
        "source": "backend/app/main.py",
        "allow_credentials": value("allow_credentials"),
        "allow_methods": value("allow_methods"),
        "allow_headers": value("allow_headers"),
        "allow_origins": value("allow_origins"),
    }


def check_cors_configuration() -> dict:
    """Allowed origins, credential flag, and the frontend/backend relation."""
    origins, source = _origins_and_source()
    flags = _middleware_flags()
    credentials = flags["allow_credentials"]
    notes = [
        "read-only: this tool never writes CORS configuration",
        "the deployed backend reports the same list through its settings; compare "
        "with the CORS_ORIGINS value on the service",
    ]
    if credentials == "not set (framework default)":
        notes.append(
            "allow_credentials is unset, so cross-origin calls do not send "
            "credentials; the app authenticates with a bearer token instead"
        )
    return {
        "configured_origins": origins,
        "origin_count": len(origins),
        "origins_source": source,
        "allow_credentials": credentials,
        "allow_methods": flags["allow_methods"],
        "allow_headers": flags["allow_headers"],
        "middleware_source": flags["source"],
        "frontend_production_origin": FRONTEND_PROD_ORIGIN,
        "frontend_production_origin_allowed": FRONTEND_PROD_ORIGIN in origins,
        "local_dev_origins_allowed": [o for o in origins if "localhost" in o or "127.0.0.1" in o],
        "wildcard_origin": "*" in origins,
        "read_only": True,
        "notes": notes,
    }
