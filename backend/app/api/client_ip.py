"""The visitor's address, on any host (plan 109).

TRUSTED_PROXY_HOPS is the number of proxies in front of the app. Each proxy adds
the address it saw to the right of X-Forwarded-For, so counting from the right
gives an entry a visitor cannot choose. Entries further left can be faked.
Changing host means changing that value, not the start command.
"""
from __future__ import annotations

import hashlib
import ipaddress
import secrets

from fastapi import Request

_LOG_SALT = secrets.token_bytes(16)


def short_hash(value: str) -> str:
    """Compare addresses and usernames in logs without writing them down."""
    return hashlib.sha256(_LOG_SALT + value.encode()).hexdigest()[:12]


def forwarded_entries(request: Request) -> list[str]:
    joined = ",".join(request.headers.getlist("x-forwarded-for"))
    return [entry.strip() for entry in joined.split(",") if entry.strip()]


def _peer(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _counting_key(address: str) -> str | None:
    """One key per address. An IPv6 address counts as its /64: one household can hold it all."""
    try:
        parsed = ipaddress.ip_address(address)
    except ValueError:
        return None
    if isinstance(parsed, ipaddress.IPv6Address):
        if parsed.ipv4_mapped:
            return str(parsed.ipv4_mapped)
        return str(ipaddress.ip_network(f"{parsed}/64", strict=False))
    return str(parsed)


def client_ip(request: Request, hops: int) -> str:
    peer = _peer(request)
    if hops > 0:
        entries = forwarded_entries(request)
        if len(entries) >= hops:
            chosen = _counting_key(entries[-hops])
            if chosen:
                return chosen
    return _counting_key(peer) or peer
