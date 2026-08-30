---
id: 001
title: Project Setup
phase: 1
status: complete
depends_on: []
test_file: backend/tests/test_project_setup.py
implementation_files: [backend/pyproject.toml, backend/app/core/config.py, docker-compose.yml, .gitignore, progress.md]
---

# Objective

Create the poker-icm-coach repository skeleton: backend/frontend structure, Python tooling (pyproject.toml via uv), Node tooling (package.json), Docker compose, .gitignore, .env.example, docs/ and scripts/. Initialize git.

# Requirements

- Directory tree per spec section 4.
- backend/ is a uv-managed Python 3.12 project with pytest configured.
- frontend/ declares React 18 + TypeScript + Vite + Vitest dependencies.
- docker-compose.yml defines postgres, backend, frontend services.
- .gitignore excludes .env, node_modules, __pycache__, dist, .venv.
- .env.example documents DATABASE_URL and API settings.
- progress.md and plans/ exist with valid frontmatter.
- Every code/config file stays under 200 lines.

# Dependencies

None beyond available tooling (uv, node, docker).

# Tests

test_project_setup.py verifies:
- required directories exist (backend/app/poker, plans, frontend/src, docs, scripts)
- plans/*.md files exist and each starts with valid YAML frontmatter
- progress.md exists and contains the table header
- .gitignore exists and contains .env, node_modules, __pycache__
- .env.example exists and contains DATABASE_URL
- backend/pyproject.toml exists and declares pytest and fastapi
- docker-compose.yml exists and defines postgres, backend, frontend services
- every backend .py file is <= 200 lines

# Implementation

Write scaffolding files by hand (no generators): directory tree, plan files, progress.md, .gitignore, .env.example, docker-compose.yml, backend/pyproject.toml, minimal app/core/config.py, frontend package.json + tsconfig + vite config, scripts helpers.

# Acceptance Criteria

Scaffold tests pass; uv sync resolves backend deps; git repo initialized with initial commit.

# Notes

GitHub CLI is not installed; remote push is deferred to part 036.
