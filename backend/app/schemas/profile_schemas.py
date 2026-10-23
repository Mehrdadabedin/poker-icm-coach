"""Request bodies for the player profile and account deletion (plan 095).

Names allow letters of any language plus space, dot, apostrophe and hyphen, so
"José Ñúñez" and "O'Neil" pass while markup and control characters do not.
Runs of spaces collapse to one before the length is checked.
"""
from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Gender = Literal["man", "woman", "non_binary", "self_described", "prefer_not_to_say"]
MIN_AGE = 18
_PUNCTUATION = set(" .'-")


def age_on(birthday: date, today: date) -> int:
    return today.year - birthday.year - ((today.month, today.day) < (birthday.month, birthday.day))


def _clean(value: str, low: int, high: int, digits: bool) -> str:
    text = " ".join(value.split())
    if not low <= len(text) <= high:
        raise ValueError(f"use {low} to {high} characters")
    if not all(c.isalpha() or c in _PUNCTUATION or (digits and c.isdigit()) for c in text):
        raise ValueError("use letters, spaces, dots, apostrophes and hyphens")
    if not text[0].isalnum():
        raise ValueError("start with a letter")
    return text


class ProfileIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    firstName: str = Field(max_length=80)
    lastName: str = Field(max_length=80)
    displayName: str = Field(max_length=48)
    birthday: date
    gender: Gender = "prefer_not_to_say"
    genderText: str | None = Field(default=None, max_length=80)

    @field_validator("firstName", "lastName")
    @classmethod
    def _name(cls, value: str) -> str:
        return _clean(value, 1, 40, digits=False)

    @field_validator("displayName")
    @classmethod
    def _display(cls, value: str) -> str:
        return _clean(value, 2, 24, digits=True)

    @field_validator("birthday")
    @classmethod
    def _adult(cls, value: date) -> date:
        today = datetime.now(UTC).date()
        if value.year < 1900 or value > today:
            raise ValueError("enter a real birthday")
        if age_on(value, today) < MIN_AGE:
            raise ValueError(f"ICMBOT is for players aged {MIN_AGE} or older")
        return value

    @model_validator(mode="after")
    def _gender_text(self) -> ProfileIn:
        if self.gender != "self_described":
            self.genderText = None
        elif not self.genderText or not self.genderText.strip():
            raise ValueError("describe your gender, or choose another option")
        else:
            self.genderText = _clean(self.genderText, 1, 40, digits=False)
        return self


class AccountDeletion(BaseModel):
    """A password account sends its password again; a Google account sends the
    word DELETE, since it has no password here."""
    model_config = ConfigDict(extra="forbid")

    password: str | None = Field(default=None, max_length=128)
    confirm: Literal["DELETE"] | None = None
