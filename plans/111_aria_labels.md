---
id: 111
title: Screen-reader Names and Live Updates
phase: 8
status: in-progress
depends_on: [093, 101, 106]
test_file: frontend/tests/a11y_table.test.tsx
implementation_files: [frontend/src/components/TableAnnouncer.tsx, frontend/src/models/tableAnnouncements.ts, frontend/src/models/seatLabel.ts, frontend/src/components/PlayingCard.tsx, frontend/src/components/PokerSeat.tsx, frontend/src/components/PokerTable.tsx, frontend/src/components/LiveTableView.tsx, frontend/src/components/HandResult.tsx, frontend/src/components/CoachStrip.tsx, frontend/src/components/MobileCoachCard.tsx, frontend/src/components/CoachPanelView.tsx, frontend/src/components/HeroControls.tsx, frontend/src/components/BetSizer.tsx, frontend/src/components/HistoryDrawer.tsx, frontend/src/components/TableMenu.tsx, frontend/src/components/MenuCard.tsx, frontend/src/components/LeaderboardParts.tsx, frontend/src/components/LeaderboardPodium.tsx, frontend/src/components/AuthField.tsx, frontend/src/components/LoginForm.tsx, frontend/src/models/game.ts, frontend/src/i18n/messages/en/a11y.ts, frontend/src/i18n/messages/es/a11y.ts]
---

# Objective

The owner (5 Nov): make ICMBOT easier to use for players with weaker eyesight and for screen-reader
users. This plan gives every button, icon, card and seat a name a screen reader can say, in English and
Spanish, and adds live announcements (spoken updates) for what happens at the table.

No code is written until the owner approves this plan.

# What is there today

Audit of `frontend/src` on `main` at 762547f.

- **Good already:** the (i), History and Coach chips (`TableChips.tsx`), the ☰ button and table menu,
  the phone tab bar (`aria-current="page"`), the bet sizer's minus, plus, slider and amount box, the
  password eye, the language menu, the sheets and drawer (`role="dialog"` with a name), the glossary
  terms (`aria-haspopup`, `aria-expanded`), the Pro locks, the Report charts.
- **Nothing is announced at the table.** No `aria-live` region says whose turn it is, what a bot did,
  which cards came, or that a level went up. A screen-reader player has to explore the felt after every
  poll (350 ms) to find out.
- **Cards are English only.** `cardAlt` in `models/game.ts` says "Ace of Spades" on icmbot.es too, and
  every back is `alt="face down card"`. Eight bots read as 16 "face down card" images.
- **A seat is a pile of loose text.** "HJ", "•", "D", the name, "Ana bot profile" (the photo's alt
  repeats the name), the stack, two backs. Whose turn it is shows only as a CSS class.
- **Status regions hold buttons or ticking text.** `HandResult` is `role="status"` and holds "Next hand
  in 4", so a screen reader may repeat the box every second. `CoachStrip` and `MobileCoachCard` are
  `role="status"` around their buttons, and the strip's tap target is a `div` with `onClick`.
- **Weak or missing names:** the ✕ that removes a board card on the Coach page (no name), the ✕ in
  `CoachCardPicker` (`title` only), HIDE and SHOW on the coach panel and hand review (no
  `aria-expanded`), the size presets ("2.5x5,000", no space), the slider (reads "5000", no
  `aria-valuetext`), the drawer tabs (no `aria-controls`, no tab panel), "Tournament Champion" (English
  `alt`), the leaderboard points (`aria-label` on a plain `span`, which screen readers ignore), the old
  `<h1>ICM MASTER</h1>` in `TablePage.tsx`.
- **Sign-in:** the fields have only a placeholder, which goes away once the player types, and the error
  is not tied to a field (`aria-invalid`, `aria-describedby`).
- **Focus:** the table menu, the history drawer, the coach sheet and a glossary pop-up do not move
  focus in when they open or back to their button when they close.

# Areas, most used first

## 1. The live table (`#/table/:id`)

1. **Live announcements (new).** A visually hidden `TableAnnouncer` with two regions:
   `aria-live="polite"` for the game and `aria-live="assertive"` for the hero's turn only. It says:
   - a bot's action: "Ana raises to 2,400"; a fold: "Ana folds";
   - a new street: "Flop: Ace of Spades, 7 of Hearts, 2 of Clubs";
   - the hero's turn: "Your turn. 1,200 to call. Coach: Raise" (the coach part only for Pro, and only
     when the advice is for this street, as `coachNow` in `LiveTableView.tsx`);
   - the result: "You won, +3,400 chips", once;
   - a new level or a break: "Level 4, blinds 200/400, ante 50".
   The texts come from a pure function `announcementsFor(prev, next, t)` in
   `models/tableAnnouncements.ts` that compares two snapshots. A repeat of the same snapshot (the poll)
   says nothing. At most one polite message per poll, joined with ". ".
2. **Seats.** `PokerSeat` gets `role="group"` and a name from `seatLabel(player, t)` in
   `models/seatLabel.ts`: "Ana, hijack, 45,000 chips, 112.5 big blinds, dealer, to act". It adds
   "folded", "all-in", "out", the bet in front ("bet 2,400") and the last action. The visual pieces that
   the name already says (`•`, `D`, the position, the BB part) get `aria-hidden`. The bot photo gets
   `alt=""` because the name is next to it. The two backs become `aria-hidden` and the name ends with
   "2 cards". The hero's seat says "You" and the hero's two cards.
3. **Cards.** Card words move to `i18n/messages/{en,es}/a11y.ts`: `card.rank.A` "Ace" / "As",
   `card.suit.s` "Spades" / "picas", `card.name` "{rank} of {suit}" / "{rank} de {suit}", `card.back`
   "Face-down card" / "Carta boca abajo". `cardAlt` takes `t`. The board gets `role="group"` with the
   name "Board" / "Mesa" and an empty board says "No cards yet" / "Sin cartas aún". The felt logo stays
   `alt=""`.
4. **The header line (level, ante, clock, pot).** The caption and value spans come from the `Stat`
   component of the plan 106 follow-up in `PokerTable.tsx` (branch `feat/table-bars-readable`, PR #127
   merged, its `Stat` change not yet on `main`). This plan waits for it and does not change that
   markup, only adds to it: the clock gets `role="timer"` (no live updates, since a ticking region
   would talk every second) and a name, "Time left in level 4: 3:12"; the dash between level and blinds (`tbl-sep`) gets
   `aria-hidden`; the level and pot are not live. The announcer (point 1) says the level change and the
   pot is in each "your turn" message.
5. **Buttons and bet size.**
   - `HeroControls`: the action row is a `role="group"` named "Your actions" / "Tus acciones".
     `aria-keyshortcuts` names the keys `useHeroKeys` already uses (F, C, K, Enter). When it is not the
     hero's turn the group's name adds "waiting" so a disabled row is not silent.
   - Each `aria-label` keeps the visible words (WCAG 2.5.3, label in name): "Call 1,200" for "CALL
     1,200". The glyph mode (`showLabels` off) keeps its names.
   - `BetSizer`: presets get "2.5x, 5,000 chips"; the slider gets `aria-valuetext` "5,000 chips, 2.5
     big blinds".
6. **Coach.** `role="status"` leaves `CoachStrip` and `MobileCoachCard`; the announcer says the advice
   once per decision instead. The strip's `div` tap stays for the mouse; the Why button is the keyboard
   way in, as now. HIDE and SHOW on `CoachPanelView` and `HandReview` get `aria-expanded`.
7. **Hand result.** `HandResult` keeps a short name ("You won, +3,400 chips") but is no longer a live
   region. The countdown goes outside any live region. The announcer says the result once.
8. **Panels and focus.** The table menu, `HistoryDrawer` and `CoachSheet` move focus to their first
   control on open and back to the button that opened them on close. The drawer tabs get `id`,
   `aria-controls` and a `role="tabpanel"`, with arrow keys between tabs. `TablePage`'s old
   `<h1>ICM MASTER</h1>` becomes "ICMBOT".

## 2. Home

- `MenuCard`: the name is the title only; the description moves to `aria-describedby`. The lock stays
  in the name: "Quiz, Pro, locked".
- `HomeBand`, `UpgradeCard`, the leaderboard card on Home: check every icon has `aria-hidden` and every
  button a name.
- Leaderboard (`LeaderboardParts.tsx`, `LeaderboardPodium.tsx`): the points get visually hidden text
  ("1,240 points") instead of `aria-label` on a `span`.

## 3. Learn

- Coach page: a name for the ✕ that removes a board card ("Remove Ace of Spades"), and in
  `CoachCardPicker` a name, not only a `title`.
- Quiz (`QuizCards.tsx`): the turned cards are read as "Your cards: Ace of Spades, King of Hearts", not
  just "the cards".
- Glossary pop-up: focus moves in on open and back to the term on close.

## 4. Review

- Hand review, Mistakes, History, Report: cards through the new `cardAlt`; HIDE and SHOW with
  `aria-expanded`; filter selects with names. `TournamentWinner` gets a translated `alt`.

## 5. Sign-in and the landing page

- `AuthField`: a visible label above each field (helps weaker eyesight too), tied with `htmlFor`. The
  error from `AuthMessages` gets an `id`; the field gets `aria-invalid` and `aria-describedby`.
- The landing page is in good shape (named sections, both hero pictures with `alt`, the hidden one
  `aria-hidden`). Check only, no planned change.

# Decisions

- **Visible text first.** A button with words needs no `aria-label`. `aria-label` only for icons and
  glyphs (×, ‹, i, ☰, ▶), and then it holds the visible text if there is any.
- **`aria-labelledby`** when the name is already on screen elsewhere (a dialog's title, a section's
  heading). **`aria-describedby`** for extra text that should not be part of the name (a card's
  description, a field's error).
- **No `aria-label` on a plain `div` or `span`.** Screen readers skip it. Use visually hidden text
  (`.sr-only` in `styles/brand.css`) or a role that allows a name.
- **Every new string in both languages.** New keys in `i18n/messages/en/a11y.ts` and
  `es/a11y.ts`, added to `en.ts` and `es.ts`. TypeScript and `i18n.test.tsx` already check that `es`
  has the same keys and `{placeholders}`. Words players use in English in Spanish too (flop, turn,
  river, BB) stay as the table shows them.
- **Live regions stay quiet.** Polite by default. Assertive only for "your turn". One region per
  kind, mounted once in `LiveTableView`, never inside a box that comes and goes (a region added with
  its text is often not read). The clock never talks.
- **No new runtime dependency.** The optional axe check (below) is a dev dependency only.
- Every file stays at 200 lines or fewer (hard rule 6). `PokerSeat.tsx` (102) and `PokerTable.tsx`
  (139) get their label code from the new `models/seatLabel.ts`; `LiveTableView.tsx` (145) only mounts
  the announcer.

# Steps (one PR each)

1. **Cards and seats.** `a11y.ts` (en, es), `cardAlt` with `t`, `PlayingCard`, `PokerSeat`,
   `seatLabel.ts`, the board group, `TablePage` heading.
2. **Live announcements.** `tableAnnouncements.ts`, `TableAnnouncer.tsx`, mounted in `LiveTableView`;
   `HandResult`, `CoachStrip`, `MobileCoachCard` out of `role="status"`; the clock's `role="timer"`
   once the plan 106 follow-up is on `main`.
3. **Controls and panels.** `HeroControls`, `BetSizer`, HIDE and SHOW, focus in the table menu, drawer,
   coach sheet and glossary pop-up, drawer tabs, the Coach page ✕.
4. **Home, Learn, Review, sign-in.** `MenuCard`, leaderboard points, quiz cards, `TournamentWinner`,
   `AuthField` labels and errors; the optional axe check.

The prime-agent prompt for these four PRs is `prime-agent-spec/PLAN_111_ARIA_LABELS_PROMPT.md`.

# Tests

New `frontend/tests/a11y_table.test.tsx`, `a11y_announcer.test.ts`, `a11y_pages.test.tsx`.

- **Names by role:** `getByRole("group", { name: /Ana, hijack, 45,000 chips/ })`,
  `getByRole("img", { name: "Ace of Spades" })`, `getByRole("button", { name: "Call 1,200" })`,
  `getByRole("slider", { name: "Bet size" })` with `aria-valuetext`, `getByRole("timer")`, the board
  group, the ✕ on the Coach page. The same checks with `?lang=es` ("As de picas", "Igualar 1.200").
- **No noise:** 8 bot seats give 0 images named "Face-down card". No `aria-label` on an element whose
  role does not allow one (a small helper walks the tree).
- **Announcer:** `announcementsFor` on snapshot pairs: a bot raise, a new street, the hero's turn, a
  result, a level change; the same snapshot twice gives nothing; the clock alone gives nothing; Free
  gets no coach part. Then a render test that the polite region holds the text after a poll.
- **Hand result:** the countdown is not inside any `aria-live` or `role="status"` element.
- **Focus:** open and close the table menu, the drawer and the coach sheet with the keyboard; focus
  goes in and comes back.
- **Sign-in:** the username field has a visible label; after a bad password it has `aria-invalid` and
  its description is the error text.
- **English and Spanish have the same keys** (the existing `i18n.test.tsx`).
- **Optional axe check:** `axe-core` as a dev dependency (justified in the commit message), run in
  `a11y_pages.test.tsx` over the table, Home, Learn, Review and sign-in, failing on any `serious` or
  `critical` rule. jsdom cannot check colour contrast, so that rule is off there.
- Reverting each fix makes its test fail with a message naming the cause (repo rule).
- Both suites stay green, and the counts go in `progress.md`.

# Not in this plan

- Colour contrast, text size and a larger-text setting (the weaker-eyesight half of the owner's ask).
  They need the Phase 2 look settled and their own plan.
- Admin pages (English only, used by the owner).
- The Android app's native parts (TalkBack reads the web view, so most of this plan reaches it).
- The demo and ad videos (captions are a separate job).
- Changing the table's look. This plan only adds names, roles and hidden text.

# Open for the owner

- Spanish card words: "As, Rey, Reina, Jota" or "As, Rey, Dama, Jota"; suits "picas, corazones,
  diamantes, tréboles".
- How much the announcer says: every bot action (as written) or only raises, all-ins and the hero's
  turn.
- A visible label over the sign-in fields changes the sign-in look. Yes (as written), or a hidden label
  only.
- The axe check: add `axe-core` as a dev dependency, or skip it.

# Not verified

- How NVDA, VoiceOver and TalkBack read the announcer with a 350 ms poll. Step 2 needs a check on a real
  phone and a desktop screen reader before it is called complete.
- Whether `aria-keyshortcuts` is read by TalkBack. It is harmless if not.
