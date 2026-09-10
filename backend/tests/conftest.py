"""Backend test configuration."""
from __future__ import annotations

import pytest

from app.core.config import settings
from app.services.auth import auth_store
from app.services.user_registry import auth_registry


@pytest.fixture(autouse=True)
def _disable_runtime_files_for_tests() -> None:
    """Keep the test suite hermetic: no history/users JSONL on disk.

    Both the hand-history dir and the auth users file are switched to blank so
    none of the suite writes to the repository. Registry/token stores still work
    fully in-memory for isolation tests.
    """
    settings.history_dir = ""
    settings.auth_users_file = ""
    settings.auth_sessions_file = ""
    auth_registry.bind_path("")
    auth_store.bind_path("")
    yield
