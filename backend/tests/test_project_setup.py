"""Project setup audit tests (Atomic Part 001)."""
from __future__ import annotations

from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]

REQUIRED_DIRS = [
    "backend/app", "backend/app/api", "backend/app/core", "backend/app/models",
    "backend/app/schemas", "backend/app/services", "backend/app/game",
    "backend/app/poker", "backend/app/ai", "backend/app/strategy",
    "backend/app/icm", "backend/app/equity", "backend/app/tournament",
    "backend/app/database", "backend/tests", "frontend/src/components",
    "frontend/src/pages", "frontend/src/hooks", "frontend/src/services",
    "frontend/src/models", "frontend/src/state", "frontend/src/styles",
    "frontend/tests", "plans", "docs", "scripts",
]


def test_required_directories_exist() -> None:
    for rel in REQUIRED_DIRS:
        assert (ROOT / rel).is_dir(), f"missing directory: {rel}"


def test_plan_files_have_frontmatter() -> None:
    plans = sorted((ROOT / "plans").glob("*.md"))
    assert len(plans) >= 36, "expected at least 36 atomic plan files"
    for plan in plans:
        text = plan.read_text()
        assert text.startswith("---\n"), f"{plan.name} missing frontmatter"
        assert "id:" in text.split("---")[1], f"{plan.name} missing id"
        assert "status:" in text.split("---")[1], f"{plan.name} missing status"
        assert "depends_on:" in text.split("---")[1], f"{plan.name} missing depends_on"


def test_progress_md_exists() -> None:
    progress = ROOT / "progress.md"
    assert progress.is_file()
    text = progress.read_text()
    assert "| ID | Task | Phase | Status | Tests | Notes |" in text


def test_gitignore_rules() -> None:
    text = (ROOT / ".gitignore").read_text()
    for needle in [".env", "node_modules", "__pycache__", ".venv"]:
        assert needle in text, f".gitignore missing {needle}"


def test_env_example_present() -> None:
    text = (ROOT / ".env.example").read_text()
    assert "DATABASE_URL=" in text
    assert "VITE_API_URL=" in text


def test_backend_pyproject() -> None:
    text = (ROOT / "backend" / "pyproject.toml").read_text()
    assert "fastapi" in text
    assert "pytest" in text


def test_docker_compose_services() -> None:
    text = (ROOT / "docker-compose.yml").read_text()
    for service in ["postgres:", "backend:", "frontend:"]:
        assert service in text, f"compose missing {service}"


def _ignored(parts: tuple[str, ...]) -> bool:
    return any(p in {".venv", ".venv-rooted", "node_modules", ".git", "__pycache__", "dist"} for p in parts)


@pytest.mark.parametrize("extension", ["py"])
def test_code_files_under_200_lines(extension: str) -> None:
    roots = [ROOT / "backend", ROOT / "scripts", ROOT / "frontend", ROOT / "e2e"]
    for root in roots:
        if not root.exists():
            continue
        for path in root.rglob(f"*.{extension}"):
            if _ignored(path.relative_to(root).parts):
                continue
            lines = path.read_text().splitlines()
            assert len(lines) <= 200, f"{path} has {len(lines)} lines (>200)"


def test_settings_module_importable() -> None:
    import sys

    sys.path.insert(0, str(ROOT / "backend"))
    from app.core.config import Settings  # noqa: PLC0415

    s = Settings()
    assert s.starting_stack == 45_000
    assert s.starting_big_blind == 100
