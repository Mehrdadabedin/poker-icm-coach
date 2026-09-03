"""Backend test configuration."""
from __future__ import annotations

import pytest

from app.core.config import settings


@pytest.fixture(autouse=True)
def _disable_history_files_for_tests() -> None:
    """Keep the test suite hermetic: no JSONL history files on disk.

    A dedicated persistence test re-enables file writes with a tmp dir.
    """
    settings.history_dir = ""
    yield
