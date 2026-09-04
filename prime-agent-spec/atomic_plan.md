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

## A18 — User registration (PLANNED — NOT IMPLEMENTED)
- Clear REGISTER option for first-time users; registration with username, email,
  password; registered users log in with those credentials.
- Existing A02-A15 login/logout stays intact; username continues to replace
  "Hero"; credentials stored securely; logout clears the session; users stay
  isolated. DO NOT IMPLEMENT NOW.

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

---
NOTE: Google authentication, Facebook authentication, and Google/Facebook OAuth
are intentionally OUT OF SCOPE and must not be added to this plan or the app.
