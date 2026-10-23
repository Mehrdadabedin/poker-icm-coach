"""A copy of everything ICMBOT keeps about one player (plan 095).

GDPR gives players the right to a copy of their data, and the app stores ask
for it too. Only data keyed by this username is read, and never the password
hash or a login token.
"""
from __future__ import annotations

import base64
from datetime import UTC, datetime
from typing import Any

from app.core.tournament_settings import settings as tournament_settings
from app.services import history_archive, portraits, profiles
from app.services.profiles import Profile
from app.services.user_registry import auth_registry


def profile_view(profile: Profile) -> dict[str, Any]:
    return {
        "firstName": profile.first_name,
        "lastName": profile.last_name,
        "displayName": profile.display_name,
        "birthday": profile.birthday.isoformat(),
        "gender": profile.gender,
        "genderText": profile.gender_text,
    }


def account_view(username: str) -> dict[str, Any]:
    return {"username": username, "admin": auth_registry.is_admin(username),
            **auth_registry.sign_in_details(username)}


def _portrait(username: str) -> dict[str, Any] | None:
    found = portraits.store.get(username)
    if found is None:
        return None
    image = base64.b64encode(found.image).decode()
    return {"status": found.status, "image": f"data:{found.content_type};base64,{image}",
            "updatedAt": found.updated_at.isoformat()}


def export_account(username: str) -> dict[str, Any]:
    profile = profiles.store.get(username)
    tournaments = history_archive.archive.tournaments(username)
    hands = history_archive.archive.hands_by_tournament(
        username, [str(row["id"]) for row in tournaments])
    return {
        "exportedAt": datetime.now(UTC).isoformat(),
        "account": account_view(username),
        "profile": profile_view(profile) if profile else None,
        "portrait": _portrait(username),
        "settings": tournament_settings.for_user(username).to_dict(),
        "history": {"tournaments": tournaments, "hands": hands},
    }
