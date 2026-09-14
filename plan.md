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
