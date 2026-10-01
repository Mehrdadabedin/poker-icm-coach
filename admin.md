# ICM BOT — Admin Area Implementation Plan

Branch: `FIX-POKERTABLE-LAYOUT-TEST`
Status: PLAN ONLY — no code implemented.
Companion docs: `prime-agent-spec/atomic_plan.md`, `progress.md`, `plans/NNN_*.md`,
`frontend/src/models/botProfiles.ts`, `backend/app/ai/personalities.py`.

## 1. Purpose

Add an extensible Admin area to ICM BOT, additive only. Admin v1 provides:

1. Secure Admin authorization (backend-enforced).
2. Registered-account visibility (read-only, safe fields).
3. Dashboard metrics (headline: Total Registered Accounts).
4. Poker activity monitoring foundation.
5. Management of the EXISTING BOT Profiles.
6. An extensible shell for future Admin sections.

Admin v1 must not change existing poker/ICM/game/auth behavior.

## 2. Current Architecture (confirmed by read-only discovery)

### User account store
- Runtime store: `data/users.json`, resolved against the backend root
  (`backend/data/users.json`). Default: `settings.auth_users_file`
  (`backend/app/core/config.py`), bound in
  `backend/app/api/routes_auth.py` (`auth_registry.bind_path(...)`).
- Implementation: `UserRegistry` (`backend/app/services/user_registry.py`).
  Username-keyed dict; entries are `{salt, hash}` (password accounts) or
  `{provider, subject, email}` (Google-linked accounts).
- Account identity: the normalized username is the persistent account key.
  No numeric id, no created_at/updated_at/last_login/active fields exist.
- Persistence: file-backed; loaded on startup, saved on register and
  register_external. Survives restarts. Single uvicorn worker only.
- Session store: `data/sessions.json` (bearer tokens, `AuthStore` in
  `backend/app/services/auth.py`); tokens are opaque, revocable, 7-day TTL.

### Registration / login
- `POST /api/auth/register` → `routes_auth.register()` →
  `UserRegistry.register()` (PBKDF2-SHA256, salted) → `AuthStore.login()`.
  Registration authenticates immediately and returns a token.
- `POST /api/auth/login` → verify → `AuthStore.login()` → token + username.
- `POST /api/auth/logout` revokes the token.
- `GET /api/auth/me`, `GET /api/auth/providers`, and
  `GET /api/auth/google/{start,callback}` (Google OAuth) complete the auth API.
- Authorization: `require_user` (`backend/app/api/deps.py`) is the only gate.

### PostgreSQL status
- SQLAlchemy/Alembic infra exists (`backend/app/database/session.py`,
  `backend/app/models/*`, `backend/alembic/`, plan 033) but is NOT used at
  runtime. There is no users/accounts table. `users.json` is the source of
  truth for accounts. PostgreSQL migration is a future option only (section 15).

## 3. User Access Levels

| Level | Who | Can access | Cannot access |
|---|---|---|---|
| LEVEL 0 | Unauthenticated | public pages, login, registration | authenticated features, Admin APIs, Admin dashboard |
| LEVEL 1 | Normal user | existing ICM BOT/poker functionality, own data, own settings | Admin dashboard, Admin APIs, other users' data, Admin metrics, BOT Profile administration |
| LEVEL 2 | Admin | Admin dashboard, Users, Poker Activity, BOT Profile Management, future sections | (delegated operations still enforced by Admin APIs) |

There is currently NO admin role/permission mechanism. A01 defines the
smallest safe Admin authorization compatible with the current auth
architecture. Admin access must be enforced by the backend; frontend-only
hiding, a secret URL, or menu hiding alone is never sufficient.

## 4. Admin Information Architecture

```
ADMIN
├── 📊 Dashboard            (Total Registered Accounts, Google, Local, future metrics)
├── 👥 Users                (User List, Search, User Details — safe fields only)
├── ♠️ Poker Activity       (foundation for tables created / hands played / tournaments)
├── 🤖 BOT Profiles         (Existing: Alex, Sarah, David, Emma. Add / Edit / Config)
└── ⚙️ Future Admin Sections (pluggable, additive)
```

Alex, Sarah, David and Emma already exist and are in use by the BOT Profiles
flow and poker-table assignment. They are existing profiles, not placeholders.

## 5. BOT Profile Management — Requirements

- Admin must manage the EXISTING BOT Profile system (view / add / edit).
- Admin edits: display name, portrait/image, behavior/style where supported
  by the existing architecture; saved through protected Admin APIs.
- Changes must flow into the existing BOT Profiles selection flow and into
  poker-table BOT assignment.
- The Admin frontend must NOT duplicate the profile definitions.
  One shared source of truth. No Admin-only Alex/Sarah/David/Emma list.
- Backward compatibility preserved (see A09 acceptance criteria).

## 6. Current BOT Profile Data Model / Discovery Requirements

THE FOLLOWING IS CONFIRMED ARCHITECTURE (from read-only inspection):

### Frontend profile definitions
- File: `frontend/src/models/botProfiles.ts` — static `BOT_PROFILES` array.
- Profile fields: `id` ("alex"|"sarah"|"david"|"emma"), `name`
  ("Alex"|"Sarah"|"David"|"Emma"), `style` (e.g. "Tight-Aggressive"),
  `description`, `avatar` ({portrait path, identity color}), `backend`
  archetype name (`tag`|`lag`|`tight_passive`|`loose_passive`).
- Portrait assets: `frontend/public/images/bot-profiles/{alex,sarah,david,emma}.png`.
- Consumers: `frontend/src/pages/BotProfilesPage.tsx` (lineup builder),
  `frontend/src/pages/OpponentChoicePage.tsx`,
  `frontend/src/components/PokerSeat.tsx` (portrait via `botProfilePortrait`).

### Backend profile definitions
- File: `backend/app/ai/personalities.py` — `PersonalityProfile` dataclass:
  `name, vpip, pfr, three_bet, aggression, bluff, call_tendency,
  fold_tendency, four_bet, results`.
- `profiles()` returns the archetypes; the four BOT profile archetypes are
  `tag`, `lag`, `tight_passive`, `loose_passive`.
- `profile_for(name)` validates/returns an archetype; unknown names raise
  KeyError (routes_game rejects unknown `bots` entries with 422).
- `PROFILE_DISPLAY_NAMES` maps `tag→"Alex", lag→"Sarah",
  tight_passive→"David", loose_passive→"Emma"`; `display_bot_names()`
  numbers repeats ("Alex 1", "Alex 2", ...).

### How profiles reach a poker table
- `POST /api/tournament` (`backend/app/api/routes_game.py`) validates
  `request.bots` (exactly 8 archetype names) → `GameSession(bot_profiles=...)`
  (`backend/app/services/game_session.py`) →
  `personalities_for_seats(bot_names)` (per-seat fresh copies).
- Seat names: `display_bot_names` at table creation; snapshot carries
  `profile` (archetype name) per player; frontend renders the portrait from it.

### Discovered constraints for Admin profile management
- Profile definitions are STATIC CODE today: frontend array + backend
  personalities module + display-name map + portrait assets. There is no
  persistence and no create/edit mechanism.
- The backend archetype name string is the key that joins frontend selection,
  backend validation, table assignment, and display names.
- Adding a NEW profile therefore requires backend archetype support
  (`profiles()` / validation) in addition to a frontend listing entry.
  This must be its own explicit atomic implementation step (see A09-D).
- This plan does NOT assume profile storage has already been introduced.
  A09-A (discovery) must re-confirm the source before any implementation.

## 7. Security Requirements

Never expose through Admin APIs or UI:
- passwords, password hashes, salts, authentication tokens, session tokens,
  OAuth secrets, OAuth `subject`, or any other authentication material.

Never expose `users.json` internals. The Admin frontend must NEVER read
`data/users.json` directly; all Admin information flows through protected
backend APIs. Response models must include only safe fields (section A02/A03).

## 8. Confirmed Constraints

- `users.json` is the source of truth for accounts; nothing may read it from
  the frontend; nothing may weaken auth.
- Existing auth (register/login/logout/OAuth) stays byte-for-byte unchanged
  in behavior. Admin adds new capabilities, it does not alter auth.
- Admin must count BOTH local (password) and Google-linked accounts.
  Total Registered Accounts = all persistent accounts in UserRegistry.
  This is a permanent core metric, not a one-off.
- No PostgreSQL migration as an Admin v1 prerequisite.
- Existing BOT Profile code, portraits, seat assignment and AI behavior stay
  intact; Admin profile management must be additive and use the shared
  definition source identified in A09-A.

## 9. Atomic Implementation Plan

Task ids A01–A13 are local to this plan. Branch-free numbering: adopt the
next free ids in `prime-agent-spec/atomic_plan.md` (A30, A32–A34, A36–A44)
when these tasks are folded in there; admin.md does not renumber atomic_plan.

### A01 — Admin Access / Authentication
Smallest safe Admin authorization compatible with current auth.
- Add an admin capability to the account store (e.g. an `is_admin` flag on
  JSON entries; new safe `UserRegistry` helpers), seeded for authorized
  operators only.
- New `require_admin` FastAPI dependency layered on existing `require_user`.
- Acceptance: unauthenticated denied; normal users denied; Admin allowed;
  backend enforcement mandatory; existing authentication unchanged;
  no frontend-only protection.

### A02 — UserRegistry Read-Only Helpers
Safe, credentials-free capabilities on `UserRegistry`:
- `count_accounts()`, provider-aware counts (password vs google),
  `list_accounts()` returning ONLY safe fields.
- Acceptance: registration/login unchanged; total count accurate; Google
  accounts included; local accounts included; credentials never returned.

### A03 — Admin Users API
Protected backend endpoints (e.g. `GET /api/admin/users` and
`GET /api/admin/users/summary`):
- total registered accounts, provider counts, safe paginated user list.
- Acceptance: Admin only; normal user 403; unauthenticated 401;
  `users.json` never directly exposed; no credentials in any response.

### A04 — Admin Dashboard Shell
Architectural Admin frontend section:
- routes/sections: Dashboard, Users, Poker Activity, BOT Profiles, Future.
- Extensible section registry (each section renders from a known list).
- Acceptance: Admin-only; extensible without restructuring; existing app
  navigation and poker UI unaffected.

### A05 — Dashboard User Metrics
- Total Registered Accounts (= all persistent accounts in UserRegistry),
  Google Accounts, Local Accounts.
- NOT "active users" or "daily registrations" — those need data that does not
  exist yet (see section 13).

### A06 — Users
- Admin user list + search foundation. Safe fields only:
  `username`, account type (`password`|`google`).
- No credentials, no private OAuth data.

### A07 — User Details
- Safe user-detail view. Do not invent fields that do not exist in the
  actual user store (no email-shares, no last-login, no created_at without a
  store change; those become separate future atomic tasks).

### A08 — Poker Activity Foundation
- Architectural foundation for future Tables Created / Hands Played /
  Tournaments Completed metrics.
- Do not invent metrics that cannot be reliably derived from existing data.
  (Live tables exist in `SessionStore` memory; hand history is JSONL files in
  `data/history`; a reliable activity store does not exist yet — confirm
  derivation before implementing any number.)

### A09 — BOT Profile Management
Covers (each letter independently testable):
- A. Existing profile discovery — re-confirm the shared definition source
  (`frontend/src/models/botProfiles.ts` + `backend/app/ai/personalities.py`
  + portraits) before implementation.
- B. Shared profile data source — introduce ONE persisted source of truth the
  existing UI and backend validation both consume (or, if profile storage is
  deemed out of scope, profile edits are limited to attributes the current
  static definitions support and explicit "no duplicate registry" is kept).
- C. Admin profile listing — safe read of existing profiles.
- D. Add profile — backend archetype support + frontend listing entry;
  portrait asset; validation; protected Admin API. New-profile support in the
  existing BOT Profiles selection flow and table assignment.
- E. Edit profile — display name, description, portrait, style label;
  stable profile ids/references.
- F. Portrait/image management — Admin upload/replace of the profile portrait
  (assets under `frontend/public/images/bot-profiles/`), URL updates in the
  shared source; existing portraits keep resolving.
- G. Behavior/style configuration — only fields the current architecture
  supports (archetype selection and/or bounded tendency edits that map onto
  `PersonalityProfile`); any new behavioral field becomes its own atomic task.
- H. Protected Admin APIs — all profile mutations require `require_admin`.
- I. Integration with existing BOT Profiles UI — selection flow reads the
  same shared source.
- J. Integration with poker-table BOT assignment — `POST /api/tournament`
  validation consumes the shared source; seat naming (`Alex 1`, `Alex 2`)
  keeps working.
- K. Tests — see A12.
- L. Backward compatibility — see acceptance criteria below.

A09 acceptance criteria (all required):
- Alex, Sarah, David and Emma remain available and unchanged in behavior.
- Existing BOT Profiles UI continues to work.
- Admin can view, add, and edit profiles.
- Profile changes are persisted using the application's actual
  profile-data mechanism (never a duplicate Admin-only registry).
- Newly added profiles can appear in the existing BOT Profiles selection flow.
- Newly added profiles can be used for poker-table BOT assignment.
- Existing tables remain compatible with existing profile ids.
- Editing a profile does not change its id/reference.
- Existing profile portraits continue to resolve.
- Duplicate selection still names seats correctly (`Alex 1` / `Alex 2`).
- Normal users cannot create or modify profiles (backend-enforced).
- Poker engine, ICM, dealing/betting/pot/blinds, tournament progression and
  existing BOT behavior are not modified.

### A10 — Extensible Admin Sections
- New Admin modules register into the shell without restructuring it
  (section list, route map, nav entry).
- Acceptance: adding a placeholder section requires no changes to existing
  sections; dashboard remains functional.

### A11 — Security Hardening
- Backend authorization on every Admin route; safe response models;
  credential exclusion; direct user-store protection; no data-file reads by
  the frontend; generic error handling (no store internals leaked).

### A12 — Tests
Backend (new `backend/tests/test_admin_*.py`) and frontend
(`frontend/tests/admin_*.test.tsx`), covering:
- unauthenticated denied; normal user denied; Admin allowed;
- user count; provider count; safe user data; no credential leakage;
- BOT Profile Admin authorization; profile add; profile edit;
- existing profiles remain available; existing BOT selection still works;
- existing poker behavior unchanged.

### A13 — Deployment / Verification
- Frontend tests green (`cd frontend && npx vitest run`).
- Backend tests green (`cd backend && uv run pytest`), including new Admin
  tests; `ruff check` + `mypy` on changed files.
- Production build green (`cd frontend && npm run build`).
- Local verification checklist (Admin sign-in, dashboard, users, profiles).
- Render test deployment verification (project convention), manually
  smoke-tested; no production deployment unless explicitly requested.
- Update `progress.md` and `prime-agent-spec/progress.md` per project
  convention (additive rows only; those files are NOT part of this task).

## 10. Acceptance Criteria (plan-level)

- Admin is a distinct authorization level; normal users cannot access it.
- Total Registered Accounts = all persistent accounts (local + Google).
- Alex/Sarah/David/Emma treated as EXISTING profiles, never placeholders.
- Admin can eventually add and edit profiles via the shared source.
- No duplicate BOT Profile registry anywhere.
- New profiles can eventually flow into the existing selection flow and
  table assignment.
- Existing poker/ICM functionality protected from change.
- PostgreSQL migration clearly future / outside Admin v1.
- Future growth metrics never presented as currently available.
- Security requirements explicit and enforced server-side.
- Every atomic task independently testable.

## 11. Test Strategy

- Unit: registry helpers (count/list/safe fields), Admin dependency
  (401/403/200), Admin API schemas, profile CRUD and validation.
- Integration: full Admin flow against real backend (mirroring
  `frontend/e2e/tournament.spec.ts` style), including BOT Profile add/edit
  reaching the existing selection and table flows.
- Regression: existing suites must stay green (521 backend / 121 frontend
  today) — Admin additions must not modify them.

## 12. Deployment / Verification

See A13. Default: no production deployment. If a Render test deployment is
requested, verify health, Admin access control, and the dashboard manually,
then report.

## 13. Future Growth Metrics

Design the dashboard so future metrics can be added. The following do NOT
currently exist and must NOT appear as live numbers:
registrations today/week/month, registration growth, active/returning users,
tables created, hands played, tournaments completed, BOT profile usage,
session frequency.

Implementing any of them requires the underlying reliable data first.
Registration/activity timestamps become a separate future atomic task
(no store field exists today).

## 14. Future PostgreSQL Migration

FUTURE — Optional Account Store Migration (outside Admin v1).

The current account store is `users.json`. A future migration to PostgreSQL
may be considered if future requirements justify it. The Admin data-access
layer should abstract the underlying store, so the Admin frontend never
depends directly on JSON or PostgreSQL. This is a separate plan, not a
prerequisite for Admin v1.

## 15. Progress Tracking

Same legend as `progress.md`: ⬜ Not started / 🟡 In progress / 🟢 Verified
complete / 🔴 Blocked. Rows are added to the project progress files when
atomic tasks are implemented (not part of this planning task).

| ID | Task | Status |
|---|---|---|
| A01 | Admin Access / Authentication | ⬜ |
| A02 | UserRegistry Read-Only Helpers | ⬜ |
| A03 | Admin Users API | ⬜ |
| A04 | Admin Dashboard Shell | ⬜ |
| A05 | Dashboard User Metrics | ⬜ |
| A06 | Users | ⬜ |
| A07 | User Details | ⬜ |
| A08 | Poker Activity Foundation | ⬜ |
| A09 | BOT Profile Management | ⬜ |
| A10 | Extensible Admin Sections | ⬜ |
| A11 | Security Hardening | ⬜ |
| A12 | Tests | ⬜ |
| A13 | Deployment / Verification | ⬜ |

## Definition of Done (plan-level)

All A01–A13 tasks verified with their acceptance criteria, existing suites
green, Admin access enforced server-side, no credential leakage, no
duplicate profile registry, BOT Profiles and poker behavior unchanged.
