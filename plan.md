# Login UI + Google Authentication Plan

Branch: `fix/tournament-settings-500` (all work stays here; `main` is never touched)
Reference design: `loginUI.png` (1024x1536, visual source of truth)
Functional source of truth: the existing ICM MASTER auth (username + password,
bearer tokens, `data/users.json` / `data/sessions.json`)

Status: implemented and verified. Not committed yet (the owner asked for a
review before the commit).

## Phase 1 - Repository inspection

- [x] Inspect existing authentication architecture
      (`app/api/routes_auth.py`, `app/services/auth.py`,
      `app/services/user_registry.py`, `app/api/deps.py`)
- [x] Inspect current login page (`src/components/LoginForm.tsx`,
      `src/pages/HomePage.tsx`, `src/styles/auth.css`)
- [x] Inspect signup flow (`POST /api/auth/register`, `LoginForm` signup mode)
- [x] Inspect Google authentication: NOT PRESENT (no route, no dependency,
      no config, no frontend button)
- [x] Inspect Apple authentication: NOT PRESENT
- [x] Inspect phone/SMS authentication: NOT PRESENT
- [x] Inspect environment configuration (`.env.example`, `app/core/config.py`)
- [x] Inspect authentication tests (`backend/tests/test_auth_and_isolation.py`,
      `backend/tests/test_auth_hardening.py`, `frontend/tests/login.test.tsx`)

## Phase 2 - Login UI

- [x] Rebuild the unauthenticated Home view to match `loginUI.png`
- [x] Title + gold underline + subtitle, no "Welcome back."
- [x] Provider buttons: phone, Google, Apple
- [x] "or" separator
- [x] Email or username input, password input with visibility toggle
- [x] Large blue "Sign in" button
- [x] "Don't have an account? Sign up"
- [x] Footer "PRACTICE - IMPROVE - WIN" with gold underline
- [x] Keep every existing handler and testid the auth tests rely on
- [x] Responsive layout + keyboard focus + aria labels
- [x] Geometry measured from the mockup and reproduced to 2px (see progress.md)

## Phase 3 - Google

- [x] Confirm Google auth state (absent) - done in Phase 1
- [x] Implement real OAuth 2.0 / OIDC authorization-code flow, server side
- [x] `GET /api/auth/providers` so the UI knows what is configured
- [x] `GET /api/auth/google/start` (state + redirect to Google)
- [x] `GET /api/auth/google/callback` (code exchange, ID token claim checks,
      user link/create, ICM MASTER token, redirect back to the app)
- [x] Link Google subjects to existing users without duplicates
- [x] Frontend: wire "Continue with Google" + `/#/auth/callback` route
- [x] Tests: start/callback/state/linking/provider endpoint (13 passed)
- [x] Document required env vars (no secrets in git)

## Phase 4 - Apple

- [x] Keep the Apple button (part of the reference design)
- [x] No Apple provider: show "Apple sign-in isn't available yet..." notice
- [x] Do not start a broken OAuth flow; no paid Apple Developer work

## Phase 5 - Phone

- [x] Keep the phone button (part of the reference design)
- [x] No SMS provider: show "Phone sign-in isn't available yet..." notice
- [x] No SMS account, no billing, no fake OTP

## Phase 6 - Testing

- [x] Backend: existing login/register/logout/me still pass
- [x] Backend: new Google auth tests pass
- [x] Frontend: login UI tests (updated) pass
- [x] Frontend: signup, invalid credentials, provider notices, callback
- [x] Lint + types: `ruff`, `mypy`, `tsc --noEmit`; `oxlint` clean for the new
      files (one pre-existing error in `tests/useAutoNext.test.tsx`)
- [x] Manual run: render the login page and compare with `loginUI.png`
- [x] Session persistence: reload keeps the session, logout clears it
- [x] Real browser run against a local backend: sign up, reload, log out,
      sign in, wrong password, START PRACTICE

## Phase 7 - Final verification

- [x] Run backend tests (36 passed across auth + tournament regression files)
- [x] Run frontend tests (54 passed, 9 files)
- [x] Run lint / type checks
- [x] Verify the login works manually (username/password, signup, Google gating)
- [x] Verify no secrets were added (`.env.example` documents empty values only)
- [x] Verify only intended files changed (no tournament/game file touched)
- [ ] Commit on `fix/tournament-settings-500` only - WAITING for the owner's go-ahead

## Scope guards

- No changes to tournament logic, ICM engine, poker calculations, session or
  tournament settings, or unrelated APIs.
- No paid service, no purchased provider, no billing.
- Google is the only new provider.


---

# Task: red Google-unavailable message, then Google OAuth repair (2026-09-14)

Two strictly separated phases. Phase 1 touches styling only; Phase 2 touches
OAuth only. Small and atomic on purpose.

## Phase 1 - style the Google unavailable message as an error

- [x] Read `plan.md` and the existing auth implementation (done above)
- [x] Locate the message: `AuthMessages.tsx` renders it as
      `<p class="auth-notice">` with the text from `providerNotice()` in
      `ProviderButtons.tsx`
- [x] Add a tone so only the Google notice turns red
      (`AuthMessages.tsx`, `LoginForm.tsx`, `ProviderButtons.tsx`)
- [x] Add `.auth-notice-error { color: #ff6b6b; }` to `auth.css` (text only:
      box, spacing, size and wording unchanged)
- [x] Test assertion: the Google notice carries the error tone, Apple/phone
      keep the neutral tone
- [x] Frontend tests + type check + production build
- [x] Commit `fix: style Google sign-in error message` (styling only)

Out of scope for Phase 1: OAuth logic, endpoints, callback, credentials, env
vars, sessions, CORS.

## Phase 2 - repair Google sign-in (investigation first)

- [x] 2.1 Frontend handler: `googleSignInUrl()` -> `${VITE_API_URL}/api/auth/google/start?redirect_uri=<origin>/#/auth/callback`; the pill only navigates when `/api/auth/providers` says google:true
- [x] 2.2 Backend: `routes_oauth.py` + `google_oauth.py` traced end to end (start, state, code exchange, claim checks, user link, token mint, redirect) - correct
- [x] 2.3 Configuration: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from the environment (`app/core/config.py`); neither is set on the deployed backend or in `backend/.env`
- [x] 2.4 Expected redirect URI: `https://poker-icm-coach.onrender.com/api/auth/google/callback` in production (verified with proxy headers), `http://127.0.0.1:8000/api/auth/google/callback` locally
- [x] 2.5 Render environment cannot be read from here; its behaviour is observable: `/api/auth/providers` returns google:false and `/google/start` returns 503
- [x] 2.6 Callback verified with a faked token endpoint: state consumed once, claims checked, user linked, token minted, 302 to `/#/auth/callback?token=..&username=..`
- [x] 2.7 The minted token is accepted by `GET /api/auth/me` (200) and the frontend stores it from the fragment; same bearer-token scheme as password login
- [x] 2.8 CORS is not the failure: the live backend already echoes `https://icm-master-frontend.onrender.com`
- [x] Evidence: production `providers` -> `{"google":false,...}` and `start` -> 503 "google sign-in is not configured" (missing credentials)
- [x] Smallest fix: name the missing variables (never values) in `providers` and in the 503 detail; flow untouched
- [x] 48 backend tests, 54 frontend tests, tsc, build, live harness probes
- [x] Commit `bc3fb39 fix: repair Google OAuth authentication` (Phase 1 was `055f385`)

## Phase 3 - compact login package (layout + red errors + gold copyright)

- [x] Root cause of the oversized page: `--k` scaled by viewport WIDTH only, so
      on a wide desktop it locked to the full mockup pixel size (716x1021 at
      1440x900, taller than the viewport)
- [x] Fix: `--k: clamp(0.5px, min(calc(100vw / 1024), calc(100vh / 1536)), 1px)`
      - the composition keeps the mockup's share of the frame; no transform,
      no zoom, no JS
- [x] All login messages share one red style: `.auth-error` and `.auth-notice`
      use `--auth-red` (#ff6b6b) with a subtle red tint and border; the
      Google-only `noticeTone` plumbing is removed
- [x] Copyright line uses `--auth-gold` (#fad15a), wording unchanged
- [x] Verified at 100% zoom: 420x747 @1440x900, 503x898 @1920x1080,
      358x637 @1366x768, centred, no scrolling, identical after a refresh
- [x] Google/Apple/phone notices, credential errors and the gold copyright
      confirmed in a real browser, local and production
- [x] 54 frontend tests, tsc, build, project-setup tests, local auth end to end
- [x] Commit `c8e1d3b fix: refine login layout and error styling`, pushed;
      Render served the matching asset `assets/index-DupqyMOE.css` (byte
      identical to the local build)

## Phase 4 - LOGIN-UI-01..10 (remove phone/Apple pills, match newloging.png)

- [x] LOGIN-UI-01 Inspect `LoginForm`, `ProviderButtons`, `AuthMessages`, `AuthFooter`,
      `HomePage`, `styles/auth.css`; measure `newloging.png` (1665x944)
- [x] LOGIN-UI-02 Phone pill removed from the rendered UI (`ProviderButtons.tsx`)
- [x] LOGIN-UI-03 Apple pill removed from the rendered UI (same file)
- [x] LOGIN-UI-04 Google handler untouched: same `googleSignInUrl()` call, same
      `providers.google` gate, same red notice when Google is not configured
- [x] LOGIN-UI-05 Credential form, validation, password toggle and submit handler
      untouched
- [x] LOGIN-UI-06 Column, pills, inputs, button and footer measured against
      `newloging.png`; scale rule retuned for the shorter two-row layout
- [x] LOGIN-UI-07 Compact width, spacing, typography and vertical balance
      re-measured at 1024x1536, 1665x944, 1440x900, 1366x768, 390x844
- [x] LOGIN-UI-08 Copyright line already gold (`--auth-gold`); re-verified
- [x] LOGIN-UI-09 Responsive check: no horizontal overflow, same hierarchy
- [x] LOGIN-UI-10 Frontend tests, tsc, build, local auth end to end
- [x] Commit `feat: simplify login page UI`

## Phase 5 - MCP diagnostic layer (architecture only, read-only)

- [x] MCP-01 Inspected the project: FastAPI (not Django) + SQLAlchemy/PostgreSQL,
      React + Vite, Render, no `render.yaml` in the repo
- [x] MCP-02 Inspected authentication: `routes_oauth.py`, `google_oauth.py`,
      `google_config.py`, `auth_store`, bearer tokens in localStorage, no cookies
- [x] MCP-03 Location: top-level `mcp/`, own `pyproject.toml`, `[tool.uv]
      package = false`, nothing added to `backend/pyproject.toml`
- [x] MCP-04 MCP Python SDK v2 (`mcp[cli]>=2.2`, FastMCP is `MCPServer` there)
      plus `httpx`; its own `.venv`, ignored by git
- [x] MCP-05 `mcp/server.py`: `MCPServer(name="icm-master-mcp", version="0.1.0")`,
      stdio only, module-level `server` for the Inspector
- [x] MCP-06 `check_backend_health`: `/api/health` plus `/api/auth/providers`
- [x] MCP-07 `check_oauth_routes`: router source scan plus live `/openapi.json`
- [x] MCP-08 `check_google_oauth_environment`: presence by name, never a value
- [x] MCP-09 `check_google_callback_configuration`: expected redirect URI with
      its source, or "cannot determine"
- [x] MCP-10 `check_cors_configuration`: origins, credential flag, frontend relation
- [x] MCP-11 `check_cookie_configuration`: no cookie session here, so it reports
      the bearer-token transport instead of inventing cookie attributes
- [x] MCP-12 `diagnose_google_oauth`: healthy / configuration_error / diagnostic
- [x] MCP-13 61 MCP tests: presence, redaction, malformed input, no-secret proof
- [x] MCP-14 Regression: 52 frontend tests, 43 auth/OAuth backend tests, tsc,
      build; backend suite has 9 pre-existing failures (unrelated, see progress)
- [x] MCP-15 `mcp/FUTURE_TOOLS.md` plus `planned_tools.py`: 15 FUTURE tools,
      none registered, none stubbed
- [x] Verified over real stdio with an MCP client: 8 tools, both credential
      states, no secret in any result
- [x] Not deployed and not pushed: the MCP server is a local development tool

Google OAuth is NOT fixed in this phase. The layer exists to diagnose it next.
