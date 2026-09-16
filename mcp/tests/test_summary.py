"""The combined report: status decision and no-mutation guarantee."""
from __future__ import annotations

from conftest import SECRET_SENTINEL
from diagnostics.summary import decide_status, diagnose_google_oauth

ROUTES_OK = {"routes_found": True}
ROUTES_MISSING = {"routes_found": False}
ENV_OK = {"configured": True, "missing": []}
ENV_MISSING = {"configured": False, "missing": ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]}
BACKEND_OK = {"backend_reachable": True, "providers": {"google": True, "google_missing": []}}
BACKEND_DOWN = {"backend_reachable": False, "providers": {"available": False}}
BACKEND_NO_GOOGLE = {
    "backend_reachable": True,
    "providers": {"google": False, "google_missing": ["GOOGLE_CLIENT_ID"]},
}


def test_status_matrix():
    assert decide_status(ROUTES_MISSING, ENV_OK, BACKEND_OK)[0] == "configuration_error"
    assert decide_status(ROUTES_OK, ENV_MISSING, BACKEND_OK)[0] == "configuration_error"
    assert decide_status(ROUTES_OK, ENV_OK, BACKEND_DOWN)[0] == "diagnostic"
    assert decide_status(ROUTES_OK, ENV_OK, BACKEND_NO_GOOGLE)[0] == "configuration_error"
    assert decide_status(ROUTES_OK, ENV_OK, BACKEND_OK)[0] == "healthy"


def test_missing_credentials_are_named_in_the_findings():
    status, findings = decide_status(ROUTES_OK, ENV_MISSING, BACKEND_OK)
    assert status == "configuration_error"
    assert "GOOGLE_CLIENT_ID" in findings[0]


async def test_report_without_credentials_is_a_configuration_error(clean_env, isolated_env_file, healthy_backend):
    report = await diagnose_google_oauth()
    assert report["overall_status"] == "configuration_error"
    assert report["mutations_performed"] == []
    assert report["read_only"] is True
    assert set(report) >= {"backend", "oauth_routes", "environment", "callback", "cors", "cookies"}


async def test_report_with_credentials_and_a_healthy_backend(clean_env, isolated_env_file, healthy_backend):
    clean_env.setenv("GOOGLE_CLIENT_ID", "public-client-id")
    clean_env.setenv("GOOGLE_CLIENT_SECRET", SECRET_SENTINEL)
    report = await diagnose_google_oauth("http://127.0.0.1:8000")
    assert report["overall_status"] == "healthy"
    assert report["backend"]["providers"]["google"] is True


async def test_report_marks_an_unreachable_backend_as_diagnostic(clean_env, isolated_env_file, unreachable_backend):
    clean_env.setenv("GOOGLE_CLIENT_ID", "public-client-id")
    clean_env.setenv("GOOGLE_CLIENT_SECRET", SECRET_SENTINEL)
    report = await diagnose_google_oauth()
    assert report["overall_status"] == "diagnostic"
    assert "did not answer" in report["findings"][0]


async def test_include_production_can_be_turned_off(clean_env, isolated_env_file, healthy_backend):
    report = await diagnose_google_oauth(include_production=False)
    assert "environments" not in report["callback"]


async def test_summary_scope_states_it_only_diagnoses(clean_env, isolated_env_file, healthy_backend):
    report = await diagnose_google_oauth()
    assert "no route, credential, redirect URI, cookie or CORS setting is changed" in report["scope"]
