---
id: 092
title: End Game and Final Standings
phase: 7
status: complete
depends_on: [91]
test_file: backend/tests/tournament/test_end_game.py
implementation_files: [backend/app/services/final_standings.py, backend/app/services/elimination.py, backend/app/api/routes_game.py, frontend/src/components/FinalStandings.tsx, frontend/src/components/ReentryModal.tsx, frontend/src/pages/endgameOverlays.tsx]
---

# Objective

The owner (19 Oct): after losing the all-in and not re-entering, offer to
watch or to end the game; END GAME places everyone 1st to 9th by chips
("Emma has 269,000 and David has 156,000"). Re-entry stays open through
level 5 (the owner's choice).

# Change

- The bust modal offers WATCH TO THE END and END GAME, plus CONTINUE
  TOURNAMENT while re-entry is open. START NEW GAME is on the standings list
  END GAME opens (the owner: one of the two, then the list).
- Every seat's place is recorded as it goes out.
- `POST /api/game/{table_id}/end`, only once the hero is out: players still
  in by chips (chips in an unfinished pot count for whoever bet them), then
  the players already out in the order they went. Status finished, the
  hero's place saved, the tournament archived.
- FINAL STANDINGS covers the table: 1st to 9th with chips, OUT for players
  already out, the hero outlined.

# Checked

Backend 4 new tests (sorting by seat fails 3; dropping the "hero is out"
rule fails 2). Frontend 350 passed (4 new). In the browser on a local
table: bust, four choices, END GAME, 1st David 2 (201,000) to 9th the
test player (0).
