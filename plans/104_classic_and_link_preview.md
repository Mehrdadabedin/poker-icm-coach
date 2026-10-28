---
id: 104
title: Retire /classic, a Real Link Preview and Hero
phase: 8
status: complete
depends_on: [069, 101, 102, 103]
test_file: frontend/tests/site_meta.test.ts
implementation_files: [frontend/src/landing-minimal/MinimalHero.tsx, frontend/src/i18n/messages/en/landing.ts, frontend/src/i18n/messages/es/landing.ts, frontend/src/App.tsx, frontend/src/pages/LandingPage.tsx, frontend/src/landing/, frontend/src/main.tsx, frontend/src/styles/landing.css, frontend/src/styles/tokens/landing.css, frontend/src/hooks/useTabBarShown.ts, frontend/index.html, frontend/src/i18n/siteMeta.ts, frontend/public/images/, scripts/og-image/]
---

# Objective

The owner (28 Oct), held until the Phase 2 look was live (099, 101, 103):

1. The old landing page at `#/classic` (plan 069 kept it "for a few weeks to
   compare") still shows the robot artwork. Nobody links to it; remove it.
2. The link preview (WhatsApp, Facebook, X) shows the landing hero, an AI
   picture of the table with mistakes (8 players, "TOURNAMENT POKER COACH",
   garbled text). Replace it with a picture made from the real app, in
   English and Spanish.

# Decisions

## 1. Retire /classic

- `#/classic` sends to `#/` (a `Navigate`, like `#/minimal`), so an old
  bookmark lands on the live home page.
- Delete what only the old page uses: `pages/LandingPage.tsx`, the
  `landing/` components of its sections (header, hero, how, coach, demo,
  opponents, perks, quiz and flip card, FAQ, final call, quiz data, scroll
  helper), their stylesheets (`landing.css`, `landing-sections.css`,
  `landing-hero.css`, `landing-quiz.css`, `landing-coach.css`,
  `landing-faq.css`) and their `--lp-*` tokens, and `tests/landing.test.tsx`.
- Keep what the live landing page (`MinimalLandingPage`) still imports:
  `landing/useLandingWebMcp.ts`, `landingTools.ts`,
  `registerLandingTools.ts`, `demoVideo.ts`. Check with the build and a
  search, not by name: anything still imported stays.
- Delete the pictures nothing names any more: `hero-sarah-coach.webp`,
  `hero-robot.webp`, `hero-robot-sarah.webp`, `ICMBOT_target_hero.png`.
- `/classic` leaves the tab bar's hidden list and the comments that mention
  it (`App.tsx`, `MinimalLandingPage.tsx`).
- One commit for this part: it removes a page, so it is easy to revert.

## 2. A link preview from the real app

- 1200 x 630 JPEG, one per language: `og-app-1200x630.jpg` (icmbot.one) and
  `og-app-1200x630-es.jpg` (icmbot.es). New names, so the apps that cache
  previews fetch them.
- Made by a script, not by hand, so it can be rebuilt after the next design
  change: `scripts/og-image/` drives the local app with Playwright (like
  `scripts/demo-video/`), takes the screenshots, lays them into an HTML card
  and screenshots the card.
- The card, dark theme, brand colours from `tokens.css`. WhatsApp's small
  preview shows only the centred square of the card (the middle 630 x 630,
  x from 285 to 915), so the layout has two zones:
  - inside that square, whole and readable: the ICMBOT logo on top and a
    phone frame with a real 390 x 844 screenshot of a live table on an
    upright phone: the coach strip saying RAISE or CALL (the script deals
    until the coach says one of those), all 9 seats and the action buttons.
    In the Spanish card the app is in Spanish (`?lang=es`);
  - left of the square: the headline ("Tournament poker practice with an ICM
    coach" / "Práctica de póker de torneos con un coach ICM"), at 44 px over
    several lines because the zone is 245 px wide (the earlier rule of 2
    lines at 64 px does not fit beside the square);
  - right of the square: three short lines with a gold tick: "9 players, 8
    bots", "The coach explains every decision", "Start free" (Spanish: "9
    jugadores, 8 bots", "El coach explica cada decisión", "Empieza gratis").
  The headline and the lines may be cut in the small view; the logo and the
  phone may not. The full 1200 x 630 card must still read well, at 500 px
  wide too (how big it shows in a chat). The script writes a 300 px copy of
  the centre square, which is checked by eye.
- Only what the app does today: no price, no "Pro" claims beyond "Start free".
- `index.html` and `siteMeta.ts` point to the new files; the alt text says
  what the picture shows, in both languages. The table picture from PR #106
  (`og-table-*`) is deleted once nothing names it.

## 3. The landing hero picture

The owner's answer (28 Oct): yes, replace it in this plan.

- `hero-coach-screen.webp` (the same AI picture, 8 players, garbled text)
  becomes a wider version of the card, made by the same script, with no
  headline (the page has its own): a laptop frame with a real 1280 x 800
  screenshot of the wide table (coach panel on the left, all 9 seats), and
  the phone from the preview card in front of it at the right.
- Same shape as today, 1602 x 982, so the page layout does not move; WebP,
  under 250 KB.
- One per language: `hero-app.webp` and `hero-app-es.webp` (the Spanish one
  shows the app in Spanish); `MinimalHero` picks the file by the page's
  language, as the landing already does for the demo video (plan 096).
- `landing.hero.alt` in English and Spanish describes the new picture.
- The old `hero-coach-screen.webp` is deleted once nothing names it.

# Tests

- `#/classic` lands on `#/`; no route, import or test names `LandingPage`
  any more; a test checks that every picture in `public/images/` is named
  somewhere in the code, so unused pictures cannot pile up again.
- `site_meta.test.ts`: both preview pictures exist and are 1200 x 630 JPEGs
  (the test from PR #106), and each site points to its own file.
- The landing hero uses `hero-app.webp` in English and `hero-app-es.webp`
  in Spanish, 1602 x 982, with the new alt text.
- The script runs again and gives the same layout (the cards and heroes in
  `/tmp/og/` for the owner to approve before anything is committed).

# After deploy

Facebook's Sharing Debugger, "Scrape Again", for `https://icmbot.one/` and
`https://icmbot.es/`.
