# Project Progress

POKER ICM COACH — 9-player Texas Hold'em tournament practice & ICM coaching system.

| ID | Task | Phase | Status | Tests | Notes |
|----|------|-------|--------|-------|-------|
| 001 | Project Setup | 1 | complete | PASS (9) | structure, tooling, git init |
| 002 | Card Model | 1 | complete | PASS (11) | card primitives |
| 003 | Deck Engine | 1 | complete | PASS (10) | deck: 52 unique, shuffle, draw, reset |
| 004 | Player Model | 1 | complete | PASS (11) | player state, chips, all-in vs elimination |
| 005 | Positions | 1 | complete | PASS (8) | 9-max + 6-max seat->position mapping |
| 006 | Dealer Button Rotation | 1 | planned | | |
| 007 | Dealing Engine | 1 | planned | | |
| 008 | Hand Evaluator | 1 | planned | | |
| 009 | Betting Engine | 1 | planned | | |
| 010 | Pot Engine | 1 | planned | | |
| 011 | Side Pots | 1 | planned | | |
| 012 | Tournament Engine | 1 | planned | | |
| 013 | Tournament Timer | 1 | planned | | |
| 014 | Hand Engine (Street Flow) | 1 | planned | | |
| 015 | React Poker Table | 1 | planned | | |
| 016 | Hero Controls | 1 | planned | | |
| 017 | Computer AI Framework | 2 | planned | | |
| 018 | Computer Personalities | 2 | planned | | |
| 019 | Preflop AI | 2 | planned | | |
| 020 | Postflop AI | 2 | planned | | |
| 021 | Opponent Range Estimation | 2 | planned | | |
| 022 | ICM Engine | 3 | planned | | |
| 023 | Stack Analysis | 3 | planned | | |
| 024 | Bubble Pressure | 3 | planned | | |
| 025 | Risk Premium | 3 | planned | | |
| 026 | Equity Engine | 3 | planned | | |
| 027 | Range Matrix | 3 | planned | | |
| 028 | Push/Fold Engine | 3 | planned | | |
| 029 | Strategy Coach | 3 | planned | | |
| 030 | Test Mode | 3 | planned | | |
| 031 | Hand History | 3 | planned | | |
| 032 | Statistics | 3 | planned | | |
| 033 | Database (PostgreSQL + Alembic) | 3 | planned | | |
| 034 | FastAPI + WebSocket API | 3 | planned | | |
| 035 | Android (Capacitor) | 4 | planned | | |
| 036 | GitHub Repository Preparation | 4 | planned | | |
| 037 | Final Testing & E2E | 4 | planned | | |

## Current Phase

Phase 1 — Core Poker Game

## Current Atomic Task

006 — Dealer Button Rotation

## Completed Tasks

- 005 Positions (complete)- 004 Player Model (complete)- 003 Deck Engine (complete)- 002 Card Model (complete)- 001 Project Setup (complete)

## In Progress

(none)

## Blocked

(none)

## Tests

- backend: pytest (configured)
- frontend: Vitest (configured in part 015)

## Known Issues

- GitHub CLI (gh) not installed on this machine — remote push deferred (see 036).
- No Java / Android SDK — Android APK build documented but runnable only where SDK exists (035).
- Local PostgreSQL on :5432 is not accessible without credentials; Docker Postgres is exposed on host port 5433.

## Next Step

Begin 006 Dealer Button Rotation: test rotation, implement dealer_button.py.