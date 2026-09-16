"""One report over all the Google sign-in diagnostics. Diagnoses only."""
from __future__ import annotations

from diagnostics.callback import check_google_callback_configuration
from diagnostics.cookies import check_cookie_configuration
from diagnostics.cors import check_cors_configuration
from diagnostics.health import check_backend_health
from diagnostics.oauth_env import check_google_oauth_environment
from diagnostics.oauth_routes import check_oauth_routes


def decide_status(routes: dict, environment: dict, backend: dict) -> tuple[str, list[str]]:
    """Map the sub-reports onto one status plus the findings behind it."""
    findings: list[str] = []
    if not routes.get("routes_found"):
        findings.append("the Google authorize and/or callback route is missing")
        return "configuration_error", findings
    if not environment.get("configured"):
        findings.append(
            "the API process is missing " + ", ".join(environment.get("missing", []))
        )
        return "configuration_error", findings
    if not backend.get("backend_reachable"):
        findings.append("the backend did not answer, so its live state is unknown")
        return "diagnostic", findings
    providers = backend.get("providers") or {}
    if providers.get("google") is not True:
        findings.append(
            "the running backend reports google:false"
            + (f" and is missing {providers.get('google_missing')}" if providers.get("google_missing") else "")
        )
        return "configuration_error", findings
    findings.append("routes present, credentials present, backend advertises google:true")
    return "healthy", findings


async def diagnose_google_oauth(base_url: str | None = None, include_production: bool = True) -> dict:
    """Structured Google sign-in report. Changes nothing anywhere."""
    backend = await check_backend_health(base_url)
    routes = await check_oauth_routes(base_url)
    environment = check_google_oauth_environment()
    callback = check_google_callback_configuration(base_url)
    cors = check_cors_configuration()
    cookies = check_cookie_configuration()
    status, findings = decide_status(routes, environment, backend)
    if not include_production:
        callback = {k: v for k, v in callback.items() if k != "environments"}
    return {
        "overall_status": status,
        "findings": findings,
        "backend": backend,
        "oauth_routes": routes,
        "environment": environment,
        "callback": callback,
        "cors": cors,
        "cookies": cookies,
        "read_only": True,
        "mutations_performed": [],
        "scope": "diagnosis only: no route, credential, redirect URI, cookie or "
                 "CORS setting is changed by this tool",
    }
