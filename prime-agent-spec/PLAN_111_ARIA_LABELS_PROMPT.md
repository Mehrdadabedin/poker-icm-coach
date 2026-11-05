# Prime-Agent Prompt: plan 111, screen-reader names and live updates

You are working in the ICMBOT repository. Read `CLAUDE.md` first and follow it.
Then read `plans/111_aria_labels.md` on `main`. Build it only after the owner
has approved the plan and answered its "Open for the owner" list; use their
answers where they differ from the plan.

## Where to work

```
cd /home/mehrdad/Projects/poker-icm-coach
git fetch origin
git worktree add ../poker-icm-coach-a11y origin/main -b feat/a11y-cards-seats
ln -s /home/mehrdad/Projects/poker-icm-coach/frontend/node_modules ../poker-icm-coach-a11y/frontend/node_modules
```

Other sessions use the main checkout and its sibling worktrees: never switch
their branches. Never commit the `node_modules` link; add files by name. Every
command under `timeout 300` (`timeout 900` for full test runs).

Four PRs, in order, one branch each, each from `origin/main` after the one
before is merged: `feat/a11y-cards-seats`, `feat/a11y-announcer`,
`feat/a11y-controls`, `feat/a11y-pages`.

## What exists today (read these first)

- `components/PokerTable.tsx` (header line, felt, board), `PokerSeat.tsx`,
  `PlayingCard.tsx`, `CardView.tsx`; `models/game.ts` (`cardAlt`, `RANK_WORD`,
  `SUIT_WORD`, English only).
- `components/LiveTableView.tsx` (mounts everything at the table; `coachNow` is
  the advice for this street), `HeroControls.tsx`, `BetSizer.tsx`,
  `hooks/useHeroKeys.ts` (F, C, K, Enter, arrows).
- `components/HandResult.tsx`, `CoachStrip.tsx`, `MobileCoachCard.tsx` (all
  `role="status"` today), `CoachPanelView.tsx`, `CoachSheet.tsx`,
  `HistoryDrawer.tsx`, `TableMenu.tsx`, `TableChips.tsx`, `GlossaryTerm.tsx`,
  `hooks/useDismiss.ts`.
- `i18n/messages/en.ts` and `es.ts` join one file per area from `en/` and
  `es/`; `tests/i18n.test.tsx` checks both have the same keys and
  placeholders. `.sr-only` is in `styles/brand.css`.
- The frontend polls every 350 ms (CLAUDE.md), so a snapshot often repeats.
- 200 lines max per `.ts`/`.tsx`; no em dashes; no `any`, no `console.*`.

## PR 1: cards and seats (`feat/a11y-cards-seats`)

1. New `i18n/messages/en/a11y.ts` and `es/a11y.ts`, joined in `en.ts` and
   `es.ts`: card ranks, suits, `card.name`, `card.back`, `board.label`,
   `board.empty`, the seat words (positions spelled out, "dealer", "to act",
   "folded", "all-in", "out", "bet {n}", "{n} chips", "{n} big blinds",
   "2 cards", "You").
2. `cardAlt(card, t)` uses those keys. Update every caller.
3. New `models/seatLabel.ts`: `seatLabel(player, active, lastAction, t)`.
   `PokerSeat` gets `role="group"` and that name. `•`, `D`, the position and
   the BB part get `aria-hidden`; the bot photo `alt=""`; the two backs
   `aria-hidden`.
4. The board: `role="group"`, named; the empty board says `board.empty` in
   hidden text.
5. `TablePage.tsx`: the old `<h1>ICM MASTER</h1>` reads ICMBOT.

Tests (`tests/a11y_table.test.tsx`): the seat, card and board names by
`getByRole(..., { name })` in English and with `?lang=es`; 8 bots give 0
images named as a card back; no `aria-label` on a plain `div` or `span`.

## PR 2: live announcements (`feat/a11y-announcer`)

1. `models/tableAnnouncements.ts`: pure `announcementsFor(prev, next, opts, t)`
   returning `{ polite: string | null, assertive: string | null }`. Bot actions
   since `prev` (from `actionLog`), a new street with its cards, the hero's
   turn with the amount to call and the pot (plus "Coach: {action}" when
   `opts.coach` is set), the result once per hand, a level or break change.
   The same snapshot twice and a clock-only change return nulls.
2. `components/TableAnnouncer.tsx`: two `.sr-only` regions
   (`aria-live="polite"`, `aria-live="assertive"`) mounted once in
   `LiveTableView`, always present, the text replaced per message. It keeps
   the previous snapshot in a ref.
3. `HandResult`, `CoachStrip`, `MobileCoachCard`: remove `role="status"`.
   `HandResult` keeps its short name; the countdown is outside any live region.
4. The clock: `role="timer"` and a name, no `aria-live`. The header's caption
   and value spans come from the `Stat` change of the plan 106 follow-up
   (branch `feat/table-bars-readable`). If that change is not on `main` yet,
   leave the clock for PR 3 and say so in the PR body. Do not edit that branch.

Tests (`tests/a11y_announcer.test.ts`): each case of point 1, Free gets no
coach part, and a render test that the polite region holds the text after a
poll. Prove one test by reverting the dedupe and watching it fail.

## PR 3: controls and panels (`feat/a11y-controls`)

1. `HeroControls`: the action row `role="group"`, named, with "waiting" when
   it is not the hero's turn; `aria-keyshortcuts` from `useHeroKeys`; every
   `aria-label` holds the visible words.
2. `BetSizer`: preset names "{size}, {n} chips"; slider `aria-valuetext`.
3. `CoachPanelView` and `HandReview`: HIDE and SHOW get `aria-expanded`.
4. Focus moves in on open and back to the opener on close: table menu,
   `HistoryDrawer`, `CoachSheet`, the glossary pop-up. A small shared hook is
   fine if it keeps files under 200 lines.
5. `HistoryDrawer` tabs: `id`, `aria-controls`, `role="tabpanel"`, arrow keys.
6. Coach page ✕ and `CoachCardPicker` ✕: names ("Remove {card}").

Tests: names by role in both languages, `aria-valuetext`, focus in and back
with `userEvent.keyboard`.

## PR 4: Home, Learn, Review, sign-in (`feat/a11y-pages`)

1. `MenuCard`: the title is the name, the description `aria-describedby`.
2. Leaderboard points: hidden text, not `aria-label` on a `span`.
3. `QuizCards`: the turned cards are read by their names.
4. `TournamentWinner`: translated `alt`.
5. `AuthField`: a visible label with `htmlFor` (if the owner said yes), the
   error tied with `aria-invalid` and `aria-describedby`.
6. Optional, if the owner said yes: `axe-core` as a dev dependency (justify it
   in the commit message), `tests/a11y_pages.test.tsx` runs it over the table,
   Home, Learn, Review and sign-in, failing on `serious` or `critical`; colour
   contrast off (jsdom cannot check it).

## Git and checks, every PR

- `npm run lint`, the full `npx vitest run` and all pre-push gates pass.
  Report the test counts before and after.
- Plan 111 `in-progress` from PR 1 with its `progress.md` row updated each PR;
  `complete` after PR 4.
- PR body with "## What changed" and "## Tests" sections, as recent PRs.
- Push and open the PR to `main`. Do not merge.

## Check it

After PR 2, run the app (`npm run dev`) and play one hand with a screen reader
on (Orca or NVDA on the desktop, TalkBack on an Android phone if you have one).
Write in the PR what was read aloud and when. If you could not run a screen
reader, say "I did not verify with a screen reader".

Report: the PR links, the test counts before and after, what a screen reader
read, and anything you did not check.
