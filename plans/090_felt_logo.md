---
id: 090
title: Logo on the Table
phase: 7
status: complete
depends_on: [89]
test_file: frontend/tests/felt_logo.test.tsx
implementation_files: [frontend/src/components/PokerTable.tsx, frontend/src/styles/felt.css, frontend/public/Logo/logo-felt.png, scripts/felt_logo.py]
---

# Objective

The owner's mock-up (18 Oct): the ICMBOT logo in the centre of the table,
faint like a print on the cloth, while no cards are dealt.

# Change

- An empty board shows the logo instead of "DEALING…" in a dark box. The
  flop replaces it.
- A quarter of the table wide (the owner: "25% is good"), 90 to 280 px,
  sized from the table, not the screen. Opacity 0.3, behind the seats.
- logo.png has a near-black background, not a transparent one, so on the
  green it drew a dark box. `uv run --project backend --with pillow python
  scripts/felt_logo.py` writes logo-felt.png with the black transparent.

# Checked

Browser at 1024 (129x43 px on a 535 px table), 850x390 and 390x844. Frontend
343 passed (4 new).
