"""Player profiles (plan 095): only the owner reads or changes one, and only
real names and an adult birthday are taken.

Memory storage, like the rest of the suite. test_profiles_db.py runs the store
on PostgreSQL.
"""
from __future__ import annotations

from datetime import UTC, date, datetime

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.profile_schemas import age_on
from app.services import profiles
from tests.api_helpers import login_client

TODAY = datetime.now(UTC).date()


def _body(**changes: object) -> dict:
    body: dict[str, object] = {"firstName": "Mehrdad", "lastName": "Abedin",
                               "displayName": "Mehrdad A.", "birthday": "1980-05-14",
                               "gender": "man"}
    body.update(changes)
    return body


@pytest.fixture(autouse=True)
def fresh_store() -> None:
    profiles.bind_profiles(None, False)


def test_no_profile_until_one_is_saved() -> None:
    assert login_client("ProfileNone").get("/api/profile").status_code == 404


def test_save_and_read_back_with_spaces_tidied() -> None:
    client = login_client("ProfileSave")
    saved = client.put("/api/profile", json=_body(firstName="  José   María ",
                                                  lastName="Ñúñez O'Neil-Smith"))
    assert saved.status_code == 200, saved.text
    expected = {"firstName": "José María", "lastName": "Ñúñez O'Neil-Smith",
                "displayName": "Mehrdad A.", "birthday": "1980-05-14", "gender": "man",
                "genderText": None}
    assert saved.json() == expected
    assert client.get("/api/profile").json() == expected


def test_a_second_save_replaces_the_first() -> None:
    client = login_client("ProfileTwice")
    client.put("/api/profile", json=_body())
    client.put("/api/profile", json=_body(displayName="Shark 7", gender="prefer_not_to_say"))
    got = client.get("/api/profile").json()
    assert (got["displayName"], got["gender"]) == ("Shark 7", "prefer_not_to_say")


def test_a_player_never_sees_another_players_profile() -> None:
    login_client("ProfileOwner").put("/api/profile", json=_body())
    assert login_client("ProfileOther").get("/api/profile").status_code == 404


def test_self_described_gender_keeps_its_text_and_others_drop_it() -> None:
    client = login_client("ProfileGender")
    kept = client.put("/api/profile", json=_body(gender="self_described", genderText=" agender "))
    assert kept.json()["genderText"] == "agender"
    dropped = client.put("/api/profile", json=_body(gender="woman", genderText="ignored"))
    assert dropped.json()["genderText"] is None


@pytest.mark.parametrize(("changes", "why"), [
    ({"birthday": date(TODAY.year - 10, 1, 1).isoformat()}, "under 18"),
    ({"birthday": date(TODAY.year + 1, 1, 1).isoformat()}, "in the future"),
    ({"birthday": "1890-01-01"}, "before 1900"),
    ({"birthday": "14/05/1980"}, "not a date"),
    ({"firstName": "   "}, "empty first name"),
    ({"firstName": "<script>"}, "markup"),
    ({"lastName": "Abedin2"}, "digit in a last name"),
    ({"lastName": "-Abedin"}, "starts with punctuation"),
    ({"firstName": "A" * 41}, "first name too long"),
    ({"displayName": "M"}, "display name too short"),
    ({"displayName": "M" * 25}, "display name too long"),
    ({"gender": "other"}, "unknown gender"),
    ({"gender": "self_described"}, "self-described without text"),
    ({"owner": "SomeoneElse"}, "extra field"),
])
def test_bad_input_is_refused_and_nothing_is_saved(changes: dict, why: str) -> None:
    client = login_client("ProfileBad")
    assert client.put("/api/profile", json=_body(**changes)).status_code == 422, why
    assert client.get("/api/profile").status_code == 404, why


def test_signed_out_callers_get_401() -> None:
    anonymous = TestClient(app)
    assert anonymous.get("/api/profile").status_code == 401
    assert anonymous.put("/api/profile", json=_body()).status_code == 401


@pytest.mark.parametrize(("birthday", "today", "age"), [
    (date(2008, 10, 23), date(2026, 10, 23), 18),  # the 18th birthday itself
    (date(2008, 10, 24), date(2026, 10, 23), 17),  # one day short
    (date(2008, 2, 29), date(2026, 2, 28), 17),    # leap-day birthday, not yet
    (date(2008, 2, 29), date(2026, 3, 1), 18),
])
def test_age_counts_whole_years(birthday: date, today: date, age: int) -> None:
    assert age_on(birthday, today) == age
