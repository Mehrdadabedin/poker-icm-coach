---
id: 109
title: Rate Limits for Sign-in, Sign-up and the Coach
phase: 8
status: in-progress
depends_on: []
test_file: backend/tests/test_rate_limits.py
implementation_files: [backend/app/services/rate_limit.py, backend/app/api/client_ip.py, backend/app/api/rate_limit_deps.py, backend/app/api/routes_auth.py, backend/app/api/routes_oauth.py, backend/app/api/routes_game.py, backend/app/core/config.py, backend/app/main.py, frontend/src/services/rateLimit.ts, frontend/src/services/api.ts, frontend/src/components/LoginForm.tsx, frontend/src/hooks/useTableCoach.ts, frontend/src/pages/CoachPage.tsx, frontend/src/i18n/messages/en/auth.ts, frontend/src/i18n/messages/es/auth.ts, frontend/src/i18n/messages/en/practice.ts, frontend/src/i18n/messages/es/practice.ts]
---

# Objective

The owner (2 Nov): limit sign-in, sign-up and coach requests. `main` at 93f2ed1 has no rate limit: no
library, no `429` from the backend, no `429` handling in the frontend. This plan stops password
guessing and sign-up spam, stops scripts copying the paid coach in bulk, and stops one client slowing
every other player. The same code and start command must work on any host.

No code is written until the owner approves this plan.

# What is there today

- `POST /api/auth/login`: one password check took 143 ms on the owner's machine (PBKDF2, 200,000
  rounds). The single worker shares its CPU, so a flood slows every table. It already gives one generic
  `401` and does not reveal which accounts exist.
- `POST /api/auth/register`: every new account writes the whole users document. The "already
  registered" error reveals which usernames exist.
- Every sign-in writes the whole sessions document and adds a token that lives 7 days.
- Coach: `require_pro` only. Advice took 1 to 4 ms typically, with one call at 383 ms, on the owner's
  machine. The table makes about 2 requests per decision: advice, then compare. `/api/coach/advice`
  takes any position the caller supplies, so it is the easiest to script.
- `backend/Dockerfile` starts uvicorn with no proxy flags. Uvicorn then trusts `X-Forwarded-For` only
  from 127.0.0.1, so behind a host's proxy `request.client.host` may be the proxy, not the visitor.

# Limits

| Action | Limit | Counted by | Counts |
|---|---|---|---|
| Sign-in | 5 per 15 min | username + IP | failures; a success clears it |
| Sign-in | 30 per 15 min | IP | failures |
| Sign-up | 20 per hour | IP | every attempt |
| Sign-up | 5 per hour, 20 per day | IP | accounts created |
| Google sign-in (`start`, `callback`, `app-exchange`) | 30 per min | IP | every request |
| Table coach (`/game/{id}/coach`, `/coach/compare`) | 120 per min, shared | user | every request |
| Coach page (`/api/coach/advice`) | 30 per min, 1,000 per day | user | every request |

These numbers are starting points, not measured traffic. Each one is an environment setting, so it can
change without a deploy of new code.

# Decisions

- **Client IP does not depend on the host.** One setting, `TRUSTED_PROXY_HOPS`, is the number of proxies
  in front of the app. The app counts that many entries from the right of `X-Forwarded-For`, the part a
  visitor cannot fake. The default is 0: ignore the header and use the connection's address. With fewer
  entries than hops, it uses the connection's address. Moving host means changing this value, not the
  Dockerfile.
- **Never `FORWARDED_ALLOW_IPS=*`.** Uvicorn 0.52.4 then takes the first address in the header. If the
  proxy adds to the header instead of replacing it, the visitor chooses that address and never hits a
  limit.
- An IPv6 address counts as its /64 network, because one household can hold a whole /64.
- **Counters live in process memory:** a sliding window behind a lock, with no new dependency and no
  Redis. The single uvicorn worker makes this correct. A restart resets the counts, which is acceptable.
  A second worker or server needs a shared store, and the tokens and tables must move first anyway.
- Memory is bounded: expired entries are removed, and the oldest are dropped past a fixed key count.
- **No limit by username alone.** Anyone could lock a real player out by failing on purpose. The cost is
  that guessing one password from many IPs is not fully stopped.
- A blocked request returns before the password check, so it costs no hash.
- A blocked request gets `429`, `detail: "too_many_requests"` and a `Retry-After` header in seconds.
- Coach limits count by user, because many players can share one IP on mobile networks.
- Logs hold no password and no full IP or username: a short hash is enough to compare attempts.
- `RATE_LIMITS_ENABLED` turns every limit off without a deploy. It defaults to off, so merging cannot
  lock anyone out before step 6 has set `TRUSTED_PROXY_HOPS`.
- `Retry-After` is listed in the CORS `expose_headers`: the frontend is on another origin and could not
  read it otherwise.
- Attempts count before the password check and a success takes them back, so parallel guesses cannot
  all pass while the first is still hashing.
- `RATE_LIMIT_LOG_CLIENT_IP` logs the header's shape in hashes for step 6.
- `RATE_LIMIT_COACH_MODE` is `log` or `enforce`, and starts as `log`.

# Steps

1. **Client IP.** `client_ip.py`, `TRUSTED_PROXY_HOPS`, and tests for faked headers, too few entries, 0
   hops and IPv6.
2. **Limiter.** `rate_limit.py`: an injected clock so tests do not sleep, the bounded memory and the
   lock.
3. **Sign-in and sign-up.** Dependencies in `rate_limit_deps.py`, applied to the routes above.
4. **Coach.** The same dependencies, in `log` mode. `routes_game.py` has 181 lines, so nothing beyond the
   `Depends` goes there.
5. **Frontend.** `api.ts` has 198 of the 200 allowed lines, so the handling goes in a new
   `rateLimit.ts`.
   - Sign-in and sign-up show "too many attempts, try again in N minutes" in English and Spanish.
   - The table coach clears old advice on `429`. Today `useTableCoach` hides errors, so a player would
     keep seeing the previous decision's numbers.
   - The coach page shows the same message instead of failing silently.
6. **Host value.** Deploy to the test backend with `TRUSTED_PROXY_HOPS=0` and the limits off, and log the
   header's shape with hashed addresses. Sign in from two networks (home Wi-Fi, phone data) and set the
   value that gives two different hashes. Repeat with a faked `X-Forwarded-For` to prove it is ignored.
7. **Turn on.** Sign-in and sign-up limits first. Read the coach logs for a few days with real players,
   adjust the numbers, then set `enforce`.

# Tests

`backend/tests/test_rate_limits.py`, `test_rate_limits_coach.py`, `test_rate_limiter.py`,
`frontend/tests/rate_limit.test.tsx`.

- The sixth failed sign-in from one IP gets `429` with `Retry-After`. A success clears the count.
- Another IP can still sign in to the same account while the first is blocked.
- A blocked sign-in runs no password hash. Count the calls, do not clock them (repo rule).
- A faked `X-Forwarded-For` does not change the key.
- Sign-up stops at the account limit and at the attempt limit.
- One user's coach limit does not affect another user, and the shared table limit covers both routes.
- `log` mode records and never blocks.
- Reverting each limit makes its test fail, with a message naming the cause.
- 9 backend test files use the sign-in routes and share one test client address, so an automatic fixture
  resets the limiter between tests.
- Both suites stay green, and the counts go in `progress.md`.

# Not in this plan

- `/game/{id}/action`, `/next-hand` and the 350 ms state poll. The poll would need a very different limit,
  and these routes are already behind `require_user` and the 20-table cap.
- Hiding the "already registered" error. It needs a different sign-up flow, and the sign-up limit only
  slows that lookup.
- A CAPTCHA, email verification, or a limit at the host or a CDN.
- Portrait and profile uploads, and change-password.
- Browser agents through WebMCP use the same coach routes and get the same limits. Their own rules are
  separate work.

# Open for the owner

- The numbers in the table.
- Whether Terms or Privacy (plan 108) needs a line about using IP addresses briefly for security. This
  has not had a lawyer's review.

# Not verified

- How Render's proxy fills `X-Forwarded-For`, and how production starts the server. Step 6 settles both.
- Timings are from the owner's machine on the `feat/vertical-ad` checkout, whose backend differs from
  `main` in 3 files. Render may be slower. Nothing was load-tested.
- Any limit set outside the code, such as in a host's dashboard.
