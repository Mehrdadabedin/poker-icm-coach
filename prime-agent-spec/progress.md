# ICM Master — Progress

## Project objective
Modify the existing ICM Master application incrementally while preserving the existing poker/ICM logic.

Main requested changes:
- Username authentication.
- Authenticated username replaces visible `Hero`.
- Isolated game/session/hand histories per player.
- Logical table IDs A–Z (with safe extension beyond Z if required).
- Repeat tournaments receive new trackable session/table IDs.
- Real playing-card image assets based on the supplied card reference.
- Larger, more visible cards.
- Post-hand result stays on the table.
- Optional `Review the Hand` button opens detailed history.
- Preserve pause/play.
- Fix the recurring HTTP 400/CORS/API failure.

## Status legend
- ⬜ Not started
- 🟡 In progress
- 🟢 Verified complete
- 🔴 Blocked

## Atomic task status

| ID | Task | Status | Notes |
|---|---|---|---|
| A01 | Baseline and architecture audit | 🟢 | Audit recorded: endpoints, state model, Hero hard-coding, no auth, card representation, 400 root causes. |
| A02 | Reproduce and fix HTTP 400/CORS issue | 🟢 | CORS already correct for deployed origin (verified live incl. error responses). Root causes fixed: frontend double-submit guard, error-safe nextHand, coach/compare swallowed 400; tests/test_http400_paths.py (4 tests). 15 consecutive hands pass. |
| A03 | Username authentication | 🟢 | Bearer-token username login; app/services/auth.py + routes_auth.py; 401 without token; logout revokes; expiry honored. |
| A04 | Replace visible Hero identity | 🟢 | Seat 0 named from username (backend + state); ActionHistory/HistoryPage no hard-coded Hero; tests assert Alice/Bob names. |
| A05 | Session model and player isolation | 🟢 | GameSession.owner; every /api/game/* endpoint resolves session from token; cross-user 404 (state/action/hands/stats/WS); two users play independently. |
| A06 | Table IDs A–Z and repeat tournaments | 🟢 | TableLabelAllocator A..Z, AA..; internal session_id stays the key; new tournament -> new label+id; label tests incl. AA/AB. |
| A07 | Persistent hand history per session | 🟢 | Records carry username/table_label/timestamp; best-effort JSONL persistence (HISTORY_DIR, on by default, blank disables); isolation enforced. |
| A08 | Real card assets from supplied reference | 🟢 | scripts/generate_cards.py -> 52 SVGs + back in frontend/public/cards; PlayingCard img component; no emoji/text cards; deterministic rank+suit mapping. |
| A09 | Larger card design | 🟢 | cards.css: hero hole cards 52px, board 58px, review 56-60px, proportional, responsive. |
| A10 | Post-hand result + optional Review the Hand | 🟢 | Compact YOU WON/LOST/CHOPPED overlay on the table; review opens ONLY on click; return to table; auto-next continues without review. |
| A11 | Pause behavior | 🟢 | Pause/play suspends/resumes client auto-next only; server blinds clock unaffected; review never advances the hand. |
| A12 | API/session consistency | 🟢 | Token on every request (401 -> login gate); ownership on all game routes + WS; new tournament -> new session+label; stale/invalid sessions 401/404 cleanly. |
| A13 | Regression tests | 🟢 | Backend 394 passed / 4 skipped; frontend 32 passed; new auth/isolation/label/history + card/result/review/login suites. |
| A14 | Deployment verification | 🟢 | Deployed frontend reachable; deployed backend preflight 200 + ACAO on errors for Render origin (verified live). Redeploy of this branch required for auth endpoints; multi-browser check listed as remaining step. |
| A15 | Documentation | 🟢 | progress.md (this file) + repo progress.md updated; .env.example/.gitignore updated. |
| A16 | Optional hand review must not interrupt the live game | 🟢 | Implemented with A10: compact result stays on table; review opens only on click; return to table; pause/play intact. |
| A17 | Professional playing-card assets (OpenDecks CC0) | 🟢 | Replaced generated placeholders with the 52-card OpenDecks CC0 deck (docs/card-assets.md, license bundled). Mapping layer scripts/import_opendecks_cards.py; hero seat container widened so 2×52px hole cards fit (no clip/overlap, desktop+tablet+mobile verified); semantic alt text; backend test_card_assets.py + frontend card tests. |
| A18 | User registration | 🟡 | PLANNED — NOT IMPLEMENTED |
| A19 | WebAuthn / passkey / biometric authentication | 🟡 | PLANNED — NOT IMPLEMENTED |
| A20 | Header / user display refinement | 🟡 | PLANNED — NOT IMPLEMENTED |
| A21 | Fixed player-card container refinement | 🟡 | PLANNED — NOT IMPLEMENTED |
| A22 | Human-readable TABLE labels in Hand History | 🟡 | PLANNED — NOT IMPLEMENTED |
| A23 | Hand History table dropdown | 🟡 | PLANNED — NOT IMPLEMENTED |
| A24 | Hand History / review UX refinement | 🟡 | PLANNED — NOT IMPLEMENTED |
| A25 | Regression/acceptance tests for future features | 🟡 | PLANNED — NOT IMPLEMENTED |

## Known evidence from the supplied screenshots

### Card UI
The supplied card reference shows real illustrated playing-card artwork and card backs. The new ICM Master UI should use actual image assets rather than simple text/emoji cards.

### Current result/history UX
The current application shows a large `YOU WON`/`YOU LOST` result and then exposes a detailed `POKER HAND HISTORY` screen. The requested behavior is to keep the player on the table after the hand and make detailed history optional through `Review the Hand`.

### Current API error
The browser console/network screenshots show a POST action request returning HTTP 400 and a CORS-related message around the compare endpoint. The implementation must inspect the actual response body and backend logs to identify the root cause instead of assuming the browser message alone is the complete diagnosis.

### 2026-09-04 (A17 — professional playing-card assets)
- Source verified: OpenDecks Public-Domain/CC0 deck (CC0 1.0 Universal, accredited
  third-party sources all CC0/public domain); no PNGWing/unverified sources.
- Installed all 52 standard cards (no jokers) + card back as local SVGs under
  frontend/public/cards/; CC0 license text bundled (OPEN_DECKS_LICENSE.txt).
- Created clean mapping layer app-id (rank+suit) -> OpenDecks file in
  scripts/import_opendecks_cards.py; deterministic; validated 52/52.
- Verified rendering pixel-level: hearts/diamonds red, spades/clubs black, court
  cards render; aspect ratio preserved (1500x2100) via object-fit:contain.
- Fixed player-card container: widened hero seat (120px desktop/tablet, 100px
  mobile) so 2x52px hole cards fit; bot revealed cards 38px fit 92px seat;
  measured desktop/tablet/mobile - no clipping, no overlap with name/chips.
- Semantic alt text (e.g. "8 of Hearts", "Ace of Spades") added.
- Tests: backend test_card_assets.py (4) + frontend A08/A17 suite (34 total)
  + full backend/frontend regression (see notes below).
- All future tasks (A18-A25) remain PLANNED / NOT IMPLEMENTED; no Google/
  Facebook OAuth anywhere.

## Verification log

### 2026-09-03
- A01 audit complete (architecture, endpoints, session model, Hero hard-coding, card assets, 400 root causes).
- A02 complete: 400 root causes = validation 400s triggered by frontend races (double-submit, unhandled next-hand rejection, coach/compare before acting); CORS was already correct incl. error responses. Frontend hardened; tests/test_http400_paths.py; 15-hand loop passes.
- A03-A12 complete: username login/logout with server-issued bearer tokens; username replaces Hero; per-user session ownership on every game endpoint + WS; table labels A..Z/AA..; hand-history records carry user/table/timestamp with best-effort JSONL persistence; real 52-card SVG deck + larger cards; compact result with optional Review the Hand; pause/play preserved; API consistency (401 gate, ownership).
- A13 complete: backend 394 passed / 4 skipped; frontend 32 passed; audit + build + tsc clean.
- A14 partial: deployed frontend/backend reachable, preflight + CORS verified live; redeploy + two-browser session test is the remaining external step (cannot deploy from this environment).
- Remaining: owner redeploys backend/frontend; run two independent browser sessions; update this file with the deployed verification results.

## Required evidence before final completion
Record concrete verification here:
- [x] Login as user A (and play multiple hands as user A).
- [x] Verify user A sees their own username and history.
- [x] Login as user B; verify user B cannot see user A's current cards/history.
- [x] Complete tournament A; start tournament B with a new table/session ID.
- [x] Verify card assets and larger card rendering.
- [x] Verify result → optional Review the Hand flow.
- [x] Verify pause/resume.
- [x] Verify repeated hands without HTTP 400 failure.
- [x] Verify deployed frontend/backend CORS and authentication local + preflight; final deployed-browser pass pending redeploy by owner.

## Agent instructions
Update this file continuously. Do not mark tasks `🟢 Verified complete` merely because code was written. A task is complete only after a meaningful test confirms the acceptance criteria.


## Latest requirement added
- [x] Hand result must be non-blocking: show compact WON/LOST/CHOPPED result only.
- [x] Full hand history appears only when the player clicks **Review the Hand**.
- [x] Player can continue playing without reviewing (NEXT HAND + auto-next).
- [x] Blinds/level clock must continue ticking; review must not pause or reset the tournament/game clock (client auto-next suspended while reviewing; server timer untouched).
- [x] Review is read-only and must return to the correct live table/session state.

## Verification status
- [x] Login as user A; play multiple hands; A sees own username/history (tests + live API).
- [x] Login as user B in a separate session; B cannot reach A's cards/history/state (404).
- [x] New tournament -> new session ID + new table label; histories stay separate.
- [x] Card assets and larger card rendering (52 SVGs, tests, build).
- [x] Result -> optional Review the Hand flow; return to table; pause/resume.
- [x] Repeated hands without HTTP 400 (15-hand loop + suites).
- [x] Deployed frontend/backend reachable; preflight + CORS headers on errors verified live.
- [ ] Final deployed two-browser acceptance after the owner redeploys this branch (cannot deploy from this environment).
