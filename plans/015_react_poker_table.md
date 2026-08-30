---
id: 015
title: React Poker Table
phase: 1
status: complete
depends_on: [37]
test_file: frontend/tests/table.test.tsx
implementation_files: [frontend/src/components/PokerTable.tsx, frontend/src/pages/TablePage.tsx]
---

# Objective

Build the React poker table: 9 seats, names, positions, stacks in chips and BB, bets, action indicators, dealer button, hero+community cards, pot, blind level, timer.

# Requirements

- Responsive layout: portrait phones, landscape, desktop.
- Hero seat highlighted; active player highlighted; dealer button shown.
- Cards rendered from rank/suit back-end format.
- Coach panel collapsible.
- Receives state from a typed GameState model.

# Dependencies

Part 037 tooling (frontend tests configured); modeled on backend state.

# Tests

Vitest + React Testing Library: renders 9 seats, renders hero cards, shows pot, dealer button placement, active-actor class.

# Implementation

frontend/src/models/game.ts, components/PokerTable.tsx, pages/TablePage.tsx, styles/poker-table.css.

# Acceptance Criteria

Frontend tests pass; tsc strict passes.

# Notes

Backend remains authoritative; frontend only renders and sends actions.
