"""Last-line defence against leaking a credential from a diagnostic result.

The diagnostics are written to never read a secret value. This module exists so
that a mistake in one of them cannot put a credential on the wire: every tool
result passes through `redact_tree` before it is returned.
"""
from __future__ import annotations

import os
import re

from config import SECRET_SETTING_NAMES

REDACTED = "[redacted]"

# Query parameters and headers that carry credentials or proof of one.
_SENSITIVE_QUERY = re.compile(
    r"(?i)\b(code|access_token|refresh_token|id_token|client_secret|state)=([^&\s]+)"
)
# Google credential shapes and JWTs.
_SHAPES = (
    re.compile(r"GOCSPX-[A-Za-z0-9_-]+"),
    re.compile(r"ya29\.[A-Za-z0-9._-]+"),
    re.compile(r"eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}"),
)


def _secret_values() -> tuple[str, ...]:
    """Values that must never be printed, gathered only to be scrubbed.

    Only names classified as secret are considered, and only values that are
    long enough to be a real credential.
    """
    values = []
    for name in SECRET_SETTING_NAMES:
        value = os.environ.get(name, "")
        if len(value) >= 8:
            values.append(value)
    return tuple(values)


def scrub_text(text: str) -> str:
    for value in _secret_values():
        text = text.replace(value, REDACTED)
    text = _SENSITIVE_QUERY.sub(lambda m: f"{m.group(1)}={REDACTED}", text)
    for pattern in _SHAPES:
        text = pattern.sub(REDACTED, text)
    return text


def redact_tree(value):
    """Recursively scrubbed copy. Keys are kept, values are made safe."""
    if isinstance(value, str):
        return scrub_text(value)
    if isinstance(value, dict):
        return {k: redact_tree(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [redact_tree(v) for v in value]
    return value


def assert_no_secret_leak(text: str) -> None:
    """Raise if any secret-looking value survived, used by the tests."""
    for value in _secret_values():
        if value in text:
            raise AssertionError("a secret value reached the output")


__all__ = [
    "REDACTED",
    "assert_no_secret_leak",
    "redact_tree",
    "scrub_text",
]
