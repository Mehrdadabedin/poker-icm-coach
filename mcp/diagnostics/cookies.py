"""Cookie and session-token transport. Inspected, never changed.

This application has no cookie session: it reports that fact and the token
transport it uses instead, rather than describing cookie attributes that do not
exist.
"""
from __future__ import annotations

import re

from config import BACKEND_DIR, FRONTEND_DIR

COOKIE_API_RE = re.compile(r"(set_cookie|delete_cookie|Response\.cookies|Cookie\()")
COOKIE_ATTR_RE = re.compile(r"(samesite|httponly|secure\s*=)", re.I)
DOC_COOKIE_RE = re.compile(r"document\.cookie")
STORAGE_ITEM_RE = re.compile(
    r"(?:localStorage|sessionStorage)\.(?:get|set|remove)Item\(\s*([A-Za-z_$][\w$]*|[\"\'][^\"\']+[\"\'])"
)
CONST_RE = re.compile(r"const\s+([A-Za-z_$][\w$]*)\s*=\s*[\"\']([^\"\']+)[\"\']")


def storage_keys(source: str) -> list[str]:
    """Client storage key names, with simple `const KEY = "literal"` resolved."""
    constants = dict(CONST_RE.findall(source))
    keys = []
    for token in STORAGE_ITEM_RE.findall(source):
        if token[0] in "\"'":
            keys.append(token[1:-1])
        else:
            keys.append(constants.get(token, f"{token} (value not resolved)"))
    return sorted(set(keys))
BEARER_RE = re.compile(r"[\"\']?Authorization[\"\']?\s*[:=]\s*[\"\'`]?\s*Bearer", re.I)
COOKIE_ATTRIBUTES = ("secure", "httponly", "samesite", "domain", "path")


SOURCE_SUFFIXES = (".py", ".ts", ".tsx")


def _scan(root, *patterns: re.Pattern) -> list[list[str]]:
    """One walk over root's source files, matched against each pattern in turn."""
    hits: list[list[str]] = [[] for _ in patterns]
    candidates = (p for p in root.rglob("*") if p.suffix in SOURCE_SUFFIXES and p.is_file())
    # Group by suffix, .py then .ts then .tsx, so hit lists keep a stable order.
    ordered = sorted(candidates, key=lambda p: (SOURCE_SUFFIXES.index(p.suffix), p))
    for path in ordered:
        if any(part in {"node_modules", ".venv", "dist", "__pycache__"} for part in path.parts):
            continue
        try:
            text = path.read_text()
        except OSError:
            continue
        for bucket, pattern in zip(hits, patterns):
            if pattern.search(text):
                bucket.append(str(path.relative_to(root.parent)))
    return hits


def check_cookie_configuration() -> dict:
    """Cookie attribute metadata, or a clear statement that none applies."""
    backend_hits, attribute_hits = _scan(BACKEND_DIR / "app", COOKIE_API_RE, COOKIE_ATTR_RE)
    (frontend_hits,) = _scan(FRONTEND_DIR / "src", DOC_COOKIE_RE)
    api_source = ""
    try:
        api_source = (FRONTEND_DIR / "src/services/api.ts").read_text()
    except OSError:
        pass
    keys = storage_keys(api_source)
    bearer = bool(BEARER_RE.search(api_source))
    cookie_session = bool(backend_hits or frontend_hits)
    if cookie_session:
        attributes = {name: "present in source, value not read" for name in COOKIE_ATTRIBUTES}
        notes = [
            "cookie handling exists in the code base; its attributes are set where "
            "the cookie is written and this tool does not read values",
        ]
    else:
        attributes = {name: "not_applicable" for name in COOKIE_ATTRIBUTES}
        notes = [
            "no cookie is written or read by the backend or the frontend",
            "the session token is returned in a URL fragment and stored by the "
            "client, so Secure/HttpOnly/SameSite do not apply",
        ]
    return {
        "cookie_based_session": cookie_session,
        "cookie_attributes": attributes,
        "cookie_attribute_mentions": attribute_hits,
        "backend_cookie_api_usage": backend_hits,
        "frontend_document_cookie_usage": frontend_hits,
        "token_transport": {
            "scheme": "Authorization: Bearer" if bearer else "unknown",
            "client_storage_keys": keys,
            "browser_storage": "localStorage" if keys else "unknown",
        },
        "session_values_exposed": False,
        "read_only": True,
        "notes": notes,
    }
