"""Repository readiness audit as an automated test (Atomic Part 036)."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_audit_script_passes() -> None:
    result = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "check_github.py")],
        capture_output=True, text=True, timeout=120,
    )
    assert result.returncode == 0, result.stdout


def test_readme_sections() -> None:
    readme = (ROOT / "README.md").read_text()
    assert "Architecture" in readme
    assert "How to run locally" in readme
    assert "How to build Android" in readme or "Android APK" in readme
    assert "Known limitations" in readme


def test_progress_tracks_all_parts() -> None:
    text = (ROOT / "progress.md").read_text()
    for pid in range(1, 38):
        assert f"| {pid:03d} |" in text, f"progress.md missing row {pid:03d}"
    for status in ("planned", "complete"):
        assert status in text
