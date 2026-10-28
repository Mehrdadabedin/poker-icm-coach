---
id: 100
title: Free and Pro Plans
phase: 8
status: complete
depends_on: [095, 099]
test_file: [backend/tests/test_plans.py, backend/tests/test_plans_db.py]
implementation_files: [backend/app/models/orm_plans.py, backend/app/services/plans.py, backend/app/api/deps.py, backend/app/api/routes_game.py, backend/app/api/routes_history.py, backend/app/api/routes_profile.py, frontend/src/services/plan.ts, frontend/src/components/LockedItem.tsx, frontend/src/components/UpgradeSheet.tsx, frontend/src/pages/BotProfilesPage.tsx, frontend/src/i18n/messages/en/plans.ts, frontend/src/i18n/messages/es/plans.ts]
---

# Objective

The owner (28 Oct): a free plan that gives practice only, and a paid plan
(Pro) for everything else. Free players see what Pro adds, with a lock icon,
and an Upgrade entry in the lists.

Design: Phase 2 canvas, https://claude.ai/artifact/3kjEBZMVYhwtXRQ8NbX9ic, screens 2, 3, 4, 8 and 10 (approve before
building).

# What each plan gives

| Feature | Free | Pro |
|---|---|---|
| Practice tournament (9 players) | yes | yes |
| Bot lineup | random, not chosen | chosen (BOT PROFILES) |
| ICM coach at the table | locked | yes |
| Coach grade after each action | locked | yes |
| Learn: ICM coach, Ranges, ICM calculator | locked | yes |
| Learn: Glossary | yes | yes |
| Review: My mistakes, Hand history, Report | locked | yes |
| Leaderboard (plan 102) | yes | yes |
| Profile, settings | yes | yes |

# Decisions

- One row per user in a new table `user_plans` (owner, plan `free`/`pro`,
  since, until, source `admin`/`store`/`web`). No row means Free. PostgreSQL
  on Render, like profiles (plan 095).
- The server decides, not the screen. The coach endpoints
  (`/api/game/{id}/coach`, `/coach/compare`, `/coach/advice`,
  `/coach/hands`), history and report return 402 with
  `{"detail": "pro_required"}` for Free. A Free table is created with a random
  lineup even if a client sends one. Hiding buttons alone would let anyone
  call the API.
- Free start: Start practice skips BOT PROFILES and deals 8 random bots from
  the 4 personalities. The table shows each bot's style, so the player still
  learns who is tight or loose.
- Free table: no coach strip, no grade banner. A small locked "ICM coach"
  chip in the coach's place opens the Upgrade sheet (plan 101).
- Locked items stay in place with a lock icon and grey text. A tap opens the
  Upgrade sheet: what Pro adds, and an Upgrade button.
- Upgrade entry: the last card of Learn and Review, and a row in Profile,
  with the lock icon, only for Free players.
- Admins (the owner, 28 Oct) always have every feature, whatever their
  plan row says: the server's Pro check passes for `is_admin`. Where a Free
  player sees a closed lock, an admin sees an open lock, so the admin can
  still tell which features are Pro. Admins get no Upgrade entry and no
  locked coach chip; the table shows the coach as for Pro.
- Admin, Users: an admin can set a user to Pro or Free (for testers, friends
  and refunds) until payments exist.
- `GET /api/account` returns `plan` so the app knows what to lock.

# Owner's answers (28 Oct)

1. Existing players stay on Pro: every account made before this plan ships
   gets a `user_plans` row `pro`, source `admin`. New accounts start Free.
2. The Glossary is free for everyone.

# Still open

3. Price and period (monthly, yearly), and a free trial?
4. Payment: in the Android app, Google requires Google Play Billing for a
   digital subscription; on the web, Stripe or Paddle. This plan builds the
   locks and the Upgrade sheet; payment is its own plan once 3 is decided.
   Until then the Upgrade button says "Coming soon" and lists what Pro adds.

# Tests

- Free: coach, compare, advice, history and report return 402; a table is
  created with 8 random bots whatever lineup is sent.
- Pro: everything as today (all current tests pass unchanged with the test
  user on Pro).
- An admin sets a plan; a non-admin cannot.
- An admin with no plan row, or a Free row, gets every Pro endpoint and
  chooses the bot lineup.
- Frontend, admin: every Pro item shows the open lock, opens its page (not
  the Upgrade sheet), and there is no Upgrade entry.
- Frontend: locked items show the lock and open the sheet; Pro shows no
  locks and no Upgrade entry; both languages.

# Built (29 Oct)

- Backend: `user_plans` (memory or PostgreSQL, like profiles), `plan_for`/`is_pro` (admin is always Pro),
  `require_pro` (402 `pro_required`) on the coach, ranges, ICM, hands, statistics, history and report
  endpoints, random lineup for Free (`services/bot_lineup.py`), `plan` and `admin` in `GET /api/account`,
  `PUT /api/admin/users/{u}/plan`, plan in the admin user list, plan deleted with the account.
  Existing accounts are made Pro once, on the first start that creates `user_plans` (source `grandfathered`).
  Tests: `test_plans.py`, `test_plans_db.py`. Existing tests stay Pro through a conftest default plan of `pro`.
  `GET /api/icm` and `GET /api/ranges` used to be public; they now need a login.
- Frontend: `usePlan()`, locks on the six Pro cards (closed gold lock for Free, open green lock with PRO for
  admins), Upgrade sheet (Coming soon, no price), Upgrade cards on Learn and Review, a row in Profile, the
  phone Home card, `ProOnly` on the Pro routes, Free Start practice without a lineup, a locked chip where the
  coach would be, a locked line in the hand history panel.
- Admin, Users: a Free/Pro switch per user (an admin row reads "Pro (admin)"). The "Unlock the ICM coach" card shows on the wide Home too. Locked card titles and text use dimmer tokens (`--lock-title`, `--lock-text`).
- Not built: payment.
