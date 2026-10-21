"""Player portraits (plan 094): upload, Admin review, and what the table sees.

Memory storage, like the rest of the suite. test_portraits_db.py runs the same
rules on PostgreSQL.
"""
from __future__ import annotations

import base64

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services import portraits
from tests.api_helpers import login_client

ADMIN = "PortraitBoss"
JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 64
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
WEBP = b"RIFF\x00\x00\x00\x00WEBPVP8 " + b"\x00" * 64


def _body(image: bytes, content_type: str = "image/jpeg") -> dict:
    return {"contentType": content_type, "data": base64.b64encode(image).decode()}


@pytest.fixture(autouse=True)
def fresh_store() -> None:
    portraits.bind_portraits(None, False)


@pytest.fixture()
def admin(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setattr(settings, "admin_usernames", ADMIN)
    return login_client(ADMIN)


def test_no_photo_until_one_is_uploaded() -> None:
    client = login_client("PortraitNone")
    assert client.get("/api/portrait").json() == {"status": "none", "image": None}


@pytest.mark.parametrize(("image", "content_type"), [(JPEG, "image/jpeg"), (PNG, "image/png"),
                                                     (WEBP, "image/webp")])
def test_an_upload_waits_for_review_and_the_owner_sees_it(image: bytes, content_type: str) -> None:
    client = login_client("PortraitUp")
    sent = client.put("/api/portrait", json=_body(image, content_type))
    assert sent.status_code == 200, sent.text
    assert sent.json()["status"] == "pending"
    assert client.get("/api/portrait").json() == {
        "status": "pending", "image": f"data:{content_type};base64,{base64.b64encode(image).decode()}"}


@pytest.mark.parametrize(("body", "why"), [
    ({"contentType": "image/svg+xml", "data": base64.b64encode(b"<svg/>").decode()}, "type"),
    (_body(PNG, "image/jpeg"), "not a JPEG"),
    ({"contentType": "image/png", "data": "not base64!"}, "base64"),
    (_body(b"\xff\xd8\xff" + b"\x00" * 200_000), "too large"),
])
def test_only_real_small_pictures_are_taken(body: dict, why: str) -> None:
    client = login_client("PortraitBad")
    assert client.put("/api/portrait", json=body).status_code == 422, why
    assert client.get("/api/portrait").json()["status"] == "none"


def test_the_admin_approves_and_a_new_upload_goes_back_to_review(admin: TestClient) -> None:
    player = login_client("PortraitAsk")
    player.put("/api/portrait", json=_body(JPEG))
    waiting = admin.get("/api/admin/portraits").json()["portraits"]
    assert [p["username"] for p in waiting] == ["PortraitAsk"]
    assert waiting[0]["image"].startswith("data:image/jpeg;base64,")

    approved = admin.post("/api/admin/portraits/PortraitAsk/approve")
    assert approved.json() == {"username": "PortraitAsk", "status": "approved"}
    assert player.get("/api/portrait").json()["status"] == "approved"
    assert admin.get("/api/admin/portraits").json()["portraits"] == []

    player.put("/api/portrait", json=_body(PNG, "image/png"))
    assert player.get("/api/portrait").json()["status"] == "pending"


def test_the_admin_rejects(admin: TestClient) -> None:
    player = login_client("PortraitNo")
    player.put("/api/portrait", json=_body(JPEG))
    assert admin.post("/api/admin/portraits/PortraitNo/reject").json()["status"] == "rejected"
    assert player.get("/api/portrait").json()["status"] == "rejected"


def test_review_needs_an_admin_and_an_existing_photo(admin: TestClient) -> None:
    player = login_client("PortraitSneaky")
    player.put("/api/portrait", json=_body(JPEG))
    assert player.get("/api/admin/portraits").status_code == 403
    assert player.post("/api/admin/portraits/PortraitSneaky/approve").status_code == 403
    assert TestClient(app).get("/api/admin/portraits").status_code == 401
    assert admin.post("/api/admin/portraits/NobodyHere/approve").status_code == 404
    assert admin.post("/api/admin/portraits/PortraitSneaky/publish").status_code == 422


def test_a_player_reaches_only_their_own_photo() -> None:
    owner, other = login_client("PortraitMine"), login_client("PortraitTheirs")
    owner.put("/api/portrait", json=_body(JPEG))
    assert other.get("/api/portrait").json()["status"] == "none"
    assert TestClient(app).get("/api/portrait").status_code == 401


def test_removing_the_photo() -> None:
    client = login_client("PortraitGone")
    client.put("/api/portrait", json=_body(JPEG))
    assert client.delete("/api/portrait").json() == {"status": "none", "image": None}
    assert client.get("/api/portrait").json()["status"] == "none"
