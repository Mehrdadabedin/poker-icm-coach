"""Credential presence, by name, with the leak guarantee."""
from __future__ import annotations

import json

from conftest import SECRET_SENTINEL
from diagnostics.oauth_env import check_google_oauth_environment


def test_both_variables_missing(clean_env, isolated_env_file):
    report = check_google_oauth_environment()
    assert report["configured"] is False
    assert report["missing"] == ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]
    assert report["variables"]["GOOGLE_CLIENT_ID"] == "missing"
    assert report["values_exposed"] is False


def test_both_variables_present(clean_env, isolated_env_file):
    clean_env.setenv("GOOGLE_CLIENT_ID", "public-client-id.apps.googleusercontent.com")
    clean_env.setenv("GOOGLE_CLIENT_SECRET", SECRET_SENTINEL)
    report = check_google_oauth_environment()
    assert report["configured"] is True
    assert report["missing"] == []
    assert report["variables"]["GOOGLE_CLIENT_SECRET"] == "present"


def test_only_one_variable_present_stays_disabled(clean_env, isolated_env_file):
    clean_env.setenv("GOOGLE_CLIENT_ID", "public-client-id")
    report = check_google_oauth_environment()
    assert report["configured"] is False
    assert report["missing"] == ["GOOGLE_CLIENT_SECRET"]


def test_values_from_the_env_file_are_not_read(clean_env, isolated_env_file):
    backend_env, _ = isolated_env_file
    backend_env.write_text(f"GOOGLE_CLIENT_ID=from-file\nGOOGLE_CLIENT_SECRET={SECRET_SENTINEL}\n")
    report = check_google_oauth_environment()
    assert report["configured"] is True
    assert "backend_env_file" in report["sources"]
    assert SECRET_SENTINEL not in json.dumps(report)
    assert "from-file" not in json.dumps(report)


def test_optional_redirect_uri_is_reported_when_set(clean_env, isolated_env_file):
    clean_env.setenv("GOOGLE_REDIRECT_URI", "https://backend.example/api/auth/google/callback")
    report = check_google_oauth_environment()
    assert report["variables"]["GOOGLE_REDIRECT_URI"] == "present"
    assert "GOOGLE_REDIRECT_URI" not in report["missing"]


def test_process_env_can_be_excluded(clean_env, isolated_env_file):
    clean_env.setenv("GOOGLE_CLIENT_ID", "public-client-id")
    report = check_google_oauth_environment(include_process_env=False)
    assert report["sources"]["process_env"] == []
    assert report["variables"]["GOOGLE_CLIENT_ID"] == "missing"
