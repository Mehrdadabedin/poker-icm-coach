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

## Current Phase

5 — UI polish (copyright footer)

## Current Atomic Task

059 Copyright Footer (complete)

## Completed Tasks

- 059 Copyright Footer (complete)- 058 ICM Coach Decision/EV Consistency (complete)- 057 Total Chips + Average Stack (complete)- 056 Live Tournament Timer (complete)- 055 Swayne-Based Card/EV Explanations (complete)- 054 Configurable Tournament Settings (complete)- 053 Hand History Fix (complete)- 052 Probability / Outs (complete)- 051 Expected Value Engine (complete)- 050 ICM Coach Postflop / Board Analysis (complete)- 049 ICM Coach Card Analysis (complete)- 048 Training Mode Text (complete)- 047 Re-Entry / Bust-Out Rule (complete)- 046 Tournament Blind Structure (complete)- 045 Swap Table Header Position (complete)- 044 Poker Table Header Alignment (complete)- 043 Folded-Player Action Eligibility (complete)- 042 GitHub Pages Deployment (in-progress, blocked: Actions billing lock)- 041 Bottom-Row Seat Repositioning (complete)- 040 Hand Completion Review Screen (complete)- 039 Header Layout + Icon Pause/Play (complete)- 038 Application Rename to ICM Master (complete)- 036 GitHub Repository Preparation (complete)- 034 FastAPI + WebSocket API (complete)- 033 Database (PostgreSQL + Alembic) (complete)- 032 Statistics (complete)- 031 Hand History (complete)- 030 Test Mode (complete)- 029 Strategy Coach (complete)- 028 Push/Fold Engine (complete)- 027 Range Matrix (complete)- 026 Equity Engine (complete)- 025 Risk Premium (complete)- 024 Bubble Pressure (complete)- 023 Stack Analysis (complete)- 022 ICM Engine (complete)- 021 Opponent Range Estimation (complete)- 020 Postflop AI (complete)- 019 Preflop AI (complete)- 018 Computer Personalities (complete)- 017 Computer AI Framework (complete)- 016 Hero Controls (complete)- 015 React Poker Table (complete)- 014 Hand Engine (complete)- 013 Tournament Timer (complete)- 012 Tournament Engine (complete)- 011 Side Pots (complete)- 010 Pot Engine (complete)- 009 Betting Engine (complete)- 008 Hand Evaluator (complete)- 007 Dealing Engine (complete)- 006 Dealer Button Rotation (complete)- 005 Positions (complete)- 004 Player Model (complete)- 003 Deck Engine (complete)- 002 Card Model (complete)- 001 Project Setup (complete)

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
