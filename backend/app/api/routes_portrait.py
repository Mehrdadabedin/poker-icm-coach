"""Player portraits (plan 094): the signed-in player's own photo, and the
Admin review that lets it onto the table.

The app resizes the photo before upload, so a real one is a few tens of KB.
Only JPEG, PNG and WebP are taken, and the bytes must start like the declared
type: the photo is sent back inside an <img> data URL, and SVG (which can
carry script) or a mislabelled file must never get there.
"""
from __future__ import annotations

import base64
import binascii
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, Field

from app.api.deps import require_admin, require_user
from app.services import portraits
from app.services.portraits import Portrait

router = APIRouter(tags=["portrait"])

MAX_BYTES = 200_000
MAX_BASE64 = (MAX_BYTES + 2) // 3 * 4
ContentType = Literal["image/jpeg", "image/png", "image/webp"]
Username = Path(min_length=1, max_length=64)


class PortraitUpload(BaseModel):
    contentType: ContentType
    data: str = Field(min_length=1, max_length=MAX_BASE64)  # base64, no data: prefix


def _starts_like(content_type: str, image: bytes) -> bool:
    if content_type == "image/jpeg":
        return image.startswith(b"\xff\xd8\xff")
    if content_type == "image/png":
        return image.startswith(b"\x89PNG\r\n\x1a\n")
    return image[:4] == b"RIFF" and image[8:12] == b"WEBP"


def _decode(body: PortraitUpload) -> bytes:
    try:
        image = base64.b64decode(body.data, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=422, detail="the photo is not valid base64") from exc
    if len(image) > MAX_BYTES:
        raise HTTPException(status_code=422, detail="the photo is too large")
    if not _starts_like(body.contentType, image):
        raise HTTPException(status_code=422, detail="the file is not a JPEG, PNG or WebP picture")
    return image


def _data_url(portrait: Portrait) -> str:
    return f"data:{portrait.content_type};base64,{base64.b64encode(portrait.image).decode()}"


def _view(portrait: Portrait | None) -> dict:
    if portrait is None:
        return {"status": "none", "image": None}
    return {"status": portrait.status, "image": _data_url(portrait)}


@router.get("/api/portrait")
def my_portrait(user: str = Depends(require_user)) -> dict:
    """The player's own photo in every state, so they can see it while it waits."""
    return _view(portraits.store.get(user))


@router.put("/api/portrait")
def upload_portrait(body: PortraitUpload, user: str = Depends(require_user)) -> dict:
    return _view(portraits.store.put(user, body.contentType, _decode(body)))


@router.delete("/api/portrait")
def delete_portrait(user: str = Depends(require_user)) -> dict:
    portraits.store.delete(user)
    return _view(None)


@router.get("/api/admin/portraits")
def pending_portraits(_: str = Depends(require_admin)) -> dict:
    """Photos waiting for review, oldest first."""
    return {"portraits": [
        {"username": p.owner, "image": _data_url(p), "updatedAt": p.updated_at.isoformat()}
        for p in portraits.store.pending()
    ]}


@router.post("/api/admin/portraits/{username}/{decision}")
def review_portrait(decision: Literal["approve", "reject"], username: str = Username,
                    _: str = Depends(require_admin)) -> dict:
    status: portraits.Status = "approved" if decision == "approve" else "rejected"
    reviewed = portraits.store.review(username, status)
    if reviewed is None:
        raise HTTPException(status_code=404, detail="no photo for that user")
    return {"username": reviewed.owner, "status": reviewed.status}
