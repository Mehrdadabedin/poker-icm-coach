---
id: 097
title: Poker Glossary
phase: 7
status: in-progress
depends_on: [093]
test_file: frontend/tests/glossary.test.tsx
implementation_files: [frontend/src/glossary/terms.ts, frontend/src/components/GlossaryTerm.tsx, frontend/src/pages/GlossaryPage.tsx, frontend/src/styles/glossary.css, frontend/src/i18n/messages/en/glossary.ts, frontend/src/i18n/messages/en/glossaryTerms.ts, frontend/src/i18n/messages/es/glossary.ts, frontend/src/i18n/messages/es/glossaryTerms.ts, frontend/src/components/CoachReason.tsx, frontend/src/components/CoachPanelView.tsx, frontend/src/components/MobileCoachCard.tsx, frontend/src/components/CoachAdvicePanel.tsx, frontend/src/components/MistakeCard.tsx, frontend/src/components/ReportSections.tsx, frontend/src/pages/StatisticsPage.tsx, frontend/src/components/HomeMenu.tsx]
---

# Objective

The owner (27 Oct), from a phone screenshot of "8♥ Q♠ is not in the CO open
range": players do not know what CO, SPR, VPIP or PFR mean. A glossary
explains every term the app shows, it sits where players study, and the
coach's labels open it.

# Decisions

- Place: a fourth card, Glossary, in the home menu's STUDY group (with ICM
  coach, Ranges and ICM calculator), page `#/glossary`. `#/glossary?term=CO`
  opens on one entry and marks it.
- Terms come from what the app prints, not a general poker list: the seat
  labels (`POSITIONS_9MAX`), the coach's action words, reasons and factor rows
  (`messages/en/coach.ts`), the table header, the Report's stats and KPIs and
  the session statistics. 72 entries in 5 groups.
- Words live in `messages/<lang>/glossary.ts` and `glossaryTerms.ts` as
  `gl.<id>.name`, `gl.<id>.def` and an optional `gl.<id>.ex`, so TypeScript
  holds Spanish to the same keys. The Spanish uses the app's own words
  (no ir, igualar, bote, ciega grande); a native speaker checks it with plan 093
  step 6.
- A tap, not a hover: a term is a button that opens a short definition next to
  it, with "Open in glossary". At the table the hand stays on screen; the link
  leaves the table, and BACK TO TABLE brings the player back.
- Linked: positions, BB, SB, ICM, SPR, EV and Nash wherever the coach's reason
  says them (table panel, phone card, ICM coach tool, My Mistakes); the
  factor-row labels that have an entry; the Report's player stats, KPIs,
  heatmap positions and leaks; the session statistics cards. Hands such as
  K8o and numbers are never linked.

# Steps

1. Glossary page, terms, English and Spanish, coach and report links, tests (done).
2. PR after the owner's go.
