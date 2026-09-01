---
id: 056
title: Live Tournament Timer (Persist Across Hands)
phase: 5
status: complete
depends_on: [46, 47]
test_file: backend/tests/tournament/test_timer.py, backend/tests/tournament/test_live_timer.py
implementation_files: [backend/app/services/game_session.py]
---

# Objective

The tournament clock must behave like a real live tournament: it represents
the current blind level's elapsed/remaining time, NOT the current hand.
Starting a new hand must not reset the timer; the blind level advances only
when the configured duration expires.

# Root Cause

GameSession._begin_hand() called self.timer.reset() on every new hand, which
zeroed accumulated time and reset level_index to 0. The timer therefore
restarted at every hand boundary.

# Fix

- _begin_hand(first=True) starts the timer on the first hand only.
- Subsequent hands call timer.resume() (the timer was paused when the previous
  hand completed), preserving accumulated elapsed time.
- Blind levels advance via timer.tick() (already called on every state view)
  using the preserved elapsed time.

# Acceptance Criteria

Timer persists across hands; no reset at hand boundaries; blind level changes
only when the level duration expires; pause/resume preserves state.
