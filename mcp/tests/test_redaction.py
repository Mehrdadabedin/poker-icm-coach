"""The redaction layer: the guarantee that a credential cannot be printed."""
from __future__ import annotations

import pytest

from config import NON_SECRET_READABLE
from conftest import SECRET_SENTINEL
from redaction import REDACTED, assert_no_secret_leak, redact_tree, scrub_text


def test_secret_value_from_environment_is_scrubbed(monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", SECRET_SENTINEL)
    assert SECRET_SENTINEL not in scrub_text(f"secret was {SECRET_SENTINEL} here")
    assert REDACTED in scrub_text(SECRET_SENTINEL)


def test_nested_structures_are_scrubbed(monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", SECRET_SENTINEL)
    payload = {"a": [{"b": SECRET_SENTINEL}, "plain"], "c": 1}
    cleaned = redact_tree(payload)
    assert cleaned == {"a": [{"b": REDACTED}, "plain"], "c": 1}


@pytest.mark.parametrize(
    "text",
    [
        "https://x/cb?code=abc123&state=xyz",
        "https://oauth2.googleapis.com/token?client_secret=abc123",
        "GOCSPX-abcdefghijklmnop",
        "ya29.a0AfH6SMBexample",
        "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signaturepart",
    ],
)
def test_well_known_credential_shapes_are_scrubbed(text):
    assert "abc123" not in scrub_text(text)
    assert REDACTED in scrub_text(text)


def test_no_leak_helper_raises(monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", SECRET_SENTINEL)
    with pytest.raises(AssertionError):
        assert_no_secret_leak(f"leaked {SECRET_SENTINEL}")


def test_only_known_public_names_are_readable():
    """The readable allowlist must not contain a credential variable."""
    for name in NON_SECRET_READABLE:
        assert "SECRET" not in name
        assert "PASSWORD" not in name
        assert not name.endswith("_TOKEN")


def test_reading_a_secret_value_from_the_env_file_is_refused():
    from config import read_backend_env_value

    with pytest.raises(ValueError):
        read_backend_env_value("GOOGLE_CLIENT_SECRET")
