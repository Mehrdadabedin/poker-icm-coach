# ICM Master — Atomic Implementation Plan

## Goal
Modify the existing ICM Master application without rebuilding or breaking the already-working poker/ICM system.

The application must support:
- Username authentication/login.
- A separate game session for each logged-in player.
- The logged-in username displayed everywhere the UI currently says **Hero**.
- Logical table IDs (A–Z initially) so each tournament/session can be tracked independently.
- Independent hand history/cards/game state per player session, even though the UI has only one physical poker table.
- Real playing-card image assets, based on the supplied card screenshot/reference, instead of emoji/simple CSS/text cards.
- Larger, clearer hole cards and board cards.
- A compact post-hand result state showing only the result summary.
- An optional **Review the Hand** action that opens the detailed hand-history view only when requested.
- Diagnosis and correction of the current HTTP 400/CORS/API failure shown in the browser console.

## Non-negotiable safety rules
1. **Do not replace or rewrite the existing system.**
2. Inspect the existing architecture first and make the smallest safe changes.
3. Preserve current poker rules, ICM calculations, bot behavior, tournament structure, chip logic, and existing UI functionality unless explicitly changed below.
4. Do not fake authentication or session isolation with only frontend variables.
5. Do not solve the HTTP 400 by hiding errors, disabling validation, or weakening security.
6. Keep backend and frontend API contracts explicit and backward-compatible where practical.
7. Do not expose one player's cards/history/session to another player.
8. Do not use `Hero` as the logged-in player's identity after login. `Hero` may remain only as a fallback before authentication or in legacy code that is not user-facing.

---

## Atomic tasks

### A01 — Baseline and architecture audit
- Inspect frontend, backend, API routes, game-state storage, persistence, and current hand-history implementation.
- Identify where `Hero` is hard-coded.
- Identify where player/game/session state is global or shared.
- Identify every endpoint used during a hand, especially:
  - `/api/game/{gameId}/action`
  - `/api/game/{gameId}/cache/compare`
  - any game creation/start/reset/history endpoints.
- Document the current frontend → backend request/response contract before changing it.

**Acceptance:** `progress.md` records the relevant files, endpoints, and current state model.

### A02 — Reproduce the HTTP 400/CORS problem
- Reproduce the failure shown in the screenshots.
- Inspect browser Network request, request payload, response body, backend logs, validation errors, and CORS middleware.
- Determine whether the root cause is:
  1. invalid action payload/state causing HTTP 400,
  2. CORS configuration,
  3. stale/incorrect game ID,
  4. frontend/backend contract mismatch,
  5. session/game state corruption,
  6. or more than one issue.
- Fix the actual root cause.
- Ensure all required API responses, including error responses, have correct CORS behavior for the deployed frontend origin.
- Keep local development origins working if already supported.
- Do not use `Access-Control-Allow-Origin: *` if credentials/authentication require a specific origin.

**Acceptance:** normal gameplay can progress through many hands without the 400 error, and intentional validation errors are displayed cleanly without breaking the session.

### A03 — Authentication: username login
Implement the simplest secure authentication appropriate to the existing application architecture.

Minimum behavior:
1. User opens the application.
2. User sees a login screen if not authenticated.
3. User enters a username.
4. Validate/normalize it.
5. Create an authenticated player identity/session.
6. Persist the authenticated session across normal page refreshes where appropriate.
7. Provide logout.
8. Never trust a client-supplied username as permission to access another player's session.

If the existing project already has an authentication provider, reuse it rather than introducing a second system.

**Acceptance:** two different users can log in independently and receive distinct player/session identities.

### A04 — Replace visible `Hero` identity
- Replace user-facing `Hero` with the authenticated username.
- Update:
  - seat label,
  - player display,
  - hand history,
  - result screens,
  - review screens,
  - summaries,
  - any player-specific UI.
- Do not globally replace the word `Hero` in code if it is a legitimate internal concept; change the identity source instead.

**Acceptance:** after login as `Mehrdad`, the UI says `Mehrdad`, not `Hero`.

### A05 — Session model and player isolation
Create a proper session boundary.

Recommended conceptual model:

`User`
→ `TournamentSession`
→ `Table`
→ `Hand`
→ `Action`

Each tournament session must have:
- authenticated user ID,
- display username,
- unique internal session/game ID,
- display table ID,
- creation timestamp,
- status: active/completed,
- current hand number,
- game state,
- hand history.

Do not store active game state in one global singleton shared by all users.

**Acceptance test:** User A and User B can play independently. Actions/cards/history from A never appear in B's session.

### A06 — Table IDs A–Z and repeat tournaments
Implement a logical table identifier.

Initial display IDs:
`A, B, C, ... Z`

Requirements:
- A new tournament/session receives an available table ID.
- A completed tournament can be followed by a new tournament with a new table ID.
- Hand history must store both:
  - internal immutable session/game ID,
  - human-readable table ID.
- Never use the display letter as the only database/session key.
- If more than 26 active logical tables are possible, implement a deterministic extension such as `AA`, `AB`, etc., rather than failing.
- Do not reuse an active table ID.

**Acceptance:** the user can complete one tournament, start another, and the new tournament has a separately trackable table/session history.

### A07 — Persistent hand history per session
- Store each hand under its tournament/session ID.
- Store enough information to reproduce the review:
  - hand number,
  - username/player ID,
  - hole cards,
  - board,
  - pot,
  - stacks/chip changes,
  - actions,
  - showdown information when applicable,
  - result,
  - timestamp,
  - table ID.
- A new login/session must not inherit another user's hand history.
- A completed tournament remains reviewable if the existing product design supports historical sessions.

**Acceptance:** history queries are explicitly filtered by authenticated user/session and cannot return another user's hands.

### A08 — Real card assets from supplied reference
The supplied screenshots contain the desired visual playing-card artwork, including visible heart cards and face cards/card backs.

Use the supplied card artwork/reference as the visual basis for the ICM Master card UI.

Rules:
- Do **not** use emoji cards such as `🂡`.
- Do **not** render cards as plain text like `A♥`.
- Do **not** use the current tiny/simple CSS card treatment.
- Use actual image assets for each card.
- Prefer a reusable card component:
  `PlayingCard(rank, suit, variant/asset)`
- Include all 52 cards plus a card back if the game needs them.
- If the repository already contains card assets, reuse them.
- If assets are missing, create/add a proper local card asset set based on the supplied reference rather than depending on an external URL at runtime.
- Use semantic alt text for accessibility.
- Keep card rendering deterministic: the card identity comes from the game state, not from the image filename alone.

**Acceptance:** hole cards and board cards visibly use actual playing-card artwork and look substantially like real cards rather than text/emoji.

### A09 — Larger card design
Redesign card presentation for readability.

Requirements:
- Hole cards: clearly larger than the current implementation.
- Board cards: also larger and easy to read.
- Maintain responsive behavior on desktop and smaller screens.
- Preserve suit/rank visibility.
- Avoid cards overlapping player labels or table controls.
- Keep the card proportions correct; no stretching.
- Make the hero/player hole cards the visual priority.
- Ensure the new cards remain visible at the poker table without making the table unusable.

**Acceptance:** cards can be recognized immediately in the supplied screenshot-sized desktop layout.

### A10 — Post-hand UX: result first, review optional
Change the current behavior so the detailed Poker Hand History does **not** automatically replace the table after every hand.

After a hand:
- Keep the user on the poker table/result state.
- Show a concise result:
  - `YOU WON`
  - `YOU LOST`
  - `CHOPPED`
- Show chip change and other essential result information.
- Show a clear optional button:
  **Review the Hand**
- Only open the detailed hand history when the player clicks **Review the Hand**.
- Provide a clear way to return to the table and continue.
- Do not lose the hand history when the user does not review it.

The desired flow is:

`TABLE → HAND RESULT (WIN/LOSS/CHOP) → Continue`

Optional:
`HAND RESULT → Review the Hand → Detailed History → Back to Table`

**Acceptance:** the detailed history never appears automatically after every completed hand.

### A11 — Pause behavior
- Preserve the existing pause/play control.
- Pausing must stop automatic gameplay progression without destroying the current session.
- Review is an optional user action and must not accidentally advance the hand.
- Returning from review must restore the correct current table/session state.

### A12 — API/session consistency
- Ensure the frontend always sends the correct authenticated session/game ID.
- Do not let a stale `gameId` point to another user's active state.
- Backend must derive the authorized user/session from authentication, not simply accept an arbitrary user ID from the browser.
- Add clear errors for expired/invalid sessions.
- Ensure a new tournament gets a new session ID and table ID.

### A13 — Regression tests
Add or update tests for:
1. Username login.
2. Logout.
3. Username displayed instead of Hero.
4. User A/B session isolation.
5. New tournament creates a new table ID.
6. Hand history is isolated by session.
7. Card asset mapping for representative cards (A♥, 4♣, 5♣, J♥, Q♥, K♥, etc.).
8. Win/loss/chop result state.
9. Review Hand opens detailed history only when clicked.
10. Continue gameplay after review.
11. Invalid API action returns a controlled error.
12. Repeated hands do not produce the known HTTP 400 failure.

### A14 — Deployment verification
Test the deployed frontend/backend configuration.

Verify:
- `https://icm-master-frontend.onrender.com`
- backend API origin currently used by the project
- authentication/session cookies or tokens,
- CORS,
- preflight/OPTIONS behavior if applicable,
- API error responses,
- multiple simultaneous sessions.

Do not claim deployment is fixed until the actual deployed flow has been tested.

### A15 — Documentation
Update `progress.md` after every meaningful implementation milestone.

Include:
- date,
- task ID,
- status,
- files changed,
- tests performed,
- result,
- remaining issues.

Never mark an item complete without verification.

---

## Definition of Done

The change is complete only when all of the following are true:

- [ ] Existing poker/ICM functionality still works.
- [ ] Username login works.
- [ ] Logged-in username replaces visible Hero.
- [ ] Multiple users can use the same deployed application independently.
- [ ] Game state and hand history are isolated per authenticated player/session.
- [ ] Each new tournament receives a trackable table ID.
- [ ] Previous completed tournament history is not mixed with a new tournament.
- [ ] Real playing-card image assets are used.
- [ ] Cards are significantly more visible than the current cards.
- [ ] After each hand, the table/result view remains the main view.
- [ ] Detailed history appears only after clicking Review the Hand.
- [ ] Pause/review/continue do not corrupt game state.
- [ ] The HTTP 400/CORS problem has been diagnosed and fixed at its root.
- [ ] Regression tests pass.
- [ ] Deployed multi-user behavior is verified.
- [ ] `progress.md` accurately reflects the final state.

## Important implementation preference
Make this an incremental modification of the existing project. Before coding, map the current architecture and identify the smallest set of files/components that need changes. Do not replace working poker logic merely to implement authentication, card visuals, session isolation, or the review UX.


## A16 — Optional hand review must not interrupt the live game
- [ ] After every hand, show only the compact WON/LOST/CHOPPED result.
- [ ] Do not auto-open detailed hand history.
- [ ] Add **Review the Hand** as an optional action.
- [ ] If the player does not review, allow immediate continuation to the next hand.
- [ ] Keep the existing blind/level clock running according to the game engine.
- [ ] Review must be read-only and tied to the exact completed hand/session.
- [ ] Returning from review must restore the current table without changing game state.
- [ ] Test WON, LOST, and CHOPPED outcomes.
- [ ] Test several consecutive hands without opening review.
- [ ] Test review → return to table → continue playing.


## A17 — Professional playing-card assets (OpenDecks CC0)
- Replace the generated placeholder card SVGs with the professional 52-card
  OpenDecks deck (public domain / CC0).
- Source: `https://github.com/AustinGabriel/OpenDecks-Public-Domain-and-CC0-Playing-Cards`
- Verify and document the CC0 license.
- Install all 52 standard cards as local SVG assets (no jokers) plus the card back.
- Create a small, clean mapping layer: app card identifier (rank+suit) -> OpenDecks asset.
- Do NOT change card identifiers, deck/shuffle/dealing logic, poker rules, game
  state, authentication, session isolation, ICM, hand history, review, or pause/play.
- Display the cards at the existing table size: professional + clear + correctly
  fitted; do NOT enlarge cards unnecessarily.
- Ensure the two player hole cards fit their container: no clipping/distortion/
  overlap; desktop and responsive/mobile both work.
- Test all 52 assets exist; explicitly verify AS, KH, 8H, 10D, QC, 2C map to the
  correct local assets.
- Run the full backend + frontend regression suites.

## A18 — Registration-first authentication flow (IMPLEMENTED)
- First-time users choose SIGN UP; existing users choose SIGN IN.
- Registration collects username + password + confirm (the existing auth model
  is username-based; no email is required by the backend).
- Validation: required fields, password length (>= 8), password confirmation;
  clear inline errors; no API call for invalid data; duplicate usernames and
  short passwords rejected server-side; clear success message after sign-up,
  then the user proceeds to SIGN IN.
- Sign-in validates registered credentials (constant-time compare); invalid
  credentials yield one generic error (no account hint); valid sign-in issues
  the existing bearer token and continues to the unchanged ICM home screen.
- Passwords are hashed with salted PBKDF2-SHA256 (never stored/logged in
  plaintext); users persist best-effort to data/users.json (blank disables).
- Existing user/session isolation, table IDs, hand histories, logout,
  A02-A17 functionality and OpenDecks cards remain unchanged.
- Backend: app/services/auth.py (UserRegistry), app/api/routes_auth.py
  (/register, /login), app/core/config.py (auth_users_file), tests.
- Frontend: LoginForm SIGN IN / SIGN UP modes with validation, api.ts register/
  password login, scoped auth.css, tests. Verified: backend 400 passed / 4
  skipped; frontend 37 passed; tsc/build/audit clean; live register->login->
  game->logout smoke test passed.

## A19 — WebAuthn / passkey / biometric authentication (PLANNED — NOT IMPLEMENTED)
- Optional passkey/WebAuthn auth on supported mobile/desktop platforms.
- Raw biometric data (fingerprint / Face ID) is never accessed or stored; the
  platform credential authenticates the user.
- Existing username/password login remains available; secure session persistence
  remains. DO NOT IMPLEMENT NOW.

## A20 — Header / user display refinement (PLANNED — NOT IMPLEMENTED)
- "ICM MASTER" stays top-left; "Playing as [username]" moves to the right side of
  the header; LOG OUT stays beside the username; user/logout controls become
  smaller compact rectangular buttons; responsive layout preserved.
  DO NOT IMPLEMENT NOW.

## A21 — Fixed player-card container refinement (PLANNED — NOT IMPLEMENTED)
- Follow-up polish of the player hole-card container beyond the A17 minimum fit
  guarantee (sizing/spacing/responsive refinement). DO NOT IMPLEMENT NOW.

## A22 — Human-readable TABLE labels in Hand History (PLANNED — NOT IMPLEMENTED)
- Display human-readable labels (TABLE A, TABLE B, TABLE C) instead of raw
  internal session ids; the unique internal id stays the source of truth and is
  not replaced. DO NOT IMPLEMENT NOW.

## A23 — Hand History table dropdown (PLANNED — NOT IMPLEMENTED)
- Table selector/dropdown letting the user pick TABLE A/B/C; shows only that
  user's hands from that table; tables and users stay isolated; internal ids
  intact. DO NOT IMPLEMENT NOW.

## A24 — Hand History / review UX refinement (PLANNED — NOT IMPLEMENTED)
- Show authenticated username and selected table label; easy switching between
  the user's own tables; correct hands; no cross-user history; Review the Hand
  opens the correct hand; Back to Table returns to the same session; gameplay
  continues; pause/play correct. DO NOT IMPLEMENT NOW.

## A25 — Regression/acceptance tests for future features (PLANNED — NOT IMPLEMENTED)
- Tests for registration, passkey auth, header refinement, table labels,
  Hand History dropdown, and review UX once those features are implemented.
  DO NOT IMPLEMENT NOW.

## A16 — ICM MASTER public landing page (IMPLEMENTED)

Numbering note: the A16 section above ("Optional hand review must not interrupt
the live game") is a different, already-completed task. This entry is the new
public landing page and keeps the owner-requested label; no existing task was
renamed, reordered or removed.

Goal: a professional public landing page for ICM MASTER that introduces the
product and links into the EXISTING authentication flow, without changing the
existing authentication UI/logic or the poker application.

Scope:
- New public landing page at `/` for a visitor without a session; a signed-in
  user still gets the existing home screen at `/`.
- Header: ICM MASTER (existing gold branding), LOGIN and SIGN UP.
- Hero: "MASTER YOUR TOURNAMENT DECISIONS" with START TRAINING and
  "WATCH HOW IT WORKS" (in-page smooth scroll, no new route).
- Demo section "SEE ICM MASTER IN ACTION": polished 16:9 placeholder that can
  later accept an MP4/WebM clip.
- PLAY / REVIEW / IMPROVE section and a final START TRAINING call to action.
- Responsive desktop, tablet, mobile portrait and mobile landscape.
- Existing ICM MASTER visual identity and the existing NEXORA footer preserved
  (`© 2026 NEXORA — Created by Mehrdad Abedin · v0.0.0+dev`).

Strict exclusions (unchanged by this task): poker functionality and poker-table
layout/CSS, authentication UI and logic, `LoginForm`, Google OAuth, backend and
API, environment variables, Render configuration, dependencies, existing
login/signup UI.

Implementation notes:
- Routing: `/` -> new `LandingPage` when no token, existing `HomePage` when a
  token exists; new `/login` -> existing `HomePage`. No other route changed.
- Zero-touch authentication: SIGN UP, LOGIN and START TRAINING all link to
  `/login`; registration is reached with the login page's own "Sign up" link, so
  no authentication component is modified.
- `frontend/src/pages/LandingPage.tsx` (new), `frontend/src/styles/landing.css`
  (new, `.landing-page` / `.lp-*` only), `frontend/src/App.tsx` (+13/-1),
  `frontend/src/main.tsx` (+1 import), `frontend/tests/landing.test.tsx` (new).

Deployment:
- Branch `FIX-POKERTABLE-LAYOUT-TEST` only; test frontend
  `https://poker-icm-coach-layout-test.onrender.com`. Production
  `https://poker-icm-coach.onrender.com` untouched.


## A17 — Integrate ICM MASTER demo video into the public landing page (IMPLEMENTED)

Numbering note: A17 above ("Professional playing-card assets (OpenDecks CC0)") is
a different, already-completed task; this entry keeps the owner-requested label.
No existing task was renamed, reordered or removed.

Goal: replace the landing page's demo placeholder with the supplied ICM MASTER
demo clip, bundled as a local frontend asset and played by a plain HTML5 player.

Scope:
- Source clip `/home/mehrdad/Downloads/ICM MASATER.mp4` (5,961,614 bytes,
  sha256 2019904ff2ad3fac..., H.264/avc1 + AAC/mp4a, 25.0 s, 3408x1702 = 2:1),
  copied unchanged to `frontend/public/videos/icm-master-demo.mp4`. The file in
  Downloads is untouched.
- The "SEE ICM MASTER IN ACTION" section keeps its heading, its 16:9 container
  and its width; only the placeholder block is replaced by the player.
- Player: `<video controls preload="metadata" playsInline>` with
  `<source src="/videos/icm-master-demo.mp4" type="video/mp4" />`. No autoplay, no
  loop, no poster, no overlay, no external host (no YouTube/Vimeo/CDN).
- `.lp-video-el` uses `object-fit: contain` with a black background, because the
  clip is 2:1 inside a 16:9 slot: it is letterboxed rather than cropped or
  stretched.

Strict exclusions (unchanged): authentication and `LoginForm`, Google OAuth,
backend/API/database/WebSocket/CORS, environment variables, Render
configuration, poker table and all game logic, every other landing-page section,
the NEXORA footer, dependencies.

Deployment: branch `FIX-POKERTABLE-LAYOUT-TEST` and the test frontend only;
production untouched.



## A18 — Win / Lose Analysis inside the Hand History panel (IMPLEMENTED)

Numbering note: A18 above ("Registration-first authentication flow") is a
different, already-completed task from the earlier numbering pass; this entry is
the next ID after A17 (landing video) in the owner-facing numbering. No existing
task was renamed, reordered or removed.

Goal: add a WIN / LOSE ANALYSIS view to the existing right-side HAND HISTORY
panel of the live poker table, derived only from the authenticated table owner's
real completed hands.

Scope:
- View switch in the existing HAND HISTORY panel head (native dropdown, default
  HAND HISTORY). HIDE / SHOW stays and works on both views.
- Data: existing GET /api/game/{tableId}/hands (per-user, per-table). No backend
  change, no new endpoint, no new dependency.
- Rendering: OVERALL PERFORMANCE (win/loss ring donuts, totals, win/loss rates,
  profit/loss), WIN / LOSE BY BLIND LEVEL (green/red stacked bars, live-level
  CURRENT badge), RESULTS BY POSITION (compact ring donuts). Inline SVG/CSS
  only.
- Derivation rules (frontend/src/models/winloss.ts): win = net > 0, loss =
  net < 0, net == 0 neutral outside the split (win% + loss% = 100%); empty or
  neutral-only levels/positions omitted. No hard-coded example values.

Strict exclusions (unchanged): poker table, game engine, ICM, tournament/blind/
timer, hero actions, pause/resume, authentication, session isolation, Review the
Hand, Back to Table, WebMCP, GA4, cookie settings, landing page, mobile layout.

Files: frontend/src/components/ActionHistory.tsx (head + view branch),
TableSidebar.tsx (view state + read-only hands fetch), WinLoseAnalysis.tsx
(new), frontend/src/models/winloss.ts (new), frontend/src/models/game.ts (type),
frontend/src/styles/winloss.css (new), frontend/src/main.tsx (import),
frontend/src/pages/TablePage.tsx (+3 props), tests/winloss.test.ts + .tsx (new).

Deployment: branch FIX-POKERTABLE-LAYOUT-TEST only; not committed, not pushed.


---

## A26 — BOT Profiles + Navigation Cleanup + NEXORA Removal (IN PROGRESS — this task)

Numbering note: next available ID after A25 in this file's numbering pass. The
owner-requested sub-step labels (A01-A13) collide with the original A01-A15
baseline tasks, so the steps below use A26-1..A26-13 in the same order.

Goal: add four selectable human-style BOT profiles that drive the existing BOT
personality at table creation; remove TRAINING from the main menu; add BOT
PROFILES to the main menu; remove visible NEXORA branding (footer only) and keep
the copyright line "© 2026 — Created by Mehrdad Abedin".

Planned steps (each independently verifiable):
- A26-1 Inspect navigation, footer, BOT configuration and table-creation
  architecture (done first, recorded in progress.md).
- A26-2 Remove TRAINING from the main menu ONLY (route/page files preserved).
- A26-3 Add BOT PROFILES to the main menu.
- A26-4 Build the BOT PROFILES page (four profile cards, desktop + mobile).
- A26-5 Define the four profiles (Tight-Aggressive, Loose-Aggressive,
  Tight-Passive, Loose-Passive) with avatars, style, description and a backend
  personality identifier.
- A26-6 Connect selection to table creation: add an optional `profile` field to
  POST /api/tournament and map it onto the AI provider's personality; add the
  two missing archetypes (tight_passive, loose_passive) to personalities.py.
- A26-7 Persist the selected profile with localStorage (existing client-side
  session/config mechanism).
- A26-8 Remove NEXORA from the footer; footer text becomes
  "© 2026 — Created by Mehrdad Abedin".
- A26-9 Update footer assertions in the existing tests.
- A26-10 Run TypeScript checks (frontend tsc --noEmit).
- A26-11 Run existing tests (frontend full suite + backend personality/lifecycle
  subset).
- A26-12 Run the production build.
- A26-13 Regression verification of existing poker functionality (table tests,
  backend game/tournament/personality tests stay green).

Strict exclusions (unchanged): poker rules, betting, dealing, hand evaluation,
ICM, tournament/blind/timer, button movement, SB/BB, player rotation/seating,
BOT action timing, pause/play, authentication, logout, user sessions, hand
history, review-hand, table/session IDs, existing API behaviour, CORS, card
assets, mobile/desktop table layout, WebMCP, GA4, cookie settings, landing page.
The only API change is the OPTIONAL additive `profile` field on tournament
creation (backward compatible).

Deployment: branch FIX-POKERTABLE-LAYOUT-TEST only; not committed, not pushed.

---

## A27 — Multi-BOT Profile Selection and Practice Opponent Builder (IN PROGRESS — this task)

Extends A26: START PRACTICE first asks RANDOM OPPONENTS or CHOOSE OPPONENTS;
CHOOSE opens BOT PROFILES, which becomes a multi-BOT lineup builder (add/remove
counts per personality, max 8 = all opponent seats, same personality may repeat).
The complete lineup is sent to table creation so each BOT seat gets its own
personality; RANDOM keeps the existing behaviour exactly.

Planned steps:
- A27.1 Inspect existing A26 BOT profile and table-creation architecture.
- A27.2 Add the opponent-selection choice to START PRACTICE (new /start screen).
- A27.3 Preserve RANDOM opponents behaviour exactly (legacy single-profile path).
- A27.4 Add the CHOOSE OPPONENTS flow (opens BOT PROFILES).
- A27.5 Extend BOT PROFILES from single selection to a multi-BOT builder.
- A27.6 Allow multiple instances of the same BOT profile.
- A27.7 Enforce maximum 8 BOT opponents (and minimum 0 per profile).
- A27.8 Add BOT counts and add/remove controls (+/-).
- A27.9 Connect the selected BOT composition to table creation (backend per-seat
  personalities via an optional `bots` list on POST /api/tournament).
- A27.10 Update navigation/UI for BOT PROFILES (BACK top-right).
- A27.11 Add regression + feature tests (frontend + backend).
- A27.12 Run TypeScript checks.
- A27.13 Run the production build.
- A27.14 Run backend tests.
- A27.15 Verify existing poker functionality is unchanged.

Strict exclusions (unchanged): dealing, deck, betting, fold/call/check/raise,
all-in, pot, rotation, seats, Button/SB/BB, blinds, tournament progression, ICM,
timers, pause/play, fast mode, authentication, sessions, hand history, review,
card assets, table layout, existing random BOT behaviour. Existing default paths
(no `bots`/`profile` supplied) behave exactly as before. The only additions are
additive optional request fields and per-seat personality plumbing on the AI
provider (no engine/rule changes).

Deployment: branch FIX-POKERTABLE-LAYOUT-TEST only; not committed, not pushed.

---

## A28 — Display BOT profile names at the poker table (IN PROGRESS — this task)

When a custom BOT lineup/profile is supplied, the visible BOT names become the
profile's human name with a per-profile occurrence number (Alex 1, Alex 2,
Sarah 1, David 1..3, Emma 1..2), instead of "Bot N". Random mode (no
lineup/profile) keeps "Bot N" exactly. Cosmetic only: player/seat/session IDs,
hand-history identity and all engine logic are unchanged.

Steps:
- A28.1 Inspect A27 lineup -> player construction and seat name rendering.
- A28.2 Add display-name mapping + per-profile numbering helper (backend).
- A28.3 Apply display names to the 8 BOT seats when a lineup/profile is given
  (random mode untouched).
- A28.4 Add backend naming tests (repeat profiles, mixed lineup, no-lineup
  fallback, single-profile case, identity uniqueness).
- A28.5 Add a table display test for the profile names.
- A28.6 Run frontend + backend tests, tsc, production build.
- A28.7 Visual check of a lineup table (names fit existing seats).

Strict exclusions (unchanged): dealing, betting, fold/call/check/raise, all-in,
pot, player rotation, Button/SB/BB, blinds, tournament progression, ICM, timers,
pause/play, hand history, review, authentication, session/table/player IDs,
layout. Default random path unchanged.

---

## A29 — Integrate BOT profile portrait images (IN PROGRESS — this task)

Use the four finished portrait assets (frontend/public/images/bot-profiles/
alex.png, sarah.png, david.png, emma.png) as the avatars in the BOT PROFILES
cards, replacing the initials circles. Keep names, styles, descriptions,
counters, summary, ADD BOTS TO TABLE and BACK; preserve each profile's colored
identity (green/blue/purple/red). Cosmetic only.

Steps:
- A29.1 Inspect the A27 BOT PROFILES card rendering.
- A29.2 Ensure the four portraits are served from frontend/public/images/
  bot-profiles/ .
- A29.3 Render the portrait image in each card (consistent circular
  presentation, coloured border/background retained).
- A29.4 Update the focused frontend test to assert the portrait src.
- A29.5 Run frontend tests, tsc, build; relevant backend subset.
- A29.6 Visual check desktop + mobile (no horizontal overflow).

Strict exclusions: poker engine, player/seat/session IDs, authentication,
tournament/betting/ICM/timers/hand history, A28 display names, table behavior.
Images are used as-is (not regenerated or edited).

---

## A31 — Fix silent 401 session failure on ADD BOTS TO TABLE (IN PROGRESS — this task)

When ADD BOTS TO TABLE receives HTTP 401 (stale in-process session token), the
frontend no longer swallows the error: it clears the local session, shows
"Session expired — please log in again." on the existing login screen (carried
via router state), and navigates to /login. Non-401 errors keep the previous
behavior.

Steps:
- A31.1 Inspect the addBots/createTournament flow and the AuthError path.
- A31.2 Handle only AuthError(401): clearAuth + navigate("/login", notice).
- A31.3 Surface the notice on the existing login view (HomePage).
- A31.4 Focused frontend test (401 -> message + login redirect).
- A31.5 Run frontend tests, tsc, production build.

Strict exclusions: poker engine, betting, dealing, blinds, ICM, timers, hand
history, player/table/session IDs, BOT personalities, A28 display names, A29
portraits, BOT profile layout, authentication system itself.

---

## A35 — Add BOT profile portraits inside existing poker-table seats (IN PROGRESS — this task)

Visual-only: small circular BOT portrait (30px desktop / 28px mobile) rendered
inside each existing BOT seat via the A28 profile identifier, with a per-profile
colored ring; the human seat is untouched and the seat box/placement/layout are
unchanged. The backend now exposes each player's A28 profile identifier
(additive `profile` field on the player state).

Steps:
- A35.1 Inspect PlayerView/state and seat rendering.
- A35.2 Expose the per-player A28 profile in the state view (backend, additive).
- A35.3 Map profile -> portrait/color (reuse botProfiles assets) and render the
  image inside non-hero seats (absolute, no layout change).
- A35.4 Focused tests (per-profile portrait, repeated profile, hero excluded).
- A35.5 Frontend tests, tsc, build; visual desktop 1440 + mobile 390.

Strict exclusions: dealing, betting, blinds, ICM, timers, hand history, seat/
player/table IDs, authentication, BOT personalities, A28/A29/A31 intact,
poker table geometry.

---
NOTE: Google authentication, Facebook authentication, and Google/Facebook OAuth
are intentionally OUT OF SCOPE and must not be added to this plan or the app.

### A39 — Hero all-in loss / re-entry cutoff / BOT auto-finish (IMPLEMENTED)
Re-entry is available only through Level 5, and only by explicit player choice.
- Levels 1-5: an all-in hero reaching zero chips is NOT auto-restored; the
  table shows the re-entry modal (CONTINUE TOURNAMENT -> exactly 45,000 at the
  same level via POST /api/game/{id}/reentry; START NEW GAME -> existing home
  flow). BOT re-entries during levels 1-5 stay automatic.
- Level >5: zero chips eliminates the hero permanently (no re-entry) and the
  remaining BOTs auto-finish the existing tournament (accelerated auto-next,
  review not auto-opened) until the existing champion state is produced and the
  existing TournamentWinner screen shows the actual champion name.
- Acceptance: L1-L5 re-entry available; no automatic 45,000 restore for the
  hero; CONTINUE TOURNAMENT restores exactly 45,000 and continues; START NEW
  GAME exits via the existing flow; L>5 permanent elimination; BOT auto-finish
  without NEXT/REVIEW clicks; existing champion state used (no new formula);
  existing winner screen intact; normal hero gameplay unchanged; no
  poker/ICM/BOT/tournament rewrite.

### A40 — Tournament endgame reliability / deep all-in stall (IMPLEMENTED)
When a hand leaves zero or one active player, the tournament must finish
through the existing state instead of starting another hand.
- Root cause: `hand_setup.blind_seats` looped forever with a single active
  seat (next_hand started a new hand after the elimination that left one
  player); extreme deep-all-in endgames could also mis-settle.
- Fix: `GameSession.next_hand` stops when toggling <=1 active player (status
  -> finished, lone survivor = existing champion state); `blind_seats` now
  raises ValueError for fewer than two seats instead of spinning.
- Acceptance: 2-player all-in run-out settles; two-player and deep all-in
  endgames finish without IndexError or hang; a BOT champion reaches the
  existing `finished`/champion state with its real name; hero-only survivor
  finishes too; normal multi-player hands and all existing behaviour are
  unchanged; poker/ICM/BOT/tournament rules untouched.

### A42 — Dealer button direction (IMPLEMENTED)
The dealer button must land on the previous hand's small blind every hand.
- Root cause: `dealer_button.next_button()` advanced -1 in seat index while
  every other module (`blind_seats`, `first_action_order`,
  `preflop_first_seat`, `position_for`) walks +1, so the old SB became the
  next BB (observed live: hero SB on hand 37, BB on hand 38). Commit 90f848c
  introduced the -1 direction and its tests pinned the wrong cycle
  (hero SB -> BB -> UTG).
- Fix: `next_button()` advances +1 (mod n), skipping inactive seats; the felt
  placement CSS is mirrored so increasing seat index runs clockwise on screen.
- Acceptance: next-hand BTN == this-hand SB; hero cycle BB -> SB -> BTN -> CO;
  dealer/position tests rewritten to the correct ring; dealing, betting and
  blind amounts untouched; backend + frontend suites green.

### A43 — Positions only for players with cards; busted players leave the table (IMPLEMENTED)
Labels are computed over the ACTIVE seats only (not eliminated, not sitting
out), clockwise from the button.
- Added `positions.position_labels(button, active_seats, num_seats) ->
  dict[int, str]`; inactive seats get no label (None in the state view).
- Short-handed rings drop early positions first and always keep the blinds
  and CO: 8 -> BTN SB BB UTG UTG+1 LJ HJ CO; 7 -> BTN SB BB UTG LJ HJ CO;
  6/5/4/3/2 unchanged. Every label exists in `preflop_ranges.py` /
  `baseline_ranges.py`.
- Every `position_for` production caller switched to the active-aware
  version: game_state_view, decision_context, session_coach, game_session
  (history record), hand_review and bot_review (hand participant seats).
- Frontend: an eliminated BOT is not rendered on the felt at all (no seat
  box, no OUT badge, no position); the hero seat stays visible.
- Acceptance: 8 players left -> exactly 8 labels, none on the busted seat,
  CO present; short ring labels drive the existing range/coach lookups.

### A44 — Hero out: choose to watch or start a new game (IMPLEMENTED)
When the hero is permanently eliminated (after Level 5 / no re-entry), the
table shows a modal (extended `ReentryModal`) with "You finished Nth of 9"
and two actions: WATCH TO THE END (starts the existing A39 BOT auto-finish)
or START NEW GAME (fresh table, same BOT lineup/profile when available, navigates
to the new table, never `/`). Auto-finish does not start until the hero picks
WATCH TO THE END.
- Backend records the hero's finishing place at elimination: place = players
  still alive after that hand + 1; simultaneous busts in one hand place by
  the stack they started the hand with (larger first). Exposed as
  `heroFinishPlace` in the state view and schema.
- Frontend: `useAutoFinish` (gated on the watch choice) and `useTableActions`
  hooks extracted; render body moved to `LiveTableView`; TablePage <= 200
  lines.

### A45 — Tournament end screen (IMPLEMENTED)
At tournament end (one player left) the existing TournamentWinner artwork
shows "CONGRATULATIONS <champion name>"; when the hero is not the champion,
"You finished Nth" is shown too (heroFinishPlace). If the hero won, the
username is the champion name.
- Backend guard: `next_hand()` on a table whose status is not "active" raises
  ValueError (HTTP 400) BEFORE `_record_and_persist()` so a finished table
  can never write a duplicate history line.
- Frontend: the auto-next countdown does not start when a champion exists.

### A46 — Stale coach grade banner (IMPLEMENTED)
The "SUBOPTIMAL - ALL_IN diverges from the recommended FOLD" banner must not
outlive the hand it graded.
- TablePage clears the comparison state when `handNumber` changes; vitest
  `tests/table_banner.test.tsx` (renders TablePage with a mocked api/useGame)
  proves the banner disappears on the next hand.
- `registerGameTools.ts:368` console.error removed (registration failures are
  silently dropped); the file is split into webmcpTypes/webmcpTools/
  webmcpViews so every touched source file stays within the 200-line cap.
### A47 — ICMBOT landing page rebuild (IMPLEMENTED)
Rebuild the public landing page from the A47 spec (RGBA reference) and split it
into components, each under the 200-line cap. The palette is dark (#07080A /
#0C0E13 bands, cards #12151C with #232836 borders, gold #F2B33D, blue
#0B6CF0), Archivo headings + Instrument Sans body (Google Fonts, system
fallbacks), and the page must work at 375 px with no horizontal scroll.

- Header: solid #07080A (nothing shows through), logo left, links "What is
  ICM" / "How it works" / "Opponents" / "FAQ" hidden on phones, LOGIN (gold
  outline) and SIGN UP (blue #0B6CF0) right.
- Hero, two columns. Left: kicker "TOURNAMENT POKER TRAINER", h1 "MASTER YOUR
  TOURNAMENT DECISIONS", the 8-bot/ICM-coach sub line, START TRAINING FREE
  (gold -> /login) and WATCH DEMO (outline, scrolls to the video), and the
  "Practice only, no real money" line. Right: crop
  public/images/ICMBOT_target_hero.png to x 772-1665 (baked text ends at
  x 758 and the aces start at x 793, so both aces stay fully visible),
  y 106-905, save as public/images/hero-robot.webp with at most a 12px edge
  blend (no 200px fade). The invisible click areas over the old artwork are
  removed. Second pass (post-#22 review, matched against the mockup): header
  nav links became smooth scroll buttons (the app is a HashRouter, so
  anchors would change the route) with scroll-margin-top for the sticky
  header; header + hero content sit on a ~1240px centred column; the final
  CTA is one rounded card (#12151C, 1px #2B3142, 24px radius) with the
  champion artwork filling the right half; the footer is a single row
  (tagline left / links centre / copyright right, stacked on phones);
  og:url and og:image use https://icmbot.one; the "Practice only..." line is
  left-aligned under the hero buttons.
- Video section "SEE ICM BOT IN ACTION" right under the hero; keep the current
  player and poster (a new video replaces the file later).
- "TRY ONE SPOT" quiz (v2, fixed after PR review): a real bubble spot for
  this app — 4 players left, 3 paid (the engine's BUBBLE stage), payouts
  50/30/20, hero KJo 14 BB in the big blind, the chip leader (40 BB) shuffled
  from the SB, one short stack at 3 BB. CALL / FOLD reveal the coach's answer:
  the action, the ICM pressure and a plain 1-2 sentence explanation, plus
  whether the pick matched the coach. The answer comes from the backend
  coach/ICM engine for this exact spot and is pinned by a test
  (backend/tests/test_landing_spot.py); the copy is written from the engine
  result, never a guess, and shows no raw reasoning string or "Est. equity".
- "THE COACH": a real screenshot of the table with the coach panel (Playwright,
  demo user "Hero", WebP under 150 KB) plus 3 points: one clear action, the
  reason in one line, and the tournament picture (ICM pressure, bubble, stack
  band, risk premium, pot odds, SPR).
- "HOW IT WORKS" (sign up or Google / choose opponents / play and get graded
  PREFERRED / ACCEPTABLE / SUBOPTIMAL), "YOUR OPPONENTS" (the 4 bot profiles
  from models/botProfiles.ts with portrait, style, description), "WHAT YOU GET"
  (9 cards), FAQ (real money? ICM knowledge? phone? exact items, no "free"
  question), final CTA with Continue with Google only when
  /api/auth/providers says google, and the footer (tagline, Privacy, Terms,
  Cookie settings, "© 2026 ICMBOT. Practice only.").
- Landing-only WebMCP tools watch_demo / start_training / explain_icm using
  the same register pattern as src/webmcp.
- index.html: title "ICMBOT", meta description, Open Graph tags with a
  1200x630 image, user-scalable=no removed.
- Delete the unused videos in public/videos (keep only the one the page uses
  and its poster); convert the large PNGs used here to WebP.
- Update the landing tests. Run all gates (backend pytest + ruff + mypy,
  frontend vitest + tsc + oxlint + build, 200-line audit).


### A48 — Landing hero fold fix + reproducible promo video (IMPLEMENTED)
Two steps, tested live in a browser.
- Step 1 (hero fold): the hero must end above the fold on short desktop
  heights. `.lp-hero` gets padding-top 16px / padding-bottom 40px (was
  ~75px top); `.lp-hero-inner` becomes a full-width box with
  `padding-inline: clamp(20px, 4vw, 48px)`, `gap: 48px`, `align-items:
  center`; above 900px `.lp-hero-img` is a fixed-height cover
  `clamp(340px, calc(100svh - var(--lp-header-h, 77px) - 56px), 560px)`
  with `object-position: 0% 50%` and a 16px radius so both aces stay
  visible; below 900px the image keeps its natural aspect. The header
  height is exposed as `--lp-header-h` instead of a hard-coded 77px.
  Verified at 1245x650 (hero bottom above the fold, text 48px from the
  left, aces fully visible), 1440x900 and 375x812 (unchanged, no
  horizontal scroll).
- Step 2 (promo video): `scripts/record-promo/` Playwright recorder that
  drives the running app (backend + vite dev) only through the WebMCP
  tools (a stand-in document.modelContext injected via addInitScript,
  tools collected on window.__webmcp), following the coach panel each
  turn. It records 1920x1080, ~60-75s: landing hero -> TRY ONE SPOT
  reveal -> login -> opponent choice -> 4-5 hands (coach panel, dealer
  button BB -> SB -> BTN) -> hand review -> sidebar overall performance ->
  champion screen (dev-only ?testWinner=true&testWinnerName=Hero). The
  cookie consent is pre-set in localStorage (no banner clicks). ffmpeg
  produces an H.264 MP4 under 10 MB with one burned-in caption per scene
  and a WebP poster; optional piper-tts voice-over only if it installs;
  no music. Output lands in public/videos/ICMBOT_promo.mp4 (+ poster),
  the landing demo slot points at them, the old clip and poster are
  deleted, and `npm run record:promo` re-runs the whole pipeline from an
  empty state.
