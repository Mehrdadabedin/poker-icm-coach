# CLAUDE.md — rules for agents in this repo

Terse by design. Reasons and measurements: `ARCHITECTURE.md`.
Several people, harnesses and model providers work here. Follow these, not your
own conventions.

## Rule 0 — communicate efficiently

Applies to every output: replies, commit messages, PR bodies, comments, docs.

- Lead with the result. No preamble, no recap.
- Say what changed and what broke. Skip what you considered.
- No teaching tone, no praise, no filler. Assume an expert reader.
- Report numbers: test counts, measurements, before/after.
- Say "I did not verify X" when you did not. Never imply verification.
- A comment records why, never what. Delete comments that restate code.
- Gloss any idiom or figure of speech in parentheses the first time you use it:
  "a free win (something with benefits and no cost)". Readers here are not all
  native English speakers, and an unexplained idiom costs more than the words it
  saved. Plain wording is still better where it exists.
- No em dashes. Use a comma or a full stop.

## Commands

```bash
cd backend  && uv run pytest        # 438 (442 with a database)
cd frontend && npx vitest run       # 41
cd backend  && uv run ruff check app tests && uv run mypy app
cd frontend && npm run lint         # tsc --noEmit + oxlint --deny-warnings
docker compose up -d postgres && cd backend && uv run alembic upgrade head
```

Both suites green before and after. Report counts.

Enable the pre-push hook once per clone, since `git clone` does not copy hooks:

```bash
git config core.hooksPath .githooks
```

It runs every gate CI runs. Do not push with `--no-verify` unless you can say
why in the commit message. CI itself has never run on this repository, see
issue #8, so the hook is currently the only thing checking anything.
Global `mypy`/`tsc` run outside the project env — their missing-stub errors are
noise. Use the commands above.

## Hard rules

Violating 1-5 turns `tests/test_invariants.py` red.

1. Every public `GameSession` method takes `self._lock`. Unlocked concurrent
   `next_hand()` destroyed chips.
2. No `async def` calls a session method inline. Use `run_in_threadpool`.
   Inline froze every connection in the process. Same for disk writes.
3. Reach tables via `session_store`, never a router's `_sessions`.
4. Every route taking `table_id` depends on `require_user`. A client-supplied
   username is never authorization.
5. The ICM player cap is defined once, in `icm_engine.py`. Schemas import it.
6. 200 lines max per `.py`, `.ts`, `.tsx` file. Enforced. Extract a module
   instead of growing one.
7. Request-field bounds go on the pydantic schema, as `Literal` for any
   vocabulary. Domain invariants go in the engine that owns them.
8. Ownership failure returns 404, not 403.
9. `frontend/public/cards` is PNG only. Regenerate with
   `scripts/import_opendecks_cards.py`.
10. Backend owns all game state. The frontend renders snapshots.
11. No `any` in TypeScript. No `console.*`. Enforced by oxlint in CI.

## Tests

- No `sleep` margins in concurrency tests. Use `tests/concurrency_helpers.py`
  (`Gate`, `WaitCountingLock`).
- A test needing a service skips when it is absent. See
  `tests/test_database.py`.
- Security properties: count work, do not clock it.
- Seed the RNG when the assertion depends on the hand dealt.
- Prove a regression test: revert the fix, watch it fail with a message naming
  the cause, restore.

## Traps

- `data/users.json`, `data/sessions.json`: live credentials and tokens.
  Gitignored. Never print or commit.
- Single uvicorn worker only. Tokens and tables are in-process dicts.
- `GameSession.status` never leaves `"active"`. No lifecycle. The 20-table cap
  is the stopgap.
- `PUT /api/settings` writes one global object shared by all users. Current
  behaviour, not a bug to fix silently.
- The frontend polls every 350 ms. The websocket endpoint is unused (issue #1).

## Scope

Do the task asked. Report anything else you find; do not fix it in the same
commit. One reversible decision per commit — the card-asset deletion is its own
commit because it reverses a documented choice.

## Conventions

Python 3.12, `from __future__ import annotations`, typed. Pydantic v2,
SQLAlchemy 2. TypeScript strict, no `any`. Update `progress.md` when a
`plans/` item changes state (asserted). Justify any new dependency in the
commit message.
