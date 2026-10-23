"""Player profile and self-service account deletion (plan 095).

The user always comes from the bearer token; no route takes a username, so a
player can only ever read, change or delete their own data. The App Store and
Google Play both require players to delete their account inside the app.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import require_user
from app.schemas.profile_schemas import AccountDeletion, ProfileIn
from app.services import profiles
from app.services.account_erase import erase_account
from app.services.profiles import Profile
from app.services.user_registry import auth_registry

router = APIRouter(tags=["profile"])


def _view(profile: Profile) -> dict:
    return {
        "firstName": profile.first_name,
        "lastName": profile.last_name,
        "displayName": profile.display_name,
        "birthday": profile.birthday.isoformat(),
        "gender": profile.gender,
        "genderText": profile.gender_text,
    }


@router.get("/api/profile")
def my_profile(user: str = Depends(require_user)) -> dict:
    found = profiles.store.get(user)
    if found is None:
        raise HTTPException(status_code=404, detail="no profile yet")
    return _view(found)


@router.put("/api/profile")
def save_profile(body: ProfileIn, user: str = Depends(require_user)) -> dict:
    saved = profiles.store.put(Profile(
        owner=user, first_name=body.firstName, last_name=body.lastName,
        display_name=body.displayName, birthday=body.birthday, gender=body.gender,
        gender_text=body.genderText))
    return _view(saved)


@router.delete("/api/account")
def delete_my_account(body: AccountDeletion, user: str = Depends(require_user)) -> dict:
    """Delete the caller's own account and everything that belongs to it."""
    if auth_registry.is_admin(user):
        # Admins are removed by another Admin, so the last one cannot vanish.
        raise HTTPException(status_code=409, detail="an Admin account cannot delete itself")
    if auth_registry.uses_password(user):
        # 403, not 401: a 401 would make the app sign the player out.
        if not body.password or not auth_registry.verify(user, body.password):
            raise HTTPException(status_code=403, detail="the password is not correct")
    elif body.confirm != "DELETE":
        raise HTTPException(status_code=400, detail="type DELETE to confirm")
    return {"username": user, "deleted": True, **erase_account(user)}
