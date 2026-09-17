"""Exposes the future tool catalogue as read-only documentation."""
from __future__ import annotations

from planned_tools import planned_tools
from redaction import redact_tree


def register(server) -> None:
    @server.tool(
        name="list_planned_tools",
        description="Read-only: the future ICM, tournament, coach and database tools. "
        "Documentation only, none of them is implemented in this phase.",
    )
    async def list_planned_tools_tool() -> dict:
        return redact_tree(planned_tools())
