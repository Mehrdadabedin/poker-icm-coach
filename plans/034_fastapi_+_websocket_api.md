---
id: 034
title: FastAPI + WebSocket API
phase: 3
status: planned
depends_on: [14, 29, 33]
test_file: backend/tests/test_api.py
implementation_files: [backend/app/main.py, backend/app/api/routers.py, backend/app/schemas/game_schemas.py]
---

# Objective

Expose the FastAPI application: routers for tournament/game/hands/coach/ranges/icm/statistics/settings; Pydantic schemas; WebSocket for live table updates; security (no hidden cards in responses, input validation).

# Requirements

- REST endpoints per spec section 65.
- WebSocket /ws/table streams state changes (deals, bets, streets, showdown, timer).
- Schemas never include hidden hole cards of non-hero players or unrevealed streets.
- All input validated by Pydantic.
- CORS configured for frontend origin.

# Dependencies

Parts 14, 29, 33.

# Tests

TestClient: create tournament, start hand, hero action, state snapshots exclude hidden info, websocket receives updates.

# Implementation

backend/app/main.py, backend/app/api/*, backend/app/schemas/*.

# Acceptance Criteria

API tests pass; hidden-card security assertions green.

# Notes

Authoritative game state lives only in backend.
