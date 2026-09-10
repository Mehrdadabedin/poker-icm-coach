# CLAUDE.md — rules for coding agents in this repository

Any assistant or model working here follows these. They are short imperatives;
`ARCHITECTURE.md` has the reasoning and the measurements behind each. Several
are enforced by tests, so breaking one turns the suite red.

## Before you change anything

```bash
cd backend  && uv run pytest                      # 430 tests (434 with a database)
cd frontend && npx vitest run                     # 41 tests
```

Both suites must be green before and after your change. Report the counts.

For the four database tests, start the service first — otherwise they skip:

```bash
docker compose up -d postgres
cd backend && uv run alembic upgrade head
```

Lint with the project's own tooling, which is authoritative:

```bash
cd backend && uv run ruff check app tests && uv run mypy app
```

A globally installed `mypy` or `tsc` reports dozens of missing-stub errors
because it runs outside the project environment. Ignore those; use the commands
above.

## Hard rules

1. **200 lines maximum per Python file.** Asserted by
   `test_project_setup.py::test_code_files_under_200_lines` and by
   `scripts/github_audit.py`. Files sit close to the limit on purpose — if your
   change does not fit, extract a module first rather than growing the file.
2. **Never call a `GameSession` method from an `async def` without
   `run_in_threadpool`.** Session calls are slow and synchronous; inline, they
   freeze every connection in the process. Same for anything that writes to
   disk, including `auth_store.user_for_token()`.
3. **Every public `GameSession` method takes `self._lock`.** One table is
   reachable from REST, the WebSocket, and a 350 ms poll at the same time.
   Concurrent unlocked `next_hand()` calls destroyed chips.
4. **Never trust a client-supplied username as authorization.** Depend on
   `require_user` and resolve the user from the bearer token server-side.
5. **A request field's bounds belong on the pydantic schema**
   (`backend/app/schemas/`), as `Literal` for any vocabulary. A domain
   invariant belongs in the engine that owns it — the ICM player cap lives in
   `icm_engine.py`, and schemas import the constant instead of repeating `9`.
6. **Ownership failures return 404, not 403.** Do not leak whether a table
   exists.
7. **`frontend/public/cards` is PNG only.** `public/` ships verbatim in `dist/`
   and in the APK. Regenerate with `scripts/import_opendecks_cards.py`.
8. **The backend owns all game state.** The frontend renders snapshots and
   sends actions; it never computes poker results.

## Writing tests

- **Never gate a concurrency test on a `sleep` margin.** Use
  `tests/concurrency_helpers.py`: `Gate` parks a caller inside the engine,
  `WaitCountingLock` lets you wait until another thread is provably blocked.
- **A test that needs a service skips when the service is absent** — it does
  not fail. See the `pytestmark` in `tests/test_database.py`.
- **Assert work, not wall-clock**, for anything security-shaped. The
  user-enumeration test counts PBKDF2 derivations rather than timing them.
- Seed the RNG (`GameSession(rng=random.Random(...))`) when the assertion
  depends on which hand was dealt.
- Prove a regression test works: revert the fix, watch it fail with a message
  that names the cause, restore the fix.

## Conventions

- Python 3.12, `from __future__ import annotations`, type hints everywhere,
  Pydantic v2, SQLAlchemy 2. TypeScript strict; no `any`.
- Docstrings explain **why**, not what. A comment that restates the code is
  noise; a comment that records the bug it prevents is the point.
- Commit messages state the observed failure and the measurement, not just the
  change. `git log` on this branch is the model.
- Update `progress.md` when a numbered plan in `plans/` changes state — a test
  asserts every row is present.
- Do not add a dependency without saying why in the commit message; the
  runtime set is deliberately small.

## Known traps

- `data/users.json` and `data/sessions.json` hold live credentials and bearer
  tokens. They are gitignored. Never print or commit them.
- The token store is an in-process dict: **one uvicorn worker only**. Scaling
  out means moving sessions to PostgreSQL or Redis first.
- `GameSession.status` never leaves `"active"`; there is no lifecycle. The
  20-table-per-user cap in `SessionStore` is the stopgap.
- `PUT /api/settings` writes one process-global object shared by every user.
  That is current behaviour, not an accident to "fix" silently.
- The frontend does not use the WebSocket. It polls every 350 ms; the socket
  endpoint is implemented and tested but unused.

## Scope discipline

Do the task asked. If you find something else broken, say so — do not fold an
unrelated rewrite into the change. Keep unrelated fixes in separate commits so
they can be reverted independently: this branch put the card-asset deletion in
its own commit precisely because it reverses an earlier documented decision.
