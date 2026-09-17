"""Which Google OAuth routes the backend defines.

Two independent sources, so a report is never based on a guess:
  * a static scan of the FastAPI router definitions in backend/app,
  * a live read of the running app's OpenAPI document when it is reachable.
Nothing is imported from the application and nothing is modified.
"""
from __future__ import annotations

import re

from config import BACKEND_DIR, OPENAPI_PATH, resolve_base_url
from diagnostics.http import get_json

ROUTES_FILE = BACKEND_DIR / "app/api/routes_oauth.py"
PREFIX_RE = re.compile(r"APIRouter\(\s*prefix\s*=\s*[\"\']([^\"\']+)[\"\']")
ROUTE_RE = re.compile(r"@router\.(get|post|put|delete|patch)\(\s*[\"\']([^\"\']+)[\"\']")
CALLBACK_SUFFIX_RE = re.compile(r"_CALLBACK_SUFFIX\s*=\s*[\"\']([^\"\']+)[\"\']")


def static_scan(routes_file=None) -> dict:
    """Routes declared in the router module. Missing or odd files degrade.

    diagnose_google_oauth needs this result for both the route check and the
    callback check, so it calls this once and passes it to each as `scan`
    rather than have every caller read and parse the router source again.
    """
    path = routes_file or ROUTES_FILE
    try:
        text = path.read_text()
    except OSError as exc:
        return {"ok": False, "error": f"cannot read {path}: {type(exc).__name__}", "routes": []}
    prefix_match = PREFIX_RE.search(text)
    prefix = prefix_match.group(1) if prefix_match else ""
    routes = []
    for method, route_path in ROUTE_RE.findall(text):
        full = f"{prefix}{route_path}"
        routes.append({"method": method.upper(), "path": full, "path_has_google": "google" in full})
    suffix = CALLBACK_SUFFIX_RE.search(text)
    return {
        "ok": True,
        "source_file": str(path.relative_to(path.parents[2])),
        "router_prefix": prefix,
        "routes": routes,
        "callback_suffix_constant": suffix.group(1) if suffix else None,
    }


def _pick(routes: list[dict], needle: str) -> str | None:
    for route in routes:
        if route["path"].endswith(needle):
            return route["path"]
    return None


async def check_oauth_routes(base_url: str | None = None, scan: dict | None = None) -> dict:
    """Do the Google authorization and callback routes exist?

    `scan`: see `static_scan`.
    """
    scan = static_scan() if scan is None else scan
    authorization = _pick(scan.get("routes", []), "/google/start")
    callback = _pick(scan.get("routes", []), "/google/callback")
    notes = []
    if not scan.get("ok"):
        notes.append(scan.get("error", "static scan failed"))
    live = {"attempted": False}
    url, error = resolve_base_url(base_url)
    if error:
        notes.append(f"live check skipped: {error}")
    else:
        live["attempted"] = True
        response = await get_json(url, OPENAPI_PATH)
        paths = (response.get("json") or {}).get("paths") if response.get("ok") else None
        live["reachable"] = response.get("ok", False)
        if isinstance(paths, dict):
            live["google_paths"] = sorted(p for p in paths if "google" in p)
            live["routes_match_source"] = bool(
                authorization in paths if authorization else False
            ) and bool(callback in paths if callback else False)
            if live["routes_match_source"] and not authorization:
                authorization = _pick(
                    [{"path": p} for p in live["google_paths"]], "/google/start"
                )
                callback = _pick([{"path": p} for p in live["google_paths"]], "/google/callback")
        else:
            live["reachable"] = False
            live["note"] = "OpenAPI document unavailable, static scan only"
    routes_found = bool(authorization and callback)
    return {
        "status": "ok" if routes_found else "error",
        "authorization_route": authorization,
        "callback_route": callback,
        "routes_found": routes_found,
        "router_prefix": scan.get("router_prefix"),
        "google_routes": [r for r in scan.get("routes", []) if "google" in r["path"]],
        "static_scan": {"file": scan.get("source_file"), "ok": scan.get("ok")},
        "live_check": live,
        "notes": notes + ["read-only: routes are inspected, never changed"],
    }
