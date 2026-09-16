"""ICM Master MCP server (development diagnostics).

Local stdio only: no network listener, no authentication surface, no write
tool. Every tool is read-only, which is why this server is safe to run next to
a working checkout.

Run:    cd mcp && uv run python server.py
Dev UI: cd mcp && uv run mcp dev server.py
"""
from __future__ import annotations

from mcp.server.mcpserver import MCPServer

from tools import diagnostics_tools, planned

SERVER_NAME = "icm-master-mcp"
VERSION = "0.1.0"
INSTRUCTIONS = (
    "Read-only diagnostics for the ICM Master application: backend health, "
    "Google sign-in routes, credential presence by name, the expected callback "
    "URI, CORS origins and cookie/session transport. No tool changes the "
    "application, and no tool returns a credential value."
)


def build_server() -> MCPServer:
    """The server as tests and the stdio entry point both construct it."""
    server = MCPServer(name=SERVER_NAME, version=VERSION, instructions=INSTRUCTIONS)
    diagnostics_tools.register(server)
    planned.register(server)
    return server


# Module-level instance: the MCP Inspector (and other tooling) looks for an
# object named mcp, server or app in the file it is pointed at.
server = build_server()


def main() -> None:
    server.run("stdio")


if __name__ == "__main__":
    main()
