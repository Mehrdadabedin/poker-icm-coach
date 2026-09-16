"""MCP tool definitions. Thin wrappers over the diagnostics package.

Every result is scrubbed on the way out, so a diagnostic that accidentally read
a secret still cannot publish one.
"""
from __future__ import annotations

from diagnostics.health import check_backend_health
from diagnostics.oauth_env import check_google_oauth_environment
from diagnostics.oauth_routes import check_oauth_routes
from diagnostics.callback import check_google_callback_configuration
from diagnostics.cookies import check_cookie_configuration
from diagnostics.cors import check_cors_configuration
from diagnostics.summary import diagnose_google_oauth
from redaction import redact_tree


def register(server) -> None:
    """Attach every read-only diagnostic tool to the MCP server."""

    @server.tool(
        name="check_backend_health",
        description="Read-only: is the ICM Master API reachable, and what does it "
        "report about sign-in providers?",
    )
    async def check_backend_health_tool(base_url: str | None = None) -> dict:
        return redact_tree(await check_backend_health(base_url))

    @server.tool(
        name="check_oauth_routes",
        description="Read-only: do the Google authorize and callback routes exist in "
        "the FastAPI router and in the running app?",
    )
    async def check_oauth_routes_tool(base_url: str | None = None) -> dict:
        return redact_tree(await check_oauth_routes(base_url))

    @server.tool(
        name="check_google_oauth_environment",
        description="Read-only: are GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET set? "
        "Reports presence by name and never a value.",
    )
    async def check_google_oauth_environment_tool(include_process_env: bool = True) -> dict:
        return redact_tree(check_google_oauth_environment(include_process_env))

    @server.tool(
        name="check_google_callback_configuration",
        description="Read-only: which redirect URI the backend expects, and where that "
        "value comes from.",
    )
    async def check_google_callback_configuration_tool(base_url: str | None = None) -> dict:
        return redact_tree(check_google_callback_configuration(base_url))

    @server.tool(
        name="check_cors_configuration",
        description="Read-only: configured CORS origins, credential flag and the "
        "frontend/backend origin relation.",
    )
    async def check_cors_configuration_tool() -> dict:
        return redact_tree(check_cors_configuration())

    @server.tool(
        name="check_cookie_configuration",
        description="Read-only: cookie attributes if the app uses a cookie session, "
        "otherwise the token transport it uses instead.",
    )
    async def check_cookie_configuration_tool() -> dict:
        return redact_tree(check_cookie_configuration())

    @server.tool(
        name="diagnose_google_oauth",
        description="Read-only: one structured report over health, routes, environment, "
        "callback, CORS and cookies. Diagnoses, never changes anything.",
    )
    async def diagnose_google_oauth_tool(
        base_url: str | None = None, include_production: bool = True
    ) -> dict:
        return redact_tree(await diagnose_google_oauth(base_url, include_production))
