---
id: 046
title: Tournament Blind Structure (21 Levels + Breaks)
phase: 5
status: complete
depends_on: [12, 13]
test_file: backend/tests/tournament/test_tournament.py, backend/tests/tournament/test_timer.py
implementation_files: [backend/app/tournament/blind_structure.py, backend/app/tournament/tournament_timer.py, backend/app/services/game_state_view.py]
---

# Objective

Replace the default blind structure with the exact 21-level schedule:
levels 1-5 no ante, break 1 (5 min), levels 6-11 with BB ante, break 2
(15 min), levels 12-17 with BB ante, break 3 (15 min), levels 18-21 with
BB ante. Every level lasts 20 minutes. Blinds must progress automatically
via the existing timer; fast mode must keep working.

# Structure

L1 100/100, L2 100/200, L3 100/300, L4 200/400, L5 200/500,
Break 1 (5m), L6 300/600+600, L7 400/800+800, L8 500/1000+1000,
L9 600/1200+1200, L10 800/1600+1600, L11 1000/2000+2000,
Break 2 (15m), L12 1500/3000+3000, L13 2000/4000+4000,
L14 3000/6000+6000, L15 4000/8000+8000, L16 5000/10000+10000,
L17 6000/12000+12000, Break 3 (15m), L18 8000/16000+16000,
L19 10000/20000+20000, L20 15000/30000+30000, L21 20000/40000+40000.

# Implementation

- BlindLevel gains break_after (seconds); default_structure builds the exact
  schedule; ante_mode "bba" already returns level.big.
- TournamentTimer tracks level vs break phases; tick() advances through
  breaks; reset() clears break state.
- game_state_view exposes inBreak so the UI can show BREAK.

# Acceptance Criteria

Timer advances L1->L2 after 20 min (fast mode scales); breaks count down;
existing timer tests updated and passing.
