"""The MCP surface itself: inventory, callability, and the leak guarantee."""
from __future__ import annotations

import json

import pytest
from mcp.server.mcpserver import MCPServer

from conftest import SECRET_SENTINEL, result_text
from planned_tools import planned_tools
from server import SERVER_NAME, VERSION, build_server

EXPECTED_TOOLS = {
    "check_backend_health",
    "check_oauth_routes",
    "check_google_oauth_environment",
    "check_google_callback_configuration",
    "check_cors_configuration",
    "check_cookie_configuration",
    "diagnose_google_oauth",
    "list_planned_tools",
}
FORBIDDEN_FRAGMENTS = ("execute", "shell", "command", "subprocess", "read_any", "write", "rm_", "eval")


async def test_server_identity_and_inventory():
    server = build_server()
    assert SERVER_NAME == "icm-master-mcp"
    assert VERSION == "0.1.0"
    tools = await server.list_tools()
    assert {tool.name for tool in tools} == EXPECTED_TOOLS
    assert all(tool.description for tool in tools)


async def test_no_tool_can_run_a_command_or_touch_arbitrary_files():
    server = build_server()
    for tool in await server.list_tools():
        lowered = tool.name.lower()
        assert not any(fragment in lowered for fragment in FORBIDDEN_FRAGMENTS), lowered
        assert tool.annotations is None or not getattr(tool.annotations, "destructiveHint", False)


async def test_every_tool_answers_with_structured_content(clean_env, isolated_env_file, healthy_backend):
    server = build_server()
    for name in sorted(EXPECTED_TOOLS):
        result = await server.call_tool(name, {})
        text = result_text(result)
        assert text.strip(), f"{name} returned nothing"
        payload = json.loads(text)[0]
        assert isinstance(json.loads(payload), dict), f"{name} is not structured"
        assert not result.is_error, f"{name} reported an error"


async def test_no_tool_output_can_contain_the_client_secret(
    clean_env, isolated_env_file, healthy_backend
):
    clean_env.setenv("GOOGLE_CLIENT_ID", "public-client-id")
    clean_env.setenv("GOOGLE_CLIENT_SECRET", SECRET_SENTINEL)
    server = build_server()
    for name in sorted(EXPECTED_TOOLS):
        text = result_text(await server.call_tool(name, {}))
        assert SECRET_SENTINEL not in text, f"{name} leaked the client secret"
        assert "GOCSPX-" not in text


async def test_planned_tools_are_documented_but_not_callable(clean_env, isolated_env_file):
    catalogue = planned_tools()
    assert catalogue["implemented"] is False
    assert catalogue["status"] == "planned"
    assert catalogue["tool_count"] == 15
    names = [tool["name"] for group in catalogue["groups"].values() for tool in group["tools"]]
    assert "calculate_icm" in names
    assert not (set(names) & EXPECTED_TOOLS)
    server = build_server()
    for name in names:
        with pytest.raises(Exception):
            await server.call_tool(name, {})


async def test_list_planned_tools_tool_marks_everything_unimplemented(clean_env, isolated_env_file):
    server = build_server()
    result = await server.call_tool("list_planned_tools", {})
    payload = json.loads(result_text(result))[0]
    assert "FUTURE" in payload
    assert "no stub" in payload.lower() or "No stub" in payload


def test_tool_modules_only_read():
    """A cheap guard: no write call in the tool or diagnostic sources."""
    from pathlib import Path

    root = Path(__file__).resolve().parents[1]
    offenders = []
    for path in list(root.glob("*.py")) + list((root / "diagnostics").glob("*.py")) + list(
        (root / "tools").glob("*.py")
    ):
        text = path.read_text()
        for needle in ("subprocess", "os.system", "shutil.rmtree", "open(", "write_text", "unlink"):
            if needle in text and path.name not in {"planned_tools.py"}:
                offenders.append(f"{path.name}:{needle}")
    assert offenders == []
