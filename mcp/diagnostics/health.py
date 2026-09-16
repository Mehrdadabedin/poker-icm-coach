"""Backend health. Read-only GETs to /api/health and /api/auth/providers."""
from __future__ import annotations

from config import HEALTH_PATH, PROVIDERS_PATH, resolve_base_url
from diagnostics.http import get_json


def _provider_facts(payload: dict | None) -> dict:
    """Public provider flags. `missing` carries variable NAMES, never values."""
    if not isinstance(payload, dict):
        return {"available": False, "reason": "providers endpoint did not return JSON"}
    return {
        "available": True,
        "google": payload.get("google"),
        "apple": payload.get("apple"),
        "phone": payload.get("phone"),
        "google_missing": payload.get("google_missing", []),
    }


async def check_backend_health(base_url: str | None = None) -> dict:
    """Is the API reachable, and what does it say about Google sign-in?"""
    url, error = resolve_base_url(base_url)
    if error:
        return {
            "status": "error",
            "backend_reachable": False,
            "details": error,
            "read_only": True,
        }
    health = await get_json(url, HEALTH_PATH)
    reachable = bool(health.get("ok"))
    result = {
        "status": "ok" if reachable else "error",
        "backend_reachable": reachable,
        "base_url": url,
        "http_status": health.get("http_status"),
        "latency_ms": health.get("latency_ms"),
        "health": health.get("json"),
        "details": (
            "GET /api/health answered"
            if reachable
            else f"GET /api/health failed: {health.get('error') or health.get('http_status')}"
        ),
        "read_only": True,
    }
    if not reachable:
        result["providers"] = {"available": False, "reason": "backend unreachable"}
        return result
    providers = await get_json(url, PROVIDERS_PATH)
    result["providers"] = _provider_facts(providers.get("json"))
    return result
