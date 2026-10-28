---
id: 099
title: Phone Tab Bar
phase: 8
status: complete
depends_on: [066, 083, 095]
test_file: frontend/tests/tab_bar.test.tsx
implementation_files: [frontend/src/components/TabBar.tsx, frontend/src/components/TabBarHost.tsx, frontend/src/components/ProfileTabIcon.tsx, frontend/src/components/tabBarIcons.tsx, frontend/src/components/TabPage.tsx, frontend/src/components/MenuCard.tsx, frontend/src/components/menuEntries.ts, frontend/src/components/HomeBand.tsx, frontend/src/hooks/useIsPhone.ts, frontend/src/hooks/useIsAdmin.ts, frontend/src/services/authEvents.ts, frontend/src/styles/tab-bar.css, frontend/src/pages/LearnPage.tsx, frontend/src/pages/ReviewPage.tsx, frontend/src/pages/SetupPage.tsx, frontend/src/App.tsx, frontend/src/i18n/messages/en/tabs.ts, frontend/src/i18n/messages/es/tabs.ts]
---

# Objective

The owner (28 Oct), the first step of Phase 2: the Android app gets a bottom
menu with icons, like the poker training apps players already use. Today the
home page is one long list of cards (STUDY, REVIEW, SETUP), so a player has
to go back to the top to reach anything.

Design: Phase 2 canvas, https://claude.ai/artifact/3kjEBZMVYhwtXRQ8NbX9ic, screens 1 to 3 (approve before building).

# Decisions

- Five tabs, left to right: Home, Learn, Review, Setup, Profile. Each has an
  icon and a short label underneath. The current tab is gold, the others grey.
  - Home: Continue table, Start practice and the Leaderboard card (plan 102).
  - Learn: today's STUDY group (ICM coach, Ranges, ICM calculator, Glossary).
    "Learn" because players know the word from other apps; the cards are the
    same.
  - Review: My mistakes, Hand history, Report.
  - Setup: Tournament settings and bot lineup; Admin for admins.
  - Profile: photo, display name, plan (Free or Pro), Upgrade, account.
- The bar shows on phones only: the Android app (user agent `ICMBOTApp`,
  plan 085) and browsers narrower than 768 px. Wide screens keep the card
  menu as it is.
- The bar shows on every signed-in page except the table. The table needs
  the whole screen (plan 101) and keeps its own Home button.
- Each tab is a real route: `#/`, `#/learn`, `#/review`, `#/setup`,
  `#/profile`, so the Android back button and links keep working.
- Before a player has a profile (plan 095), the Profile tab shows a dot and
  opens the profile form. After the profile is saved it shows the photo.
- Locked items (plan 100) stay in the lists with a lock icon. Tapping one
  opens the Upgrade sheet; it never hides what Pro gives.
- The bar sits above Android's own navigation buttons and respects the safe
  area (`env(safe-area-inset-bottom)`), 64 px high, tap targets at least
  48 px.
- English and Spanish labels (Inicio, Aprender, Revisar, Ajustes, Perfil).

# Tests

- The bar renders five tabs with the right routes and labels, in each
  language; the current route's tab is `aria-current="page"`.
- It is hidden at the table and on wide screens, shown in the app and on a
  360 px screen.
- Each tab page lists the same cards the home menu lists today (no card
  lost), with Admin only for admins.
- Profile tab: dot and profile form without a profile, photo after.

# Not in this plan

The free plan's locks (100), the table (101), the leaderboard (102).

# Built (28 Oct)

- Bar: 72 px plus the safe area, `#07080a`, five tabs; the current tab is gold, also inside its
  pages (Glossary under Learn, Report under Review, Settings under Setup).
- Shown when `inAndroidApp()` or the window is under 768 px, the user is signed in, and the route
  is not `/table/*`, `/auth/callback`, `/change-password` or `/classic`. The sign-in screen has no
  session, so it shows none. `body.has-tab-bar` adds the bottom padding.
- The sign-in screen changes the session without a route change, so `HomePage` announces it
  (`services/authEvents.ts`) and the bar listens.
- On a phone Home keeps only Continue table and Start practice; wide screens are unchanged.
- The card lists moved to `menuEntries.ts` (one source for Home and the tab pages); the Admin
  check moved to `useIsAdmin`.
- The Profile tab shows the approved photo, else the display name's initial, and a gold dot until
  a profile is saved. It refetches when the player leaves `#/profile`.
- The Profile page header drops HOME while the bar shows (`PageHeader hideHome`, `useTabBarShown`); the
  other pages keep their HOME button.
- Not built: locks (plan 100), the Leaderboard card (plan 102).
