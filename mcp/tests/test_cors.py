"""CORS inspection: origin list, credential flag, degraded inputs."""
from __future__ import annotations

from diagnostics.cors import check_cors_configuration


def test_defaults_come_from_the_settings_module(clean_env, isolated_env_file):
    report = check_cors_configuration()
    assert report["origins_source"] == "default in app/core/config.py"
    assert "http://localhost:5173" in report["configured_origins"]
    assert report["frontend_production_origin_allowed"] is True
    assert report["wildcard_origin"] is False
    assert report["read_only"] is True


def test_process_env_overrides_the_list(clean_env, isolated_env_file):
    clean_env.setenv("CORS_ORIGINS", "https://a.example, https://b.example")
    report = check_cors_configuration()
    assert report["configured_origins"] == ["https://a.example", "https://b.example"]
    assert report["origins_source"] == "process environment"


def test_env_file_is_used_when_the_process_has_none(clean_env, isolated_env_file):
    backend_env, _ = isolated_env_file
    backend_env.write_text("CORS_ORIGINS=https://file.example\n")
    report = check_cors_configuration()
    assert report["configured_origins"] == ["https://file.example"]
    assert report["origins_source"] == "backend/.env"


def test_empty_list_is_reported_as_empty(clean_env, isolated_env_file):
    clean_env.setenv("CORS_ORIGINS", "   ")
    report = check_cors_configuration()
    assert report["configured_origins"] == []
    assert report["origin_count"] == 0
    assert report["frontend_production_origin_allowed"] is False


def test_credentials_flag_is_unset_in_this_app(clean_env, isolated_env_file):
    report = check_cors_configuration()
    assert report["allow_credentials"] == "not set (framework default)"
    assert any("bearer token" in note for note in report["notes"])


def test_malformed_middleware_source_degrades_without_raising(tmp_path, monkeypatch, clean_env, isolated_env_file):
    import diagnostics.cors as cors_module

    broken = tmp_path / "main.py"
    broken.write_text("app = FastAPI()\n")
    monkeypatch.setattr(cors_module, "MAIN_MODULE", broken)
    report = check_cors_configuration()
    assert report["allow_credentials"] == "unknown"
    assert report["middleware_source"] is None


def test_wildcard_origin_is_flagged(clean_env, isolated_env_file):
    clean_env.setenv("CORS_ORIGINS", "*")
    report = check_cors_configuration()
    assert report["wildcard_origin"] is True
