"""Card back preference: Blue (default) or Red, stored per user with the
other display preferences in /api/settings."""
from __future__ import annotations

from tests.api_helpers import login_client


def test_card_back_defaults_to_blue() -> None:
    client = login_client("CardBackDefault")
    assert client.get("/api/settings").json()["cardBack"] == "blue"


def test_card_back_round_trips_per_user() -> None:
    red = login_client("CardBackRed")
    other = login_client("CardBackOther")
    response = red.put("/api/settings", json={"cardBack": "red"})
    assert response.status_code == 200
    assert response.json()["cardBack"] == "red"
    assert red.get("/api/settings").json()["cardBack"] == "red"
    assert other.get("/api/settings").json()["cardBack"] == "blue"
    # a partial update of another field keeps the choice
    red.put("/api/settings", json={"showActionLabels": False})
    assert red.get("/api/settings").json()["cardBack"] == "red"


def test_card_back_outside_the_vocabulary_is_rejected() -> None:
    client = login_client("CardBackBad")
    assert client.put("/api/settings", json={"cardBack": "green"}).status_code == 422
    assert client.get("/api/settings").json()["cardBack"] == "blue"
