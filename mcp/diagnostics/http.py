"""The only place this server performs I/O against the application.

Read-only GETs, no credentials, no followed redirects, short timeout. Tests
replace `get_json` to avoid touching the network.
"""
from __future__ import annotations

import time

import httpx

from config import ALLOWED_PATHS, HTTP_TIMEOUT_SECONDS, host_allowed
from redaction import scrub_text


async def get_json(base_url: str, path: str) -> dict:
    """GET one allowlisted read-only endpoint and describe the outcome."""
    if path not in ALLOWED_PATHS:
        return {"ok": False, "error": f"path is not in the read allowlist: {path}"}
    if not host_allowed(base_url):
        return {"ok": False, "error": "host is not in the probe allowlist"}
    url = f"{base_url.rstrip('/')}{path}"
    started = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_SECONDS) as client:
            response = await client.get(url, headers={"accept": "application/json"})
    except httpx.HTTPError as exc:
        return {
            "ok": False,
            "url": url,
            "error": f"{type(exc).__name__}: {scrub_text(str(exc))}",
            "latency_ms": round((time.perf_counter() - started) * 1000, 1),
        }
    latency = round((time.perf_counter() - started) * 1000, 1)
    payload: dict | None = None
    try:
        body = response.json()
        payload = body if isinstance(body, dict) else {"value": body}
    except ValueError:
        payload = None
    return {
        "ok": response.is_success and payload is not None,
        "url": url,
        "http_status": response.status_code,
        "latency_ms": latency,
        "json": payload,
    }
