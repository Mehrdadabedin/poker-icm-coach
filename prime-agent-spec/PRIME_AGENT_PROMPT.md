# Prime-Agent Prompt — ICM Master Changes

You are modifying an EXISTING ICM Master poker/ICM application.

**Important: do not rebuild, replace, or damage the existing working poker/ICM system.**
First inspect the current project and architecture. Make the smallest safe incremental changes.

Use the supplied screenshots in this conversation as visual/bug references:
- The card reference shows real illustrated playing-card artwork.
- The current UI shows `Hero`, small/simple cards, automatic Poker Hand History after a hand, and the HTTP 400/CORS/API failure.

Read and follow `atomic_plan.md` as the implementation checklist and `progress.md` as the living project status.

## Required changes

### 1. Authentication and player identity
Create username authentication/login using the existing authentication architecture if one already exists.

After login:
- Create an authenticated player/session.
- Replace the visible player name `Hero` with the logged-in username everywhere.
- Add logout.
- Do not trust an arbitrary username/user ID sent from the browser to authorize access.

Example:
`Hero` → `Mehrdad`

### 2. Multiple players on one physical table
The application currently has one poker-table UI. Keep that one table.

However, the backend must support multiple independent logical game sessions:
- User A has their own session/game state.
- User B has their own session/game state.
- Their cards, hands, histories, stacks, actions, and tournament state must never mix.

Do not use a single global mutable game object shared by all users.

Use a model equivalent to:

`Authenticated User → Tournament Session → Table → Hand → Actions`

Every API call must resolve the authorized session from the authenticated identity.

### 3. Table IDs and repeat tournaments
Give each tournament/session a human-readable table ID:
`A, B, C ... Z`

The internal session/game ID must remain unique and must be the real data key.

When a player completes one tournament and starts another:
- create a new tournament/session ID,
- assign a new available display table ID,
- keep the previous tournament's history separate.

If more than 26 active tables are possible, safely extend to `AA`, `AB`, etc. Do not reuse an active ID.

### 4. Hand history isolation
Every hand history record must belong to its authenticated tournament/session.

Store enough data to review:
- hand number,
- player/user,
- hole cards,
- board,
- actions,
- pot,
- stacks/chip changes,
- showdown/result,
- timestamp,
- table ID.

A player must never receive another player's history.

### 5. Real playing cards — NOT simple cards
Replace the current simple/emoji/text card presentation.

The supplied card screenshot is the visual reference. Use actual playing-card image assets in the ICM Master UI.

Requirements:
- No emoji cards.
- No plain text `A♥`, `K♠`, etc. as the visual card.
- No tiny placeholder CSS cards.
- Use a reusable playing-card image component.
- Include a complete 52-card set and card back as needed.
- Reuse existing repository card assets if they already exist.
- Otherwise add proper local card image assets based on the supplied reference.
- Map rank+suit deterministically to the correct asset.
- Do not rely on remote image URLs at runtime.
- Preserve correct card proportions.

Make the cards substantially larger and more readable than the current UI, especially the player's hole cards and the board.

### 6. Change post-hand behavior
Do NOT automatically replace the table with the detailed `POKER HAND HISTORY` screen after every hand.

Desired behavior:

`TABLE → YOU WON / YOU LOST / CHOPPED → Continue`

The result state should be concise and show the important result/chip change.

Add an optional button:

**Review the Hand**

Only when the player clicks it:
`Review the Hand → detailed Poker Hand History`

Provide a clear way back to the table.

If the player does not click Review the Hand, the detailed history should not appear.

The hand must still be saved for later review.

### 7. Pause
Keep the existing pause/play functionality.

Pause must not:
- destroy the session,
- create a new game,
- mix player state,
- accidentally advance a hand.

Reviewing a hand must not accidentally advance gameplay.

### 8. Fix the HTTP 400/CORS issue
The screenshots show a deployed frontend at:
`icm-master-frontend.onrender.com`

and a backend at:
`poker-icm-coach.onrender.com`.

The browser shows an HTTP 400 during gameplay and a CORS-related message around `/api/game/{gameId}/cache/compare`.

Do not assume CORS alone is the root cause.

Reproduce the failure and inspect:
- Network request payload,
- response body,
- backend logs,
- request validation,
- game/session ID,
- frontend/backend API contract,
- CORS middleware,
- OPTIONS/preflight behavior where relevant,
- authentication/session state.

Determine the actual cause(s) and fix them properly.

Do not hide the 400, disable validation, or use an insecure wildcard CORS workaround when credentials are involved.

All relevant API responses, including controlled error responses, must have appropriate CORS headers for the deployed frontend origin.

Then test many consecutive hands to verify the issue is actually gone.

### 9. Regression protection
Add/update tests for:
- username login/logout,
- username replacing Hero,
- two users playing independently,
- history isolation,
- new tournament receiving a new table/session ID,
- card asset mapping,
- larger cards,
- win/loss/chop result,
- Review the Hand,
- return from review,
- pause/resume,
- repeated hands,
- invalid action handling,
- deployed CORS/auth behavior where practical.

### 10. Progress tracking
After every meaningful step update `progress.md`.

Do not mark a task complete just because code was written. Mark it verified only after testing the acceptance criteria.

## Execution order

1. Read `atomic_plan.md`.
2. Read `progress.md`.
3. Inspect the current repository architecture.
4. Complete A01 audit.
5. Reproduce and fix A02 before making unrelated UI changes.
6. Implement authentication/session isolation.
7. Implement table IDs and hand-history persistence.
8. Implement real card assets and larger card UI.
9. Implement result/review UX.
10. Add regression tests.
11. Test the deployed application with at least two independent player sessions.
12. Update `progress.md` with exact results and remaining issues.

## Final report
At the end, report:
- files changed,
- database/storage changes,
- authentication approach,
- session isolation approach,
- table-ID approach,
- card asset implementation,
- post-hand/review behavior,
- exact root cause of the 400/CORS problem,
- tests run and results,
- deployment verification,
- any remaining limitations.

Do not claim anything is fixed unless it was actually tested.


## IMPORTANT ADDITION — HAND RESULT SCREEN MUST NOT INTERRUPT PLAY

After each completed hand, the normal flow must be:

```text
Hand completes
   ↓
Show ONLY the compact result state:
┌─────────────────────────┐
│       YOU WON / LOST    │
│       +/- chips         │
│                         │
│ [Review the Hand]       │
└─────────────────────────┘
   ↓
Automatically return to / remain on the TABLE
   ↓
Next hand continues normally
```

**Review the Hand is optional and must be player-controlled.**

- Do NOT automatically open the full Poker Hand History after every hand.
- Do NOT stop the tournament/game flow waiting for the player to review a hand.
- The blinds/level clock must continue ticking according to the existing game rules.
- The player can click **Review the Hand** whenever they want to inspect the completed hand.
- Clicking **Review the Hand** opens the detailed hand-history/replay view using the new, larger real playing-card artwork.
- After reviewing, provide a clear **Back to Table / Continue** action and return to the live table.
- If the player does not click Review, they should be able to continue playing immediately.
- The compact result screen may show **YOU WON**, **YOU LOST**, or **CHOPPED**, plus the chip change, but it must not force the detailed history open.
- The implementation must not pause or reset the blind timer merely because the result/review option is visible.
- The live table state, tournament state, authentication/session state, and hand sequence must remain intact while the optional review panel is opened.
- Review must be read-only: reviewing a completed hand must never alter stacks, blinds, actions, table state, or tournament history.

### Acceptance test for this requirement

1. Play a hand.
2. Hand ends with WON, LOST, or CHOPPED.
3. Only the compact result is shown; detailed history is NOT automatically displayed.
4. Do nothing / continue without reviewing: the player can immediately proceed to the next hand while the existing blinds clock continues.
5. Click **Review the Hand**: detailed history opens for that exact completed hand.
6. Return to the table: the player sees the current live table state and can continue.
7. Repeat this across multiple hands and verify that each review opens the correct hand for the authenticated player/session.
