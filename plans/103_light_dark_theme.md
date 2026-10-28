---
id: 103
title: Light and Dark Theme
phase: 8
status: complete
depends_on: [099]
test_file: frontend/tests/theme.test.tsx
implementation_files: [frontend/src/styles/tokens.css, frontend/src/styles/tokens/, frontend/src/styles/appearance.css, frontend/src/services/theme.ts, frontend/src/components/AppearancePicker.tsx, frontend/src/pages/SetupPage.tsx, frontend/src/main.tsx, frontend/index.html, frontend/src/i18n/messages/en/theme.ts, frontend/src/i18n/messages/es/theme.ts]
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

# Built (28 Oct)

- `styles/tokens.css` (shared names) and `styles/tokens/{home,table,review,account,signin,landing}.css`
  (one file per area, imported by `tokens.css`): 308 tokens, dark on `:root` and
  `:root[data-theme="dark"]`, light on `:root[data-theme="light"]`. Fixed colours (felt, rail, cards,
  action buttons, provider buttons, header bands) are marked `/* fixed */` in the dark block only. The
  tokens of one area live in their own file instead of one `tokens.css`, so each stays under about 150 lines.
- All 48 stylesheets use tokens; the dark theme resolves to the old values (checked rule by rule
  against `origin/main`, except the home and tab pages, which take the dark page of screen 13).
- Old pages kept their body text and muted grey as `--body-text` (#e8e6e1) and `--muted` (#9aa0a6);
  `--text` is the new #f3f1ea.
- `.keep-dark`: in the light theme an element with this class takes the dark block. Used on the felt,
  the table header, the page header band and the landing header (the logo is drawn for a dark band).
  `color` is set again there because it is inherited, not re-resolved.
- `services/theme.ts`, a few lines in `index.html` (no flash), `AppearancePicker`, English and
  Spanish words. The owner (28 Oct, after merge): the picker sat under the tournament settings and
  read as part of them, so it moved to an Appearance card of its own in SETUP (phone Setup tab and
  wide home menu) and its page `#/appearance`; it shows nowhere else. Not the Profile page: that
  holds the account, kept on the server, and the look is kept per device. The `theme-color` meta is the band's #07080a in both themes.
- The Report heat map lightness is a token (`--heat-lightness`): `heatColour()` returns
  `hsl(h 35% var(--heat-lightness))`. The ring chart colours in `WinLoseAnalysis` are tokens too.
- Plan 099 follow-ups: the cookie banner clears the tab bar; `clearAuth()` and `saveAuth()` announce
  the session change (`services/authEvent.ts`, no imports). `ProfilePage` reads the session once, so
  ending it there (account deleted) goes home, not to sign-in.
- Left as they were: the four bot avatar colours (`botProfiles.ts`) and the Google logo colours
  (`AuthIcons.tsx`), which are brand colours; `rgba(0,0,0,a)` shadows and scrims.

# Light-theme fixes after review (28 Oct)

- Gold buttons keep #f2c14e with dark ink in both themes: `--accent-fill` and `--accent-ink` (#141414), and for
  the landing page `--landing-btn-gold-bg` and `--landing-step-bg` (dark keeps its #f2b33d). `--accent` (#8a5a00 in light) is for gold text and icons only.
- Seats have a fixed opaque dark box (`--seat-bg`); folded, out and lost seats use dimmer text
  (`--seat-ink-dim`) and a dimmer photo instead of opacity.
- The contrast test lists the badge, chip, admin, chart, error and button pairs (about 60) and checks that every
  `-ink` or `-text` token with a `-bg` twin is listed. Two dark pairs were under 4.5:1 and changed:
  the Report axis text (#6b7480 to #8e98a5) and the Ranges jam cell (#e65100 to #b03a00).
