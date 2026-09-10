# ICM Master — Architecture

## Transport: state polling vs WebSocket / SSE (Issue #1)

Current: the frontend polls `GET /api/game/{id}/state` every 350 ms
(`frontend/src/hooks/useGame.ts`), roughly 2.9 requests/second/active table.

Existing WebSocket: `/ws/table/{table_id}` (`backend/app/main.py`) pushes a
state snapshot when the client requests it, supports server-side ownership
check (owner token must match the session owner), and works under the
single-worker deployment. The frontend does not use it.

Evaluation (no forced migration):
- The REST polling is simple, stateless, works on any proxy (Render), and
  already preserves all game/timer/pause semantics.
- The WS endpoint authenticates via a bearer token in the QUERY STRING
  (`?token=`), which leaks the token into server/proxy logs — a security
  weakness that would need a subprotocol/cookie handshake change to fix
  safely.
- SSE would also require credentials in a cookie/query and an async stream;
  nothing about the current 350 ms polling causes a measurable problem at
  the expected concurrency (single worker, few players).
- Recommendation: keep polling. If transport optimization becomes necessary
  later, the correct order is (1) fix WS authentication to use cookies or a
  short-lived subprotocol token, (2) switch `useGame` to the WebSocket with
  reconnection, (3) keep every REST mutation endpoint as the authority.

## Auth / session state and scaling (Issue #4)

- `AuthStore._tokens` and the `GameSession` registry `_sessions` are
  in-memory, single-process. The deployment intentionally runs ONE uvicorn
  worker (backend/Dockerfile: `uvicorn app.main:app --host 0.0.0.0 --port
  8000`), so this is correct for the current architecture.
- Moving live `GameSession` objects into a distributed store would be
  dangerous (they hold an engine, timer, RNG, bot personalities) and is out
  of scope. Do not start multiple workers without first externalizing auth
  and session state.
- Multi-worker is intentionally unsupported; running more than one worker
  would break auth/session isolation unless the owner adds a shared store.

## Tournament settings (Issue #3)

Settings are per-user in `TournamentSettingsStore` (in-memory, single
worker): each authenticated user gets their own `TournamentSettings`, so User
A's changes never affect User B. See `backend/app/core/tournament_settings.py`
and `backend/app/api/routes_meta.py` / `routes_game.py`.

## Table lifecycle (Issue #5)

`GameSession.status` can be `active`, `finished` (hero eliminated with no
live opponent), or `abandoned` (idle past a 30-minute timeout). Eviction:
finished first, then abandoned, then a safety cap for live tables.
`state()` refreshes `last_seen`. See `backend/app/services/session_store.py`.
