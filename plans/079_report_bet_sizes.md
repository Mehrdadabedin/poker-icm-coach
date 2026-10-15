---
id: 079
title: Report Bet Sizes
phase: 6
status: complete
depends_on: [78]
test_file: backend/tests/test_report_sizing.py
implementation_files: [backend/app/services/report_sizing.py, backend/app/services/report.py, frontend/src/components/ReportBetSizes.tsx, frontend/src/models/report.ts, frontend/src/pages/ReportPage.tsx, frontend/src/styles/report.css]
---

# Objective

The owner asked for a bet-size chart on the Report, after a DriveHUD example
("river bet frequency by bet size"), if it makes sense for ICMBOT. It does:
the table offers MIN, POT and ALL-IN buttons plus a free amount, so the chart
shows whether a player mostly makes tiny min-bets, a common leak.

# Change

- `betSizes` in `GET /api/history/report`: for flop, turn and river, the
  hero's first bets (a bet into an unbet street; raises are left out) by size
  as a share of the pot before the bet: under 25%, about 1/3, about 1/2, 2/3
  to 3/4, pot, over pot.
- The saved hand has no pot per action and the preflop log misses blinds
  that were folded or checked, so the pot is rebuilt from the end: the final
  pot (every chip put in, an uncalled bet included) minus everything put in
  after the flop is the pot at the flop.
- Report card "Bet sizes": street tabs with the number of bets, one bar per
  size with its share, and one line about the pattern (fewer than 10 bets
  says so instead).
- Fix, own commit: a leak listed the same example hand twice when the hero
  repeated the mistake in one hand ("Table C #24" twice). The count still
  counts every decision.

# Tests

- backend/tests/test_report_sizing.py (3): the rebuilt pot equals the live
  table's pot for every hero bet over 40 seeded hands (51 bets); shares and
  buckets; raises not counted; the report carries `betSizes`. Checked by hand
  on 5 more seeds: 279 bets, 0 mismatches. A first version that added back
  the uncalled bet failed this test (the final pot already counts it).
- backend/tests/test_report.py (+1): each leak example hand once (failed
  before the fix).
- frontend/tests/report_bet_sizes.test.tsx (3), report_page.test.tsx (+1).
- Checked with real servers and PostgreSQL: 5 seeded tournaments, 304 hands;
  flop 40, turn 37, river 17 bets in 30 days; tabs switch; 375px wide on a
  phone.
