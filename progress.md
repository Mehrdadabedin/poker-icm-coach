# Project Progress

POKER ICM COACH — 9-player Texas Hold'em tournament practice & ICM coaching system.

| ID | Task | Phase | Status | Tests | Notes |
|----|------|-------|--------|-------|-------|
| 001 | Project Setup | 1 | complete | PASS (9) | structure, tooling, git init |
| 002 | Card Model | 1 | complete | PASS (11) | card primitives |
| 003 | Deck Engine | 1 | complete | PASS (10) | deck: 52 unique, shuffle, draw, reset |
| 004 | Player Model | 1 | complete | PASS (11) | player state, chips, all-in vs elimination |
| 005 | Positions | 1 | complete | PASS (8) | 9-max + 6-max seat->position mapping |
| 006 | Dealer Button Rotation | 1 | complete | PASS (8) | button rotation, skips eliminated |
| 007 | Dealing Engine | 1 | complete | PASS (7) | hole cards, burn, flop/turn/river |
| 008 | Hand Evaluator | 1 | complete | PASS (23) | all categories, wheels, kickers; brute-force validated |
| 009 | Betting Engine | 1 | complete | PASS (14) | legal actions, min-raise, validation |
| 010 | Pot Engine | 1 | complete | PASS (7) | contributions, awards, splits |
| 011 | Side Pots | 1 | complete | PASS (12) | multi-all-in side pots; 10k-trial conservation audit |
| 012 | Tournament Engine | 1 | complete | PASS (15) | blind structure, payouts, 9-seat config |
| 013 | Tournament Timer | 1 | complete | PASS (12) | timer, level-up, fast mode |
| 014 | Hand Engine (Street Flow) | 1 | complete | PASS (7) | full hands; 300-trial conservation audit |
| 015 | React Poker Table | 1 | complete | PASS (8) | 9-seat table, cards, pot, dealer, active states |
| 016 | Hero Controls | 1 | complete | PASS (10) | legal action buttons, bet sizing, call amounts |
| 017 | Computer AI Framework | 2 | complete | PASS (4) | AI framework: info audit, legality clamp |
| 018 | Computer Personalities | 2 | complete | PASS (12) | 8 archetypes, bounded params, adaptive learning |
| 019 | Preflop AI | 2 | complete | PASS (10) | position/depth ranges, 3-bet, jams |
| 020 | Postflop AI | 2 | complete | PASS (12) | board texture, strength/draws, c-bet, pot odds |
| 021 | Opponent Range Estimation | 2 | complete | PASS (8) | opponent stats + adaptive range estimation |
| 022 | ICM Engine | 3 | complete | PASS (10) | exact ICM recursion, bubble effects, not-active |
| 023 | Stack Analysis | 3 | complete | PASS (7) | BB/effective stack, snapshot, rank, bands |
| 024 | Bubble Pressure | 3 | complete | PASS (13) | stage detection, bubble pressure heuristic |
| 025 | Risk Premium | 3 | complete | PASS (7) | risk premium bands, coverage, type labels |
| 026 | Equity Engine | 3 | complete | PASS (9) | enumerate turn/river, MC preflop/flop, labeled |
| 027 | Range Matrix | 3 | complete | PASS (11) | 13x13 matrix, mixed freqs, position/depth |
| 028 | Push/Fold Engine | 3 | complete | PASS (8) | open jam/reshove/call jam via equity vs range |
| 029 | Strategy Coach | 3 | complete | PASS (13) | dynamic recommendations, modes, ICM overlay |
| 030 | Test Mode | 3 | complete | PASS (7) | PREFERRED/ACCEPTABLE/SUBOPTIMAL grading |
| 031 | Hand History | 3 | complete | PASS (6) | records, store, replay, stage filters |
| 032 | Statistics | 3 | complete | PASS (7) | VPIP/PFR/AF, agreement, leaks, position perf |
| 033 | Database (PostgreSQL + Alembic) | 3 | complete | PASS (4) | alembic migration + real PG round-trips |
| 034 | FastAPI + WebSocket API | 3 | complete | PASS (13) | REST+WS, hidden-card security, flows |
| 035 | Android (Capacitor) | 4 | complete | PASS (4) | capacitor platform + docs; SDK build documented |
| 036 | GitHub Repository Preparation | 4 | complete | PASS (3) | README, CI, audit script |
| 037 | Final Testing & E2E | 4 | complete | PASS (3 E2E) | playwright: tournament flow, ranges, coach |
| 038 | Application Rename to ICM Master | 5 | complete | PASS (see session) | renamed to ICM MASTER (Home/Table titles, index.html, Capacitor, FastAPI) |
| 039 | Header Layout + Icon Pause/Play | 5 | complete | PASS (see session) | [HOME] [pause/play] left, ICM MASTER right; icon-only controls |
| 040 | Hand Completion Review Screen | 5 | complete | PASS (see session) | table hides -> POKER HAND HISTORY with result, showdown, auto-next |
| 041 | Bottom-Row Seat Repositioning | 5 | complete | PASS (see session) | seats 3-6 bottom-anchored; no overlap with action controls |
| 042 | GitHub Pages Deployment | 5 | in-progress | BLOCKED (billing) | deploy-pages.yml pushed; run blocked by GitHub account billing lock |
| 043 | Folded-Player Action Eligibility + Showdown Reveal | 5 | complete | PASS (5 new + 330 total) | folded locked out of queue/action, hero-fold resolves with 5-card board, live-only winners |
| 044 | Poker Table Header Alignment | 5 | complete | PASS (layout checks) | HOME+Pause balanced 48px left; ICM MASTER right; responsive |
| 045 | Swap Table Header Position | 5 | complete | PASS (22 vitest, layout checks) | ICM MASTER left; HOME + Pause/Play right; positioning only |
| 046 | Tournament Blind Structure (21 Levels + Breaks) | 5 | complete | PASS (358 BE) | exact 21-level schedule, BB ante L6+, 3 breaks, auto progression |
| 047 | Re-Entry / Bust-Out Rule (Levels 1-3) | 5 | complete | PASS (reentry tests) | 45k reset L1-3, elimination L4+, no negative stacks |
| 048 | Training Mode Text (White Bold) | 5 | complete | PASS (UI check) | COACH MODE / TEST MODE white+bold, visual only |
| 049 | ICM Coach Card Analysis (169 + Exact) | 5 | complete | PASS (169 endpoint + UI) | 169 classes + exact combos, duplicate prevention |
| 050 | ICM Coach Postflop / Board Analysis | 5 | complete | PASS (flop/turn/river) | 0-5 board cards, street derived, dup guard |
| 051 | Expected Value Engine | 5 | complete | PASS (EV tests) | chip EV + POSITIVE/NEGATIVE + CALL/FOLD, ICM distinct |
| 052 | Probability / Outs | 5 | complete | PASS (outs tests) | real-deck outs, improve prob, win prob |
| 053 | Hand History Fix | 5 | complete | PASS (auto-table + grouping) | auto table id, blind-level groups |
| 054 | Configurable Tournament Settings | 5 | complete | PASS (settings tests) | stack/blinds/duration/fast affect engine |
| 055 | Swayne-Based Card/EV Explanations | 5 | complete | PASS (education tests) | concise concept notes, no book text |
| 056 | Live Tournament Timer | 5 | complete | PASS (live timer tests) | clock persists across hands; no reset at hand boundaries; level advances by elapsed time |
| 057 | Total Chips + Average Stack | 5 | complete | PASS (settings/history tests) | totalChips/averageStack from actual stacks; re-entry/elimination reflected |
| 058 | ICM Coach Decision/EV Consistency | 5 | complete | PASS (coach tests) | one decision model: ICM EV/chip EV labeled for the decided action vs FOLD |
| 059 | Copyright Footer | 5 | complete | PASS (22 vitest, 3 e2e, layout) | © 2026 NEXORA — Created by Mehrdad Abedin on all nav pages |
| 060 | Copyright Text Color (Gold Accent) | 5 | complete | PASS (build, layout) | footer color uses existing --accent (#f2c14e) gold; wording/layout unchanged |
| 061 | Production CORS Origin (Render) | 5 | complete | PASS (preflight + 370 BE) | icm-master-frontend.onrender.com allowed; localhost 5173/4173/8080 preserved |

## Current Phase

5 — deployment CORS fix

## Current Atomic Task

061 Production CORS Origin (complete)

## Completed Tasks

- 061 Production CORS Origin (complete)- 060 Copyright Text Color (complete)- 059 Copyright Footer (complete)- 058 ICM Coach Decision/EV Consistency (complete)- 057 Total Chips + Average Stack (complete)- 056 Live Tournament Timer (complete)- 055 Swayne-Based Card/EV Explanations (complete)- 054 Configurable Tournament Settings (complete)- 053 Hand History Fix (complete)- 052 Probability / Outs (complete)- 051 Expected Value Engine (complete)- 050 ICM Coach Postflop / Board Analysis (complete)- 049 ICM Coach Card Analysis (complete)- 048 Training Mode Text (complete)- 047 Re-Entry / Bust-Out Rule (complete)- 046 Tournament Blind Structure (complete)- 045 Swap Table Header Position (complete)- 044 Poker Table Header Alignment (complete)- 043 Folded-Player Action Eligibility (complete)- 042 GitHub Pages Deployment (in-progress, blocked: Actions billing lock)- 041 Bottom-Row Seat Repositioning (complete)- 040 Hand Completion Review Screen (complete)- 039 Header Layout + Icon Pause/Play (complete)- 038 Application Rename to ICM Master (complete)- 036 GitHub Repository Preparation (complete)- 034 FastAPI + WebSocket API (complete)- 033 Database (PostgreSQL + Alembic) (complete)- 032 Statistics (complete)- 031 Hand History (complete)- 030 Test Mode (complete)- 029 Strategy Coach (complete)- 028 Push/Fold Engine (complete)- 027 Range Matrix (complete)- 026 Equity Engine (complete)- 025 Risk Premium (complete)- 024 Bubble Pressure (complete)- 023 Stack Analysis (complete)- 022 ICM Engine (complete)- 021 Opponent Range Estimation (complete)- 020 Postflop AI (complete)- 019 Preflop AI (complete)- 018 Computer Personalities (complete)- 017 Computer AI Framework (complete)- 016 Hero Controls (complete)- 015 React Poker Table (complete)- 014 Hand Engine (complete)- 013 Tournament Timer (complete)- 012 Tournament Engine (complete)- 011 Side Pots (complete)- 010 Pot Engine (complete)- 009 Betting Engine (complete)- 008 Hand Evaluator (complete)- 007 Dealing Engine (complete)- 006 Dealer Button Rotation (complete)- 005 Positions (complete)- 004 Player Model (complete)- 003 Deck Engine (complete)- 002 Card Model (complete)- 001 Project Setup (complete)

## In Progress

(none)

## Blocked

(none)

## Tests

- backend: pytest (configured) — 325 passed after 038-041
- frontend: Vitest (configured in part 015) — 22 passed
- e2e: Playwright (037) — 3 passed live (tournament flow, ranges, coach)
- audit: scripts/check_github.py — PASSED (all files <= 200 lines)

## 038-041 Verification

- App renamed to ICM MASTER on Home, table header, browser title, Capacitor appName, FastAPI title.
- Header = [HOME] [⏸/▶] left, ICM MASTER right; icon-only pause/play with tooltips; no NEXT HAND text buttons.
- Hand completion hides the poker table and shows POKER HAND HISTORY (result banner at top, hand facts, showdown WON/LOST, bot actions by street, bot explanations, ICM coaching, auto-next countdown).
- Pause freezes the countdown and keeps the review; resume continues; single timer, cleaned up per hand.
- Seats 3-6 bottom-anchored; verified no overlap with FOLD/CHECK/CALL controls on desktop (1280) and mobile (390).
- Mobile touch verified: pause/resume, explanation expand, auto-next; no console errors, no horizontal overflow.

## Known Issues

- GitHub CLI (gh) not installed on this machine — remote push deferred (see 036).
- No Java / Android SDK — Android APK build documented but runnable only where SDK exists (035).
- Local PostgreSQL on :5432 is not accessible without credentials; Docker Postgres is exposed on host port 5433.

## Next Step

Push to GitHub (see 036): `gh auth login` then the commands in the final report.
## 042 Status (accurate as of push a3179d8)

- Workflow committed + pushed to origin/main (a3179d8).
- Local verification PASSED: default build unchanged (/assets refs, dev URL
  intact); Pages build emits /poker-icm-coach/assets refs; workflow YAML valid;
  HashRouter preserved; ci.yml untouched.
- Remote run ATTEMPTED but BLOCKED: "job was not started because your account
  is locked due to a billing issue" (same annotation on pre-existing CI runs —
  account-wide Actions lock, not a workflow defect).
- GitHub Pages is NOT enabled yet (GET /repos/.../pages -> 404). Set
  Settings -> Pages -> Build and deployment -> Source -> "GitHub Actions",
  resolve the billing lock, then re-run the "Deploy to GitHub Pages" workflow
  (or push to main). Site NOT live until that run succeeds.

## 043-044 Verification

- Folded players can no longer re-enter the action queue: new streets are built
  from in_hand_seats (excludes folded) and HandEngine.act() rejects any action
  from an already-folded seat (authoritative lock, covers bots via advance_bot).
- 5 new backend tests (tests/game/test_fold_rules.py): folded skipped on flop,
  folded cannot CHECK/CALL/BET/RAISE/ALL-IN/FOLD again, folded cannot win,
  hero-fold resolves among live bots with 5-card board + live showdown reveal,
  folded state resets on the next hand. Backend suite: 330 passed.
- Live browser run: 10 hands with 10 intentional hero folds — zero violations
  (folded seats never act after folding, never winners; non-walk hands reveal
  live showdown). UI unchanged; review payload already reflected real state.
- Header: HOME and Pause/Play both 48px tall, left group, ICM MASTER right;
  verified 390x844 / 760x500 / 1024x720 / 1280x900, no overflow, no overlap.
- Frontend build + 22 vitest + 3 e2e all pass; repo audit passes.

## 045 Verification

- Header swapped: ICM MASTER on LEFT, HOME + Pause/Play on RIGHT.
- Verified on 1280/1024/760/390: title leftmost, HOME then Pause to its right,
  both 48px tall, no horizontal overflow, no overlap.
- Pause toggles ⏸->▶, HOME navigates; no console errors.
- Only files changed: TablePage.tsx + base.css (4 lines each). Frontend build +
  22 vitest pass; repo audit passes.

## 046-055 Verification

- Blind structure: exact 21 levels (100/100 .. 20000/40000), BB ante from
  level 6, breaks 5m/15m/15m; timer advances levels AND breaks automatically
  (tick() now called on every state view); fast mode scales; verified L1->L2
  and L5->break->L6 with ante 600.
- Re-entry: bust in L1-3 -> fresh 45,000; L4+ -> eliminated; no negative
  stacks; integration test covers next_hand flow.
- Training mode: COACH MODE / TEST MODE white (rgb 255,255,255) + bold 800.
- Coach analyzer: 169 starting-hand classes (AA..32o) + exact two-card mode
  with duplicate prevention (same physical card blocked); board picker 0-5
  cards with street auto-derived (FLOP/TURN/RIVER); EV panel (CHIP EV,
  POSITIVE/NEGATIVE, CALL/FOLD) with explicit TOURNAMENT/ICM distinction;
  outs from the real remaining deck (47/46 unknown) + improve/win probability;
  concise Swayne-concept education notes.
- Hand history: auto-detects the single active table; rows grouped by blind
  level; no manual table-id guessing.
- Settings: editable stack/blinds/duration/fast mode; PUT /api/settings;
  new tournaments use the stored values (verified 30000/150-300/15min).
- Tests: backend 358 passed; frontend 22 vitest + 3 e2e passed; build clean;
  repo audit passed.

## 056-058 Verification

- Timer: GameSession._begin_hand no longer resets the timer; the first hand
  starts it and later hands resume it (paused at hand completion). Verified
  live: secondsLeft 1199 -> 1198 across a hand boundary (no reset); blind
  level advances only when the level duration expires (fast mode scales);
  pause/resume preserves accumulated time.
- Total chips / average stack: game_state_view computes totalChips = sum of
  actual player stacks and averageStack = totalChips / active players. Verified
  live (404,700 / 44,966) and in tests after re-entry (+45,000 per busted
  player) and elimination (excluded from average). Also fixed a real bug:
  next_button crashed when the button seat was eliminated - it now skips to
  the next active seat so the tournament continues.
- Coach consistency: the ICM EV and chip EV are now computed for the DECIDED
  action vs a FOLD baseline (correct fold equity = current stack, real win
  probability). A RAISE recommendation displays "RAISE vs FOLD: ..." and chip
  EV action RAISE; FOLD displays "FOLD (fold equity ...)". No more
  "NEGATIVE (fold 0.111 vs call ~0.000)" alongside a RAISE recommendation.
- Tests: backend 370 passed; frontend 22 vitest + 3 e2e passed; build clean;
  audit passed.

## 059 Verification

- Added reusable <Copyright /> (© 2026 NEXORA — Created by Mehrdad Abedin) to
  Home, Training, Ranges, ICM Coach, Settings, Hand History and Statistics.
- Footer right-aligned, color = Home button background (#1565c0), subtle top
  border; slightly smaller on mobile. Rendered in normal flow -> no overlap.
- Verified desktop 1280 / tablet 834 / mobile 390: visible everywhere, no
  horizontal scroll, no overlap with mode cards/content, Home and Training
  buttons still navigate. Frontend build + 22 vitest + 3 e2e pass; audit passes.

## 060 Verification

- Changed only the .app-footer text color from #1565c0 to the existing
  --accent variable (#f2c14e). Verified build clean; footer renders
  rgb(242,193,78) on desktop and mobile; wording, position, size, alignment,
  border, spacing and layout unchanged; no other code modified.

## 061 Verification

- config.py default CORS_ORIGINS now includes
  https://icm-master-frontend.onrender.com (plus localhost 5173/4173/8080).
- Verified via TestClient and a live uvicorn server: OPTIONS preflight from
  the production origin returns 200 with Access-Control-Allow-Origin:
  https://icm-master-frontend.onrender.com; POST /api/coach/advice with that
  Origin returns 200 + ACAO header; localhost dev origins still allowed;
  unallowed origins still rejected (400).
- backend/.env updated locally (untracked). Backend suite 370 passed; audit
  passed. No API/model/poker/UI changes.


---

## A-series: multi-user authentication, isolation, cards, review UX (prime-agent-spec)

Implemented incrementally on the existing working system (poker/ICM/tournament
logic untouched). Status: A01-A15 done; A14 deployment steps that require the
owner to redeploy are listed as remaining.

| Task | Result |
|---|---|
| A01 audit | Endpoints, state model, Hero hard-coding, no auth, CSS-only cards, 400 root causes documented |
| A02 HTTP 400/CORS | Root cause = validation 400s fired by frontend races; CORS already correct. Frontend hardened (double-submit guard, error-safe nextHand, swallowed coach/compare); tests/test_http400_paths.py |
| A03 auth | Bearer-token username login/logout/me; app/services/auth.py, app/api/routes_auth.py, app/api/deps.py |
| A04 username | Seat-0 player named from username; no user-facing hard-coded Hero |
| A05 isolation | GameSession.owner; ownership enforced on all game routes + WS; cross-user 404 |
| A06 table IDs | A..Z, AA.. allocator; internal session_id remains the data key |
| A07 history | Records + username/table_label/timestamp; best-effort JSONL (HISTORY_DIR) |
| A08 cards | 53 SVG assets (scripts/generate_cards.py) + PlayingCard component |
| A09 sizes | Larger proportional hero/board/review cards (cards.css) |
| A10 result/review | Compact result stays on table; Review the Hand opens history only on click |
| A11 pause | Pause/resume only affects client auto-next; server clock untouched |
| A12 consistency | 401 gate + ownership; new tournament -> new session+label |
| A13 tests | Backend 394 passed / 4 skipped; frontend 32 passed |
| A14 deploy | Deployed preflight/CORS verified live; redeploy this branch for auth endpoints; two-browser verification pending owner deployment |
| A15 docs | This file + prime-agent-spec/progress.md |

Files changed (backend): app/api/routes_auth.py (new), app/api/deps.py (new),
app/api/routes_game.py, app/api/routes_meta.py, app/main.py,
app/services/auth.py (new), app/services/game_session.py,
app/services/hand_history.py, app/services/game_state_view.py,
app/schemas/game_schemas.py, app/tournament/tournament.py,
app/core/config.py, tests/* (auth/isolation/400 suites, updated helpers).
Files changed (frontend): src/services/api.ts, src/pages/*, src/components/*
(LoginForm, PlayingCard, HandResult, TableHeader, TableSidebar, CardView,
HeroControls, HandReview, ActionHistory, PokerSeat, PokerTable),
src/hooks/useAutoNext.ts (new), src/styles/cards.css (new),
public/cards/* (53 generated SVGs), tests/* (features, login), scripts/generate_cards.py (new).


### A17 follow-up — OpenDecks PNG card bundle (committed locally)
- Complete OpenDecks PNG deck added: 52 card faces + back.png in
  frontend/public/cards/ (1500x2100, unmodified CC0 source, no resampling).
- PlayingCard renderer now serves PNG assets; SVG set retained alongside.
- Deck + mapping verified (backend test_card_assets 6 tests; frontend A08/A17
  suite; pixel render checks for all four suits, low/10/face/ace, 8H, back).
- Full regression: backend 400 passed / 4 skipped; frontend 34 passed; tsc,
  build, GitHub audit green.
- Only card-asset/presentation/docs changed; poker/ICM/auth/session untouched.

### A18 — registration-first authentication flow
- Backend: POST /api/auth/register (username + password), login now requires
  registered credentials; UserRegistry with salted PBKDF2-SHA256 hashing and
  best-effort data/users.json persistence; generic 401 for invalid sign-in.
- Frontend: LoginForm SIGN IN / SIGN UP modes with required-field, min-length
  and confirm-password validation; success message then sign-in; scoped
  auth.css preserving the dark/gold visual identity.
- Verified: backend 400 passed / 4 skipped; frontend 37 passed; tsc/build/audit
  clean; live smoke (register -> duplicate/weak rejection -> invalid 401 ->
  login -> tournament -> logout -> 401). A02-A17 and OpenDecks cards untouched.


## Session continuation — auth signup authorization, rotation, mobile, labels, header

### Phase 1 — Authentication signup authorization (root cause fixed)
- Root cause: POST /api/auth/register returned only {username, registered:true}
  with NO session token, so a freshly registered user was left unauthenticated
  ("not properly authorized/logged in").
- Fix (backend, root): register now issues a bearer token via auth_store.login
  and returns it; the new account is authorized immediately and can enter the
  private table without a second sign-in. Login/logout/me unchanged; passwords
  remain salted PBKDF2-SHA256 (never plaintext); accounts persist best-effort.
- Session persistence: AuthStore sessions now bind to data/sessions.json
  (best-effort) so a process restart does not invalidate valid sessions
  (tokens survive; expired sessions dropped on load).
- Frontend: api.register returns token; LoginForm saves it and calls onLogin
  after a successful signup.
- Tests: backend test_auth_and_isolation asserts signup token authorizes /me;
  frontend login.test asserts token stored on signup. Full flows verified live
  (register -> duplicate/weak rejection -> invalid 401 -> login -> tournament
  -> logout -> 401).

### Phase 2 — Login UI (blue compact SIGN IN / SIGN UP)
- .auth-mode-switch buttons: smaller rectangular, blue (#1565c0) with white text
  instead of gold; active state blue-dark with focus ring; keyboard focus
  visible; no duplicated SIGN IN heading (mode-appropriate heading
  "WELCOME BACK"/"CREATE YOUR ACCOUNT"). Desktop + mobile layout clean.

### Poker-table seat rotation (dynamic, both 9- and 6-handed)
- app/game/positions.py: rotation_order(num_seats) helper is the single source
  of truth; 9-handed ring BTN->SB->BB->UTG->UTG+1->MP->LJ->HJ->CO, 6-handed
  BTN->SB->BB->UTG->HJ->CO; SB always immediately to the left of the button, BB
  immediately to the left of SB (offset 1/2 in the ring). No hard-coded jump
  after UTG; the ring is dynamic by button offset + seat count.
- Removed hard-coded position_for(..., 9) at call sites: game_session.py
  (coach + history), hand_review.py, bot_review.py now pass the actual player
  count (len(players)) so short-handed tables rotate correctly.
- dealer_button.next_button already advances the button +1 clockwise after each
  hand, skipping eliminated/inactive seats (unchanged).
- Tests: test_positions.py extended — full ring rotation walks vs
  position_for for dealers 0..8 (9-handed) and 0..5 (6-handed), SB/BB adjacency
  for every dealer, and no-harcoded-jump assertions.

### Phases 3-6, 9 — Responsive mobile poker table
- New frontend/src/styles/mobile.css: <=767px switches .table-felt to a
  centered flex column: community board row first, then all 9 players wrapped
  at 3 per row (hero seat wider, larger hole cards). Neutralizes desktop
  absolute nth-child coords so seats never overlap; no horizontal page
  scrolling. Action controls (.hero-controls) sit compact at the bottom-center
  below the felt (never covering players). Hand-complete compact result and
  full review stay responsive with no horizontal scroll.
- Breakpoints verified locally (Playwright, faithful live markup — bots have no
  hole-card row): 320/360/375/390/412/768/900/1024/1280 px all show
  horizontal-overflow:false, seat-overlaps:0, controls below felt.
- Orientation: portrait-first layout works without requiring rotation; manual
  rotate is intentionally not forced (browsers cannot reliably lock
  orientation) — document as remaining optional work.

### Phase 7 — Reusable enable/disable labels
- New frontend/src/services/preferences.ts: single cached source of truth
  (actionLabels / resultLabels) loaded from the existing /api/settings
  architecture (showActionLabels / showResultLabels persisted via
  TournamentSettings + PUT /api/settings).
- HeroControls: showLabels prop; when false, buttons show a glyph instead of
  text but keep aria-label/title (accessible, not color-only). Applied to
  FOLD/CHECK/CALL/BET/RAISE/ALL-IN consistently on desktop and mobile.
- HandResult: showResultLabels prop; when false the YOU WON/YOU LOST/CHOPPED
  text is replaced by a glyph + chips delta, banner colour plus aria-label/
  role=status keep it accessible.
- SettingsPage: two toggles (SHOW ACTION BUTTON LABELS / SHOW RESULT LABELS)
  integrated into the existing settings screen.
- Tests: controls.test.tsx covers label-hidden (accessible) and visible-default.

### Phase 8 — Compact REVIEW HAND
- HandResult: REVIEW HAND + NEXT HAND use shared .btn-compact sizing
  (controls.css) consistent with the action-button control group; small,
  readable, touch friendly, gold/blue theme.

### Home-page header (ICM MASTER left, user + LOG OUT right)
- Authenticated HomePage now uses the shared .top-bar.app-header row: "ICM
  MASTER" left; "Playing as <user>" + LOG OUT at the top-right on the same
  row. LOG OUT is a .btn-logout: smaller blue rectangular button with white
  text (controls.css). TableHeader logout switched to the same style for
  consistency.

## Verification (this session)
- Backend: 403 passed / 4 skipped (incl. new rotation + signup-authorization
  tests); ruff clean on changed files (2 pre-existing I001 in game_session/
  hand_review untouched); GitHub audit AUDIT PASSED.
- Frontend: tsc clean; 39 tests passed; npm build clean; audit clean.
- Local geometry (Playwright): no overflow / no overlap 320px-1280px.

## Remaining
- (Optional) auto-rotate landscape mode: browsers cannot reliably lock device
  orientation; portrait-first layout already fits, so rotation is not forced.
  If desired later, add an enabled/disabled user setting that toggles a
  landscape class (no reliable browser lock guarantee).
- Deploy to Render (owner action) and re-verify on the live site once requested.


## Login UI + login functionality fixes (bug 1-3)

### Bug 1 — duplicate "WELCOME BACK" removed
- LoginForm no longer renders any heading in login mode (the target layout
  [LOGIN] [SIGN UP] / explanatory text / fields / [LOGIN] has no heading).
  The signup mode keeps its "CREATE YOUR ACCOUNT" heading. Verified on desktop
  and mobile (320/375/390px): no "WELCOME BACK" anywhere.

### Bug 3 — "SIGN IN" -> "LOGIN"
- Login-mode toggle button, main submit button, and "Already registered?"
  switch link now read LOGIN. Explanatory text "Sign in to continue to your
  private practice table." unchanged (non-action label). Backend endpoints,
  api.ts function names, test ids untouched.

### Bug 2 — login does not proceed (trace + fixes)
Traced the full flow: LoginForm.submit -> api.login -> POST /api/auth/login
(username+password) -> auth_registry.verify (salted PBKDF2 compare) -> token ->
saveAuth -> HomePage onLogin(setUser) -> authenticated menu -> private table.
Verified end-to-end (Playwright against the real backend + built frontend):
signup -> token -> logout -> LOGIN with same user -> menu -> private table ->
refresh stays authenticated -> wrong password shows "invalid username or
password" and stays on login. Zero console errors.
Root-cause hardening for the reported "stays on login" behaviour:
- Enter key now submits the login form (username + password fields) - real gap.
- HomePage validates a stored token via /api/auth/me on load; stale/invalid
  tokens (backend restart, expiry, deploy data loss) are cleared so the user is
  returned to a clean LOGIN screen instead of a broken half-authenticated state
  (was: menu shown but every action silently 401).
- Backend auth persistence paths are now resolved relative to the backend root
  (routes_auth `_abs`), so data/users.json + data/sessions.json are written and
  read from the same absolute location regardless of the process CWD; verified:
  register -> server restart -> login still 200.
Note: account data still lives in best-effort JSON files on the server; on
Render's ephemeral filesystem data is wiped by a fresh redeploy - in that case
previously registered accounts 401 and the UI now shows the clear error (and a
fresh signup re-creates the account). A durable database-backed user store is
future work if accounts must survive redeploys.

### Tests
- frontend: 41 passed (added: Enter-key submit, no-WELCOME-BACK, stale-token
  clear; updated LOGIN wording); tsc clean; build clean.
- backend: 403 passed / 4 skipped; ruff clean on changed files; audit PASSED.
- E2E (local, real backend+UI): all acceptance steps + desktop/mobile geometry
  (no overflow, clickable submit at 320/375/390px).


## ICM Master — Poker Table Position Fix

### Atomic Task
Fix player seating geometry and clockwise rotation.

### Inspection
- [x] Table component identified: frontend/src/components/PokerTable.tsx (+PokerSeat)
- [x] Seat data identified: 9 fixed seats (0..8) rendered by PokerTable in seat order
- [x] Position assignment identified: backend app/game/positions.py position_for (ring
      BTN->SB->BB->UTG->UTG+1->MP->LJ->HJ->CO; 6-max ring too)
- [x] Physical seat coordinates identified: frontend/src/styles/placement.css (nth-child)
- [x] Rotation logic identified: app/game/dealer_button.py next_button (seat +1 per hand)
- [x] Root cause identified (measured, not guessed): see below

### Implementation
- [x] Seat geometry corrected: placement.css now evenly distributes all 9 seats around the
      oval (centered via translate(-50%,-50%)) using a single centralized ruleset
- [x] BOT5/BOT6 overlap fixed (were stacked at x=850); every adjacent seat chord >= ~100px
- [x] BOT8/Hero spacing balanced (were 350px apart; now evenly spaced arcs)
- [x] Physical seat order corrected: measured clockwise order 0->8->7->6->5->4->3->2->1
- [x] Clockwise Button rotation corrected: dealer_button now advances seat index -1
      (= one physical seat clockwise on the measured layout)
- [x] Hero rotation verified: hero ring position advances +1 ring step every hand
      (SB->BB->UTG->UTG+1->MP->LJ->HJ->CO->BTN->SB ...), matching the required pattern
- [x] Mobile unaffected: mobile.css flex layout neutralizes the desktop nth-child
      coordinates + transform; verified no overlap/overflow/clipping

### Validation
- [x] Desktop verified: Playwright geometry (720x405 felt): 0 overlaps, 0 overflow,
      0 clipping at 320/360/375/390/412/768/900/1024/1280/1440 px
- [x] Mobile verified: same widths, no overflow / no overlap / no clipping
- [x] Multi-hand rotation verified: live backend run — dealer 8->7->6->5->4->3->2
      (cw#1->cw#7 on the physical ring) and hero SB->BB->UTG->UTG+1->MP->LJ->HJ
- [x] Build passed: frontend npm build clean
- [x] Tests passed: backend 407 passed / 4 skipped; frontend 41 passed
- [x] Lint passed if configured: GitHub audit (check_github.py) PASSED; ruff clean on changed files
- [x] Type checks passed if configured: tsc --noEmit clean

### Files Changed
- backend/app/game/dealer_button.py (clockwise seat index -1 rotation)
- backend/tests/game/test_dealer_button.py (clockwise expectations + ring test)
- backend/tests/game/test_positions.py (multi-hand hero rotation + button-clockwise tests)
- backend/tests/game/test_fold_rules.py (rotation-agnostic role-driven helpers)
- backend/tests/tournament/test_reentry.py (rotation-agnostic reentry assertions)
- backend/tests/test_auth_and_isolation.py, test_concurrent_isolation.py,
  test_multi_table_isolation.py, test_settings_history.py (hero-stack assertions made
  rotation-agnostic: hero may post a blind at hand start)
- frontend/src/styles/placement.css (centralized even 9-seat oval geometry)
- frontend/src/styles/mobile.css (transform:none added to mobile seat reset)
- progress.md (this entry)

### Root Cause
- Physical layout: seats were hand-placed with scattered nth-child coordinates; seats 5,6,7
  collapsed into one right-edge column (x=850) causing the BOT5/BOT6 overlap, while seats 8
  and 0 were ~350px apart (the BOT8/Hero gap).
- Visual rotation: measured screen coordinates show decreasing seat index = clockwise
  (0->8->7->6->5->4->3->2->1). dealer_button advanced +1, so the Button physically moved
  COUNTER-clockwise; the logical rings (position_for) were fine.

### Final Result
- All nine seats are evenly distributed around the oval with no overlaps, balanced spacing,
  and nothing clipped (verified by rendered measurement, desktop + mobile).
- The Button now moves one physical seat CLOCKWISE after every completed hand, SB is always
  immediately to the left of the Button (the seat that was just the Button), BB next left,
  and the remaining positions rotate correctly around the ring for both 9- and 6-handed
  tables. Hero follows the same logical rotation and was verified over multiple consecutive
  hands.


## Mobile Poker Table Responsive Scaling

### Atomic Plan — Mobile Table Scaling
- [x] 1. Inspect existing poker table responsive structure
- [x] 2. Identify mobile landscape breakpoint/layout
- [x] 3. Identify table sizing constraints
- [x] 4. Identify action-button sizing/positioning
- [x] 5. Implement mobile-only proportional table scaling
- [x] 6. Ensure complete table fits mobile landscape viewport
- [x] 7. Ensure action buttons remain visible and touchable
- [x] 8. Verify mobile portrait
- [x] 9. Verify mobile landscape
- [x] 10. Verify desktop has no visual changes
- [x] 11. Run build/tests
- [x] 12. Update progress.md
- [x] 13. Report changed files and results

### Problem
Rotated-phone landscape viewports (e.g. 667x375, 740x360) are short in height.
The previous mobile layout (3-seat-per-row felt built from the <=767px block
plus a non-standard `orientation: landscape` media query that real browsers
don't honour) produced a ~344px-tall felt + 75px action strip + header that
together exceeded the 320-420px viewport: the table bottom and the FOLD/CALL/
RAISE/ALL-IN strip were pushed below the visible area (matches the screenshots).

### Affected mobile layouts
- Mobile landscape (phones rotated): felt + action buttons overflowed the
  short vertical viewport.
- Mobile portrait was usable; it is preserved as-is.

### Files Changed
- frontend/src/styles/mobile.css (only). No component, backend, game, or
  desktop/tablet CSS changed.

### Responsive Approach Used
- Rebuilt mobile.css cleanly (removed duplicate/broken blocks leftover from a
  prior edit; brace-balanced, single block per breakpoint).
- Replaced the unsupported `(orientation: landscape)` media query with the
  standard `(min-aspect-ratio: 5/4)`, scoped to `max-width: 959px` (phones +
  small tablets), so landscape phones/tablets are detected reliably.
- Mobile landscape-specific overrides (same flex layout, no redesign):
  players laid out 5-per-row (felt = board row + 2 seat rows -> ~264px tall),
  smaller seat/card/hero card sizing, compact header/status and compact
  action buttons (min-height 32px, still touch-friendly), action strip
  immediately below the felt.
- Portrait (<=767px taller-than-wide) and desktop (>=960px) are untouched.

### Validation
- Playwright rendered measurement at mobile landscape 568x320, 640x400,
  667x375, 740x360/420, 812x375, 900x400, 959x500: felt fully visible,
  all 5 action buttons visible & inside viewport, all 9 seats inside the felt,
  0 seat overlaps, 0 horizontal overflow.
- Mobile portrait 360x740 / 390x844: unchanged and fully visible.
- Tablet portrait 768x1024: unchanged. Desktop 1024x700 / 1280x800: exactly
  the same geometry as before the change (felt bottom 470, controls bottom
  575).
- Build/test: tsc clean; frontend 41 passed; npm build clean; GitHub audit
  PASSED; backend 407 passed / 4 skipped (untouched).
- Desktop intentionally left unchanged (git diff: only frontend/src/styles/
  mobile.css (+ regenerated tsconfig.tsbuildinfo) modified).

### Final Result
- On mobile landscape the complete poker table + hero + all players + the
  action buttons now fit inside a rotated phone viewport with no horizontal
  scrolling and no cropping. Portrait and desktop are pixel-identical to
  before. No poker/rotation/backend/API/auth behavior was modified.


## Mobile Landscape Poker Table — Desktop-Style Scaling (CSS-only)

### Atomic Plan
- [x] Inspect existing table responsive CSS (mobile.css: portrait flex layout, landscape 5-per-row)
- [x] Identify mobile-landscape breakpoint (max-width:959px + min-aspect-ratio:5/4; orientation is unreliable)
- [x] Scale and center the existing horizontal oval poker table
- [x] Preserve existing seat positions and poker logic (percentage-based nth-child positions reused)
- [x] Fit action buttons below the table (compact strip directly under the felt)
- [x] Prevent mobile landscape overflow (no horizontal scroll, no clipping)
- [x] Verify mobile landscape (all 9 seats visible, no overlap, centered, buttons visible)
- [x] Verify desktop remains unchanged (>=960px untouched)
- [x] Update progress.md

### Files changed
- frontend/src/styles/mobile.css only (no component/JS/backend/desktop changes)

### Changes made
- LANDSCAPE media query (max-width:959px and min-aspect-ratio:5/4) now reuses the
  DESKTOP composition: the same 16:9 oval felt with the same percentage-based
  nth-child seat positions (placement.css), sized from the available landscape
  height (calc((100vh - 116px) * 16 / 9), capped at 100% width) and centered
  horizontally. Seat boxes / cards / fonts are scaled down proportionally so
  all 9 players and the hero hole cards stay visible without overlapping, and
  the action buttons sit in a compact strip directly below the table.
- The prior landscape flex 5-per-row layout was replaced by this desktop-style
  layout (portrait flex layout and the 768-959 tablet portrait block are
  unchanged).
- Portrait media queries are now scoped with max-aspect-ratio:4/3 so a rotated
  landscape phone no longer receives the portrait layout.

### Desktop preservation
- base.css / felt.css / seats.css / placement.css / controls.css untouched;
  all changes live inside mobile-only media queries. Desktop (>=960px) renders
  identically (verified: felt 405px, controls below, 0 overlaps).

### Validation (rendered measurement)
- Mobile landscape 740x360, 667x375, 640x400, 568x320: table visible, centered,
  all 9 seats inside, 0 seat overlaps, all action buttons visible, no horizontal
  overflow.
- Mobile portrait 360x740, 390x844: unchanged flex layout, all visible.
- Tablet portrait 768x1024 and desktop 1280x800: unchanged, 0 overlaps.
- Frontend build clean; tsc clean; 41 tests passed; GitHub audit PASSED.
- No poker/game/rotation/backend/API/auth logic changed.


## Mobile Landscape Table Size Adjustment (CSS-only, mobile-landscape only)

### Change
- Increased the mobile-landscape poker table size by using the smallest safe
  vertical reserve for the header/status/action strip.
- Previous sizing: `width: calc((100vh - 116px) * 16 / 9)` capped at
  `max-width: 100%`.
- New sizing: `width: min(92vw, calc((100vh - 102px) * 16 / 9))`, still
  `aspect-ratio: 16 / 9` and centred. The 92vw cap satisfies the "~90-95% of
  available width" target without letting the table overflow; the height term
  keeps header/status/action buttons fully visible on short landscape phones.
- The 16:9 horizontal composition, all nth-child seat positions, hero seat,
  rotation, action-button functionality and portrait/desktop layouts are
  untouched.

### Validation (rendered measurement)
- 740x360: felt 433 -> 459px (buttons bottom 355 <= 360, visible), 0 seat
  overlaps, no horizontal overflow.
- 568x320: felt 363 -> 388px (buttons bottom 315 <= 320, visible), 0 overlaps,
  no overflow.
- 667x375 -> 485px and 640x400 -> 530px also verified visible, 0 overlaps.
- Note: on short 16:9 phones the table is height-limited (a 16:9 table cannot
  exceed ~62-83% of viewport width while keeping header/status/buttons on
  screen); the 92vw cap prevents it ever exceeding the width target.

### Files changed
- frontend/src/styles/mobile.css (landscape block only)
- progress.md (this entry)

### Checks
- tsc clean; frontend 41 tests passed; npm build clean; GitHub audit PASSED.
- Desktop and portrait untouched; no poker/game logic changed.


## Mobile Landscape Table Size Correction — Use Full Landscape Width (CSS-only)

### Date
2026-09-10

### Problem
Previous landscape sizing `width: min(92vw, calc((100vh - 102px) * 16 / 9))`
kept a strict 16:9 aspect ratio. On a real landscape phone (e.g. 740x360 CSS
px) the vertical budget left after header/status/action buttons is only
~258px, so the 16:9 multiplier capped the table at ~459px (~62% of viewport
width) regardless of the 92vw cap.

### Root cause
The strict `aspect-ratio: 16 / 9` combined with the fixed vertical chrome
reserve is the constraint: a wider table would need more height than a
landscape phone has. 16:9 physically cannot reach ~90-95% width on a
320-390px-tall rotated viewport.

### Change (frontend/src/styles/mobile.css, landscape media block only)
- `.table-felt` width changed from `min(92vw, calc((100vh-102px)*16/9))` to
  `92vw`
- height stays `calc(100vh - 102px)` (same measured reserve for header/status/
  action strip) with `aspect-ratio: auto` (wider horizontal oval, nth-child
  seat coordinates untouched — they are percentage-based and scale with the
  container)
- seat/card sizes bumped for the larger table (seat 10%, hero 14%, seat cards
  22px, hero cards 24px, board cards 38px)

### Validation (actual rendered measurements)
| viewport | table width | table height | % of viewport width | seats-overlap | buttons | h-scroll |
|---|---|---|---|---|---|---|
| 740x360  | 681 | 258 | 92% | 0 | visible | none |
| 568x320  | 523 | 218 | 92% | 0 | visible | none |
| 844x390  | 776 | 288 | 92% | 0 | visible | none |
| 667x375  | 614 | 273 | 92% | 0 | visible | none |

- All 9 seats visible, hero cards visible, table border (felt) visible,
  action buttons fully inside viewport, no horizontal scrolling, no vertical
  clipping.
- Portrait (360x740) and desktop (1280x800 -> table 720x405, unchanged)
  verified unaffected.

### Files
- frontend/src/styles/mobile.css (landscape block only)
- progress.md (this entry)

### Checks
- tsc clean; frontend 41 tests passed; npm build clean; GitHub audit PASSED.
- Desktop, portrait, poker/game logic unchanged (CSS-only).


## Mobile Landscape Poker Table Reduced to ~82% Viewport Width (CSS-only)

### Date
2026-09-10

### Change
- frontend/src/styles/mobile.css, landscape media block only:
  `width: 92vw / max-width: 92vw` -> `width: 82vw / max-width: 82vw`.
- Height (`calc(100vh - 102px)`) and all other landscape rules unchanged.
- nth-child seat positions, rotation, cards, game logic, desktop and portrait
  untouched (scaling only).

### Rendered measurements (actual)
| Viewport | table width | table height | % viewport width | centered | overlap | buttons | h-scroll |
|---|---|---|---|---|---|---|---|
| 740x360  | 607 | 258 | 82% | yes | 0 | visible | none |
| 568x320  | 466 | 218 | 82% | yes | 0 | visible | none |
| 844x390  | 692 | 288 | 82% | yes | 0 | visible | none |
| 667x375  | 547 | 273 | 82% | yes | 0 | visible | none |

- All 9 seats visible, hero cards visible, table border visible, action
  buttons fully in viewport, no horizontal scrolling, no clipping.
- Old width was ~92%; new width ~82% as required.

### Desktop / portrait
- Desktop 1280x800: table 720x405 (unchanged). Portrait 360x740: 360x344
  (unchanged). Desktop/portrait CSS untouched.

### Checks
- tsc clean; frontend 41 tests passed; npm build clean; GitHub audit PASSED.
- Poker/game logic unchanged (CSS-only).
