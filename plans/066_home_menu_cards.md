---
id: 066
title: Home Menu as Dark Cards on a White Page
phase: 6
status: complete
depends_on: [65]
test_file: frontend/tests/home_menu.test.tsx
implementation_files: [frontend/src/components/HomeMenu.tsx, frontend/src/components/homeMenuIcons.tsx, frontend/src/pages/HomePage.tsx, frontend/src/styles/home-menu.css, frontend/src/styles/pages.css, frontend/src/main.tsx]
---

# Objective

Replace the signed-in home menu (a column of ten yellow and blue buttons)
with the design the owner picked from three mock-ups: option C, cards with an
icon and one line each, in one dark colour on a white page.

# Design

- White page (#fafaf8) under a full-width black top bar (#07080a): the logo's
  white "ICM" letters need a dark background. The bar keeps the logo,
  "Playing as", and LOG OUT.
- Dark cards (#1d242c, 16px corners) with a gold line icon, a title and one
  line saying what the page does. Under the mouse a card turns a clearly
  brighter slate (#3a4656, lighter border), rises 3px and gains a dark grey
  shadow.
- Order: Continue table (only for a live table, plan 065) and Start practice
  as two large cards; then STUDY (ICM coach, Ranges, ICM calculator), REVIEW
  (My mistakes, Hand history, Statistics) and SETUP (Tournament settings, and
  Admin for admins).
- BOT PROFILES has no card: Start practice opens the same lineup builder.
- Phones: one card per row.
- The other pages keep the dark theme. A Light/Dark switch was mocked up and
  not chosen.

# Results

- Frontend 259 passed. New: the menu-cards test in home_menu.test.tsx (group
  order, card titles, an icon and a line on every card, no BOT PROFILES).
- Checked at 1280px and 375px with the server answers faked in the browser
  (signed in, table T1 still running).
