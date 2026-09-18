"""The single version source: the installed distribution's own metadata.

Git tags are canonical, so nothing here hard-codes a number. The release
workflow stamps the tag's version into `pyproject.toml` in the runner before
building, and a working tree that was never stamped keeps the placeholder.
An unsynced checkout has no metadata at all, and claiming a release number
there would be a lie, so it reports the same placeholder.
"""
from __future__ import annotations

from importlib.metadata import PackageNotFoundError
from importlib.metadata import version as distribution_version

DEV_VERSION = "0.0.0+dev"
DISTRIBUTION = "poker-icm-coach-backend"


def app_version() -> str:
    try:
        return distribution_version(DISTRIBUTION)
    except PackageNotFoundError:
        return DEV_VERSION
