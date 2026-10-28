---
id: 103
title: Light and Dark Theme
phase: 8
status: planned
depends_on: [099]
test_file: frontend/tests/theme.test.tsx
implementation_files: [frontend/src/styles/tokens.css, frontend/src/services/theme.ts, frontend/src/components/AppearancePicker.tsx, frontend/src/pages/SetupPage.tsx, frontend/src/main.tsx, frontend/index.html, frontend/src/i18n/messages/en/theme.ts, frontend/src/i18n/messages/es/theme.ts]
---

# Objective

The owner (28 Oct): players choose a dark or a light look in Setup. Build it
right after the tab bar (099) and before 100, 101 and 102, so the locks, the
Upgrade sheet, the coach strip and the leaderboard are made for both themes
from the start.

Design: Phase 2 canvas, https://claude.ai/artifact/3kjEBZMVYhwtXRQ8NbX9ic,
screens 11 to 15 (approve before building).

# Decisions

- Setup, APPEARANCE: three choices, Dark, Light and Same as my phone (the
  default, which follows the phone's dark mode). Spanish: Oscuro, Claro,
  Igual que el teléfono.
- The choice is kept on the device (`localStorage`, key `icmbot.theme`), not
  on the server: `/api/settings` lives in memory and is lost on every
  deploy. It is read before the first paint (a few lines in `index.html`), so
  the app never flashes the wrong theme. A blocked `localStorage` falls back
  to Same as my phone.
- Colours move into one file, `styles/tokens.css`: CSS variables on `:root`
  for dark and on `:root[data-theme="light"]` for light. The 47 stylesheets
  use about 160 different hex colours today; each is replaced by a token
  (`--bg`, `--surface`, `--surface-line`, `--text`, `--text-muted`,
  `--accent`, `--accent-ink`, `--tab-bar`...). Pages look the same as today
  in dark; the work is one stylesheet group per commit so a mistake is easy
  to find.
- Dark: background `#14181d`, cards `#1d242c` with `#2c3540` lines, text
  `#f3f1ea`, muted `#a7b0ba`, gold `#f2c14e`.
- Light: background `#fafaf8`, cards white with `#e5e3dc` lines, text
  `#141414`, muted `#5f5e5a`. Gold text on white is too faint, so gold words
  and the current tab use `#8a5a00`; gold buttons keep `#f2c14e` with dark
  text.
- Both themes keep the black header band with the gold ICMBOT logo (the logo
  is drawn for a dark background).
- The table: the felt stays green, the cards white, the action buttons (FOLD
  red, CALL green, RAISE gold, ALL-IN purple) the same in both themes. Only
  the panels around the felt (top bar, coach strip, info line, size buttons,
  sheets) follow the theme.
- Coach colours in light: RAISE blue `#0b5cc4` (the dark theme's
  `#4f9cff` is too faint on white); FOLD, CALL and the grades get darker
  shades the same way.
- Every colour pair passes WCAG AA contrast (4.5:1 for text) in both themes;
  a test checks the token pairs.
- The Android status bar follows the theme (`theme-color` meta).
- Admin pages, the landing page and the sign-in screen follow the theme too;
  e-mails and the demo videos do not change.

# Tests

- The picker shows three choices with the current one marked, in both
  languages; a choice sets `data-theme` on `<html>` and is kept after a
  reload.
- Same as my phone follows `prefers-color-scheme`, and changes when the phone
  does.
- No stylesheet has a hex colour outside `tokens.css` (a test reads the CSS
  files), except the table's fixed colours listed in `tokens.css` comments.
- Contrast of every text token on its background, in both themes, is at
  least 4.5:1.
- Every existing test still passes.
