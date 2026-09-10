# Architecture decisions and invariants

The README says what the project *is*. This file says what must stay true, and
why. Each rule below was written after breaking it caused a real bug — the
"why" is there so the next change does not undo the fix.

`CLAUDE.md` is the short imperative version of this file for coding agents.
Rules 1-5 there are enforced by `backend/tests/test_invariants.py`, which parses
the source: a violation is a red test, not a review comment.

---

## 1. Concurrency: one table, many callers

One `GameSession` is reachable from several callers at once — REST handlers, the
table WebSocket, and a browser polling `GET /state` three times a second. Two
rules keep that safe.

**Every public `GameSession` method holds `self._lock`.**
`start`, `hero_action`, `next_hand`, `state`, `coach_advice`, `grade_hero`. Add
a public method, take the lock. It is an `RLock` because `grade_hero()` calls
`coach_advice()`; private helpers only ever run under a public method.

`state()` is on that list even though it reads: `timer.tick()` advances expired
blind levels, and `build_state_view` must not read pots mid-`act`.

Without it, two concurrent `next_hand()` calls both passed the
`phase() == "handOver"` check and both dealt. The second `start_hand()` reset a
street the first had not finished collecting, and chips left the table — one
measured run turned 426,560 into 404,700, and the overwritten hand's history
record was lost. `hero_action` was accidentally safe (`HandEngine.act`
re-checks the actor); `next_hand` had no such guard.

**No `async def` handler calls a session method inline.**
Use `run_in_threadpool`. Session calls are synchronous and slow — `hero_action`
plays the bot loop out to the next hero decision — so on the event loop they
freeze every other connection in the process. Measured: a 300 ms action made
`GET /api/health` take 255 ms. This must stay true for a second reason: an
event loop blocking on a lock held by a threadpool thread wedges the whole
process, not one request.

The same applies to anything that can touch disk. `auth_store.user_for_token()`
rewrites the sessions file when a token has expired, so it is also off the loop.

## 2. Authentication

Registration-first, bearer tokens, no database. See `app/services/auth.py`
(sessions) and `app/services/user_registry.py` (credentials).

- Passwords: PBKDF2-SHA256, 200k rounds, 16-byte random salt, base64 in
  `data/users.json`. Never logged.
- A username supplied by a client is **never** authorization. Routes depend on
  `require_user`, which resolves the username from the token server-side.
- An unknown username still performs one PBKDF2 derivation against a fixed
  decoy salt before failing, so response time does not reveal which accounts
  exist. Deleting that line reopens a user-enumeration oracle.
- Token deadlines are **wall-clock** (`time.time`), not `time.monotonic`,
  because they are written to disk and compared after a restart.
- `AuthStore._save()` and `_load()` take the lock themselves. Callers must not
  hold it. The lock is reentrant so a mistake here is a redundant acquire
  rather than a wedged worker — which is what a plain `Lock` did on the first
  lookup of an expired token.
- Ownership failures return **404, not 403**: a table's existence never leaks.

**Single worker.** The token table is an in-process dict. A second uvicorn
worker holds a different set of sessions and logs users out at random. Moving
to multiple workers means moving sessions into PostgreSQL or Redis first.

## 3. Where input bounds live

- **A request field's bounds go on the pydantic schema** (`app/schemas/`).
  Vocabularies are `Literal`s, not `str` — an unbounded `str` reached a lookup
  table and raised `KeyError`, i.e. a 500 instead of a 422.
- **A domain invariant goes in the engine that has it.** The exact ICM
  recursion is factorial in the player count, so `MAX_EXACT_ICM_PLAYERS` and
  the finite/non-negative payout rule live in `app/icm/icm_engine.py`, not at
  each call site. Routes parse, the engine validates, one `except ValueError`
  maps to 422. Schemas import that constant rather than repeating `9`.
- `Position` in `game_schemas.py` duplicates the engine's `POSITION_ORDER` by
  necessity (mypy cannot verify a computed `Literal`); a test pins the two
  together so the vocabulary cannot drift from the seats actually dealt.

## 4. Session lifecycle

`GameSession.status` is set to `"active"` and never changes — there is no
terminal state, and nothing reaps a finished table. Until that is fixed,
`SessionStore` keeps only a user's most recent `MAX_TABLES_PER_USER` (20)
tables; without the cap every `POST /api/tournament` leaked a nine-player table
for the life of the process. The number is a guess, not a measurement.

`SessionStore` owns the registry and the A06 label allocator. Reach tables
through it — `main.py` and `routes_meta.py` used to import a router's private
`_sessions`, one of them through a function-local import to dodge the cycle.

## 5. Transport: polling today

The frontend does **not** use the WebSocket. `useGame.ts` polls
`GET /api/game/{id}/state` every 350 ms; the `/ws/table/{id}` endpoint is
implemented and tested but unused by the client. Each poll takes the session
lock (`timer.tick()` mutates), so at three polls per second per client, polling
now contends with actions.

Replacing it is open work — see the SSE evaluation issue. The honest summary:
state push is one-directional and actions already have REST routes, which is
SSE's shape; the deciding cost is that `EventSource` cannot set an
`Authorization` header, so either the token stays in the query string or the
client moves to `fetch` + `ReadableStream`.

## 6. Card assets

`frontend/public/cards` is **PNG only**. `public/` is copied verbatim into
`dist/` and into the Android APK, and `PlayingCard` resolves only
`cards/<rank><suit>.png`, so the parallel SVG deck that used to sit beside it
was ~7.5 MB nothing loaded. `scripts/import_opendecks_cards.py` regenerates the
deck from the CC0 OpenDecks repository; the vectors are upstream.

Still oversized: the PNGs are the raw 1500×2100 rasters, up to 1.2 MB each and
about ten times their rendered size. Downscaling needs an image tool and a
change to `test_each_png_is_an_opendecks_proportion_1500x2100`.

## 7. Test layers

Three kinds, each gated differently:

| Layer | Needs | Gate |
|---|---|---|
| Unit / API (`TestClient`) | nothing | always runs |
| Real server (`test_ws_concurrency.py`) | a bindable localhost port | skips if `bind()` fails |
| Real database (`test_database.py`) | PostgreSQL + migrations | skips if unreachable; `SKIP_DB_TESTS=1` to force |

Threading tests are **event-driven, never timed**: `tests/concurrency_helpers.py`
provides a `Gate` that parks a caller inside `HandEngine` and a
`WaitCountingLock` that lets a test wait until another thread is provably
blocked on the lock. Do not replace those with `sleep` margins — they flake on
a loaded machine and prove less.

A test that asserts a security property should count work, not clock it: the
enumeration-oracle test counts PBKDF2 derivations.

## 8. Enforced by tests, not by convention

- **200 lines per Python file**, `test_project_setup.py::test_code_files_under_200_lines`.
  Several files sit within a line or two of it, so a change that adds lines
  usually means extracting a module first. That is why `user_registry.py`,
  `settings_schemas.py`, `session_store.py`, `session_coach.py` and
  `tests/concurrency_helpers.py` exist.
- Directory layout, `progress.md` rows, README sections, and the card-asset
  inventory are all asserted; `scripts/check_github.py` runs the same checks.
- **The invariants in sections 1-4 are parsed out of the source** by
  `backend/tests/test_invariants.py`: the session lock, no inline session call
  in an `async def`, no reaching a router's `_sessions`, `require_user` on every
  `table_id` route, one definition of the ICM cap. CI runs it on every push.
