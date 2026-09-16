"""Presence of the Google OAuth variables. Names only: never a value.

Two sources are reported separately (the process environment of this MCP
server and backend/.env), because "the variable exists somewhere" and "the API
process has it" are different answers, and only the second one makes sign-in
work.
"""
from __future__ import annotations

import os

from config import backend_env_keys

REQUIRED = ("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET")
OPTIONAL = ("GOOGLE_REDIRECT_URI",)
REPORTED = REQUIRED + OPTIONAL


def check_google_oauth_environment(include_process_env: bool = True) -> dict:
    """Which Google variables are set, by name. Values are never read out."""
    file_names = backend_env_keys()
    process_env = os.environ if include_process_env else {}
    sources = {"process_env": [], "backend_env_file": sorted(file_names)}
    variables: dict[str, str] = {}
    for name in REPORTED:
        in_process = bool(str(process_env.get(name, "")).strip())
        in_file = name in file_names
        if in_process:
            sources["process_env"].append(name)
        variables[name] = "present" if (in_process or in_file) else "missing"
    sources["process_env"].sort()
    missing = [n for n in REQUIRED if variables[n] == "missing"]
    configured = not missing
    notes = [
        "presence only: no variable value is read into this result",
        "the API process is the source that matters; a variable in this shell "
        "is not visible to the deployed service",
    ]
    if not configured:
        notes.append(
            "google sign-in stays disabled until the API process has both "
            f"{' and '.join(missing)}"
        )
    if not any(v == "present" for v in variables.values()):
        notes.append(
            "nothing was found in this server process, which is spawned with a "
            "restricted environment: pass the variables through the client's "
            "server env, or set them in backend/.env"
        )
    if variables["GOOGLE_REDIRECT_URI"] == "present":
        notes.append("GOOGLE_REDIRECT_URI overrides the per-request callback URL")
    return {
        "variables": variables,
        "required": list(REQUIRED),
        "optional": list(OPTIONAL),
        "missing": missing,
        "configured": configured,
        "sources": sources,
        "values_exposed": False,
        "read_only": True,
        "notes": notes,
    }
