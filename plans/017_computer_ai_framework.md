---
id: 017
title: Computer AI Framework
phase: 2
status: complete
depends_on: [14]
test_file: backend/tests/ai/test_ai_framework.py
implementation_files: [backend/app/ai/ai_framework.py]
---

# Objective

Create the computer AI decision framework: a pluggable DecisionProvider that hand engines call when a computer player must act, with strict information limits (never sees hidden cards/future cards).

# Requirements

- Interface: decide(decision_context) -> ActionRequest.
- Context exposes own cards, board, pot, bets, stacks, position, personality, action history — never other hole cards or future streets.
- Legal actions only; framework clamps to legality.
- Deterministic seed option for tests.

# Dependencies

Part 014 (hand engine).

# Tests

AI never sees hidden cards (context audit), always returns legal action, deterministic with seed.

# Implementation

backend/app/ai/ai_framework.py.

# Acceptance Criteria

Framework tests pass.

# Notes

Phase 1 default AI can be simple; personalities/strategy replace behavior in parts 18-20.
