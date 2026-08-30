---
id: 033
title: Database (PostgreSQL + Alembic)
phase: 3
status: planned
depends_on: [12, 31]
test_file: backend/tests/test_database.py
implementation_files: [backend/app/database/session.py, backend/app/models/orm_models.py, backend/alembic.ini, backend/alembic/]
---

# Objective

Add PostgreSQL persistence: SQLAlchemy models (Tournament, TournamentConfiguration, Player, OpponentProfile, PokerHand, HandAction, HandResult, StrategyDecision, CoachRecommendation, Session, SessionStatistics), Alembic migrations, repository layer.

# Requirements

- Models mirror backend domain objects.
- Alembic initial migration creates tables.
- Session factory reads DATABASE_URL env (falls back to settings).
- Repositories save/load hands, decisions, sessions.
- No DB logic in UI or game engines.

# Dependencies

Parts 12, 31.

# Tests

Migration up on ephemeral postgres (docker), model round-trip save/load via repositories.

# Implementation

backend/app/database/session.py, backend/app/models/orm_models.py, backend/alembic/*.

# Acceptance Criteria

DB tests pass against real PostgreSQL (compose service).

# Notes

Game simulation stays in-memory; DB is persistence layer.
