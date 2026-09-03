"""FastAPI application entry point with REST + WebSocket."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.deps import bearer_token
from app.api.routes_auth import router as auth_router
from app.api.routes_game import _sessions
from app.api.routes_game import router as game_router
from app.api.routes_meta import router as meta_router
from app.core.config import settings
from app.services.auth import auth_store


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield


app = FastAPI(title="ICM Master API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(game_router)
app.include_router(meta_router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.websocket("/ws/table/{table_id}")
async def table_ws(websocket: WebSocket, table_id: str,
                   token: str | None = Query(default=None)) -> None:
    """Push a fresh game-state snapshot after every state change.

    Ownership check (A12): when the session is owned by a user, the caller
    must present that user's bearer token (`?token=...`).
    """
    await websocket.accept()
    session = _sessions.get(table_id)
    try:
        if session is None:
            await websocket.send_json({"error": "table not found"})
            return
        owner = session.owner
        if owner and auth_store.user_for_token(bearer_token(f"Bearer {token}")) != owner:
            await websocket.send_json({"error": "table not found"})
            return
        while True:
            message = await websocket.receive_text()
            if message == "state":
                await websocket.send_json(session.state())
            elif message.startswith("action:"):
                _prefix, _sep, kind = message.partition(":")
                rest: list[str] = message.split(":", 2)[2:]
                amount = int(rest[0]) if rest and rest[0].strip().isdigit() else None
                session.hero_action(kind.strip(), amount)
                await websocket.send_json(session.state())
            elif message == "next":
                session.next_hand()
                await websocket.send_json(session.state())
    except (WebSocketDisconnect, ValueError, RuntimeError):
        return
