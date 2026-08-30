---
id: 019
title: Preflop AI
phase: 2
status: complete
depends_on: [17, 18]
test_file: backend/tests/ai/test_preflop_ai.py
implementation_files: [backend/app/ai/preflop_ai.py, backend/app/ai/preflop_ranges.py]
---

# Objective

Implement position-dependent preflop AI: opening ranges by position, facing-raise responses, stack-depth adaptation, 3-bet/4-bet/jam decisions.

# Requirements

- Baseline open ranges for UTG..BB per stack depth band (from strategy baseline tables).
- Respond to raises: fold/call/3bet/jam by hand strength vs position+personality.
- Effective-stack scaling (deep vs short).
- Persona jitter via tendency params.

# Dependencies

Parts 17, 18 (+21 for reads).

# Tests

Range adherence stats, legality, stack-depth influence, position influence.

# Implementation

backend/app/ai/preflop_ai.py + preflop_ranges.py.

# Acceptance Criteria

Preflop AI tests pass.

# Notes

Range tables shared with the coach (part 27) so AI and coach agree.
