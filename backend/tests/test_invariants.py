"""Architectural invariants, checked by parsing the source.

Each of these was a real bug (see ARCHITECTURE.md). Docs get ignored; a red
test does not. CI runs this on every push.
"""
from __future__ import annotations

import ast
import re
from pathlib import Path

APP = Path(__file__).resolve().parents[1] / "app"
SESSION_MUTATORS = {"hero_action", "next_hand", "state", "start", "coach_advice",
                    "grade_hero"}


def _module(path: Path) -> ast.Module:
    return ast.parse(path.read_text(encoding="utf-8"), filename=str(path))


def _class(path: Path, name: str) -> ast.ClassDef:
    for node in _module(path).body:
        if isinstance(node, ast.ClassDef) and node.name == name:
            return node
    raise AssertionError(f"{name} not found in {path}")


def _is_route(func: ast.FunctionDef) -> bool:
    """True for a function decorated with @router.get/post/put/delete."""
    for decorator in func.decorator_list:
        target = decorator.func if isinstance(decorator, ast.Call) else decorator
        if (isinstance(target, ast.Attribute)
                and isinstance(target.value, ast.Name)
                and target.value.id == "router"):
            return True
    return False


def _takes_lock(method: ast.FunctionDef) -> bool:
    """True when the body is a single `with self._lock:` (or acquires it)."""
    for node in ast.walk(method):
        if isinstance(node, ast.With):
            for item in node.items:
                target = item.context_expr
                if (isinstance(target, ast.Attribute) and target.attr == "_lock"
                        and isinstance(target.value, ast.Name)
                        and target.value.id == "self"):
                    return True
    return False


def test_every_public_game_session_method_takes_the_lock() -> None:
    """ARCHITECTURE.md 1. Unlocked next_hand() calls destroyed chips."""
    session = _class(APP / "services" / "game_session.py", "GameSession")
    unlocked = [
        node.name
        for node in session.body
        if isinstance(node, ast.FunctionDef)
        and not node.name.startswith("_")
        and node.name != "phase"  # single unlocked read, documented
        and not _takes_lock(node)
    ]
    assert not unlocked, (
        f"GameSession public methods without the lock: {unlocked}. "
        "One table is reachable from REST, the websocket and a 350ms poll."
    )


def test_no_async_handler_calls_a_session_method_inline() -> None:
    """ARCHITECTURE.md 1. Inline, a session call froze every connection."""
    offenders: list[str] = []
    for path in APP.rglob("*.py"):
        for node in ast.walk(_module(path)):
            if not isinstance(node, ast.AsyncFunctionDef):
                continue
            for inner in ast.walk(node):
                if not isinstance(inner, ast.Call):
                    continue
                func = inner.func
                if (isinstance(func, ast.Attribute)
                        and func.attr in SESSION_MUTATORS
                        and isinstance(func.value, ast.Name)
                        and func.value.id == "session"):
                    parent_awaited = any(
                        isinstance(a, ast.Await) and inner in ast.walk(a)
                        for a in ast.walk(node)
                    )
                    threadpooled = any(
                        isinstance(c.func, ast.Name)
                        and c.func.id == "run_in_threadpool"
                        for c in ast.walk(node) if isinstance(c, ast.Call)
                    )
                    if not (parent_awaited and threadpooled):
                        offenders.append(f"{path.name}:{node.name} -> {func.attr}")
    assert not offenders, (
        f"session calls on the event loop: {offenders}. "
        "Wrap them in run_in_threadpool."
    )


def test_no_module_reaches_a_private_session_registry() -> None:
    """ARCHITECTURE.md 4. Tables are reached through SessionStore."""
    bare = re.compile(r"(?<!\w)_sessions\b")  # not auth_sessions_file
    offenders = [
        path.name
        for path in APP.rglob("*.py")
        if path.name != "session_store.py"
        and bare.search(path.read_text(encoding="utf-8"))
    ]
    assert not offenders, (
        f"{offenders} touch a private session registry; use session_store."
    )


def test_table_routes_require_an_authenticated_user() -> None:
    """ARCHITECTURE.md 2. A client-supplied username is never authorization."""
    offenders: list[str] = []
    for name in ("routes_game.py", "routes_meta.py"):
        path = APP / "api" / name
        for node in ast.walk(_module(path)):
            if not isinstance(node, ast.FunctionDef) or not _is_route(node):
                continue
            args = node.args
            takes_table = any(a.arg == "table_id" for a in args.args)
            requires_user = any(
                isinstance(d, ast.Call) and isinstance(d.func, ast.Name)
                and d.func.id == "Depends"
                and any(isinstance(a, ast.Name) and a.id == "require_user"
                        for a in d.args)
                for d in args.defaults
            )
            if takes_table and not requires_user:
                offenders.append(f"{name}:{node.name}")
    assert not offenders, (
        f"table routes without require_user: {offenders}"
    )


def test_the_icm_player_cap_has_one_definition() -> None:
    """ARCHITECTURE.md 3. A bound repeated is a bound that drifts."""
    engine = (APP / "icm" / "icm_engine.py").read_text(encoding="utf-8")
    assert "MAX_EXACT_ICM_PLAYERS = 9" in engine
    schemas = (APP / "schemas" / "game_schemas.py").read_text(encoding="utf-8")
    assert "MAX_TABLE_PLAYERS = MAX_EXACT_ICM_PLAYERS" in schemas, (
        "game_schemas must import the engine's cap, not repeat a literal"
    )
