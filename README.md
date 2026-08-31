# ICM Master

A professional full-stack **9-player Texas Hold'em tournament practice system** with an
**ICM coaching engine**. Play as the Hero against 8 computer opponents with distinct
personalities, get baseline-strategy recommendations before every decision, and review
your sessions with statistics, hand history and ICM-aware feedback.

> **Status: complete** — Phase 1 (core poker game), Phase 2 (computer AI) and Phase 3
> (advanced ICM coach) are implemented and covered by automated tests.

---

## Features

- **9-player table**: 1 human Hero + 8 AI opponents, dealer button rotation, correct
  preflop/postflop action order, blind posting, antes (none / traditional / big-blind ante).
- **Real poker engine**: 52-card deck, burn cards, progressive flop/turn/river, full
  hand evaluator (all nine hand categories with kickers and ace-low straights), betting
  engine (fold/check/call/bet/raise/all-in with min-raise rules), multiway side pots
  with exact chip conservation (validated over thousands of simulated hands).
- **Tournament engine**: 45,000 starting chips, configurable blind structure
  (default 100/100, 20-minute levels), blind timer with fast mode.
- **Computer AI**: 8 distinct personalities (tight, aggressive, TAG, loose, LAG,
  passive, balanced, adaptive) with VPIP/PFR/3-bet/aggression/bluff tendencies;
  position- and stack-depth-aware preflop ranges; postflop play with board texture,
  draws and pot odds; session-adaptive opponent range estimation. The AI never sees
  hidden cards or future streets.
- **ICM Coach**: exact Independent Chip Model equity (for ≤9 players), tournament-stage
  detection, bubble pressure, risk premium, equity engine (exact turn/river + Monte Carlo
  estimates), 13×13 range matrix with baseline ranges and mixed frequencies, push/fold
  engine, stack/effective-stack analysis, SPR and board texture — all combined into a
  dynamic recommendation with confidence, reasoning and alternatives.
- **Coach modes**: BEGINNER / INTERMEDIATE / ADVANCED detail levels.
- **Test mode**: hide the recommendation until you act, then grade your decision
  PREFERRED / ACCEPTABLE / SUBOPTIMAL with explanation.
- **Training data**: hand history, session statistics (VPIP, PFR, aggression, coach
  agreement, ICM mistakes, position/stack performance, biggest-leak detection).
- **Android packaging** via Capacitor (APK build commands included).

## Architecture

```
ICM Master
├── frontend/   React + TypeScript + Vite + Vitest + Playwright (Capacitor for Android)
└── backend/    Python + FastAPI + Pydantic + SQLAlchemy + PostgreSQL (Alembic) + pytest
```

The **backend owns all authoritative game state** — cards, actions, pots, winners,
blinds, AI and ICM calculations. React renders state snapshots and sends hero actions;
it never computes poker results itself. Real-time table updates stream over WebSockets;
REST is used for everything else.

Backend module map:

| Module | Responsibility |
|--------|----------------|
| `app/poker/` | card, deck, hand evaluator |
| `app/game/` | player, positions, dealer button, dealing, betting, pots/side pots, hand engine, showdown |
| `app/tournament/` | blind structure, tournament, blind timer |
| `app/ai/` | AI framework, personalities, preflop/postflop AI, opponent ranges/stats |
| `app/icm/` | exact ICM engine |
| `app/equity/` | equity engine (exact + Monte Carlo) |
| `app/strategy/` | stack analysis, bubble/stage, risk premium, range matrix, push/fold, coach, test mode |
| `app/services/` | game session (table state), hand history, statistics |
| `app/api/` | REST routers + WebSocket |
| `app/models/` | SQLAlchemy ORM + repositories |

## Technology stack

- **Frontend**: React 18, TypeScript (strict), Vite 6, Vitest, Playwright, Capacitor
- **Backend**: Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic
- **Database**: PostgreSQL 16 (Docker)
- **Testing**: pytest (~320 backend tests), Vitest (22 frontend tests), Playwright browser E2E
- **Quality**: ruff, mypy, type hints everywhere, strict TS, 200-line file limit

## How to run locally

### 1. PostgreSQL (Docker)

```bash
docker compose up -d postgres   # exposes port 5433 to avoid local conflicts
```

### 2. Backend

```bash
cd backend
cp ../.env.example .env         # adjust DATABASE_URL if needed
uv sync                         # create the venv (Python 3.12)
.venv/bin/alembic upgrade head  # create tables
.venv/bin/uvicorn app.main:app --port 8000
```

API docs: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

The Vite dev server proxies `/api` and `/ws` to the backend.

### 4. Tests

```bash
# backend
cd backend && .venv/bin/pytest

# frontend unit tests
cd frontend && npm test

# browser end-to-end tests (starts backend + frontend preview automatically)
cd frontend && npm run e2e
```

### 5. Android APK

See [docs/android.md](docs/android.md). Requires JDK 17 + Android SDK:

```bash
cd frontend
npm run cap:sync
cd android && ./gradlew assembleRelease   # -> app/build/outputs/apk/release/app-release.apk
```

The APK talks to the FastAPI backend over HTTP (configure the server URL in
`capacitor.config.ts`). It is **not** offline/standalone.

## API overview

| Endpoint | Description |
|----------|-------------|
| `POST /api/tournament` | create a tournament table |
| `GET /api/game/{id}/state` | current state (hidden cards filtered) |
| `POST /api/game/{id}/action` | hero action (fold/check/call/bet/raise/all_in) |
| `POST /api/game/{id}/next-hand` | deal the next hand |
| `POST /api/game/{id}/coach` | live coach recommendation |
| `POST /api/coach/advice` | coach advice for any supplied spot |
| `GET /api/ranges?position=&stack_bb=` | 13×13 baseline range matrix |
| `GET /api/icm?stacks=&payouts=` | exact ICM equities |
| `GET /api/game/{id}/hands` | hand history |
| `GET /api/game/{id}/statistics` | session statistics |
| `GET /api/settings` | tournament defaults |
| `WS /ws/table/{id}` | real-time state stream |

## Project status

- Phase 1 — Core poker game: **complete** (parts 001–016)
- Phase 2 — Computer AI: **complete** (parts 017–021)
- Phase 3 — Advanced ICM coach: **complete** (parts 022–034)
- Packaging & testing: **complete** (parts 035–037)
- 316 backend tests, 22 frontend tests, 3 Playwright E2E scenarios — all passing.

### Known limitations

- The coach and AI use **heuristic baseline ranges**, not solver-exact GTO
  (explicitly labeled "BASELINE STRATEGY RANGE" in the UI).
- ICM is exact only for ≤9 players; larger fields would use labeled Monte Carlo.
- The Android APK was not built in this environment (no Android SDK/JDK); the
  generated Capacitor project and build commands are provided and CI-ready.
- Sessions live in backend memory; hand history/statistics are persisted to
  PostgreSQL via the repository layer.
