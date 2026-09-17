"""The tool catalogue for later phases. Documentation, not implementation.

Nothing in this module is registered as an MCP tool. A caller cannot invoke any
of these names: they exist so the roadmap is visible from the server itself, and
so a future phase has a defined surface to implement against. The `source_hint`
of each entry names the module that already holds the logic to wrap.
"""
from __future__ import annotations

STATUS = "planned"

PLANNED_GROUPS: dict[str, dict] = {
    "icm": {
        "title": "ICM engine",
        "source_hint": "backend/app/icm/icm_engine.py",
        "tools": [
            {"name": "calculate_icm", "purpose": "ICM equities for the current stacks and payouts"},
            {"name": "calculate_equity", "purpose": "all-in equity for given ranges and board"},
            {"name": "calculate_ev", "purpose": "expected value of a decision against a range"},
            {"name": "calculate_bubble_pressure", "purpose": "bubble factor and risk premium"},
        ],
    },
    "tournament": {
        "title": "Tournament engine",
        "source_hint": "backend/app/tournament/tournament.py, blind_structure.py",
        "tools": [
            {"name": "get_tournament_state", "purpose": "stacks, blinds, level, players left"},
            {"name": "get_blind_level", "purpose": "current and next blind level with timing"},
            {"name": "get_stack_information", "purpose": "every stack in chips and big blinds"},
            {"name": "calculate_effective_stack", "purpose": "effective stack between two seats"},
        ],
    },
    "coach": {
        "title": "Coach",
        "source_hint": "backend/app/services/session_coach.py, hand_review.py",
        "tools": [
            {"name": "analyze_hand", "purpose": "review one played hand"},
            {"name": "get_correct_action", "purpose": "the action the ranges support"},
            {"name": "explain_icm_reasoning", "purpose": "the reasoning behind an ICM decision"},
            {"name": "generate_training_hand", "purpose": "a practice spot for a chosen lesson"},
        ],
    },
    "database": {
        "title": "Database",
        "source_hint": "backend/app/database/session.py, services/hand_history.py",
        "tools": [
            {"name": "get_user_session", "purpose": "session metadata for one user, no tokens"},
            {"name": "get_hand_history", "purpose": "stored hands for a user or table"},
            {"name": "get_tournament_configuration", "purpose": "the settings a tournament ran with"},
        ],
    },
}

NOT_IMPLEMENTED_NOTE = (
    "FUTURE: documented only. No stub, placeholder or fake result is registered "
    "for these names, so calling one returns an unknown-tool error."
)


def planned_tools() -> dict:
    """The catalogue, marked as planned at every level."""
    groups = {
        key: {"title": value["title"], "status": STATUS, "source_hint": value["source_hint"],
              "tools": [dict(tool, status=STATUS, implemented=False) for tool in value["tools"]]}
        for key, value in PLANNED_GROUPS.items()
    }
    return {
        "status": STATUS,
        "implemented": False,
        "groups": groups,
        "tool_count": sum(len(g["tools"]) for g in groups.values()),
        "note": NOT_IMPLEMENTED_NOTE,
        "implemented_today": "read-only diagnostics only (see the other tools)",
    }
