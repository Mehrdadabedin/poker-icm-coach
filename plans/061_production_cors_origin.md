---
id: 061
title: Production CORS Origin (Render Frontend)
phase: 5
status: complete
depends_on: [34]
test_file: backend/tests/test_api.py
implementation_files: [backend/app/core/config.py, .env.example, docker-compose.yml]
---

# Objective

Allow the deployed Render frontend (https://icm-master-frontend.onrender.com)
to call the backend API. Firefox reported "CORS header 'Access-Control-
Allow-Origin' missing" on /api/coach/advice because the production origin was
not in the CORS allow list.

# Root Cause

FastAPI CORSMiddleware uses settings.cors_origins (env-driven, default
"http://localhost:5173,http://localhost:4173"). The production origin was
absent, so the browser blocked cross-origin responses.

# Change

- config.py default cors_origins now includes the production origin while
  keeping localhost 5173/4173/8080 dev origins.
- .env.example and docker-compose.yml CORS_ORIGINS updated to the same list.
- backend/.env (untracked) updated locally for verification.
- No API endpoints, models, middleware behavior (allow_methods/headers stay
  "*"), or any other functionality changed.

# Verification

- OPTIONS preflight from the production origin -> 200 with
  Access-Control-Allow-Origin: https://icm-master-frontend.onrender.com.
- Real POST /api/coach/advice with that Origin returns 200 + ACAO header.
- localhost 5173/4173/8080 preflights still succeed; unallowed origins 400.
- Backend suite 370 passed; repo audit passed.

# Acceptance Criteria

Deployed frontend can call the backend without a CORS error; dev origins
untouched.
