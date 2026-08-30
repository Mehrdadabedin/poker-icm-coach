---
id: 036
title: GitHub Repository Preparation
phase: 4
status: planned
depends_on: [1]
test_file: scripts/check_github.py
implementation_files: [README.md]
---

# Objective

Finalize GitHub repository preparation: professional README, LICENSE, CI workflow, git history, and instructions to push (gh CLI not installed locally).

# Requirements

- README complete per spec section 87.
- .github/workflows/ci.yml runs backend tests, frontend tests, build.
- Clean meaningful commit history.
- Provide exact command for user to create remote and push.

# Dependencies

Part 001 (+01-35 artifacts).

# Tests

check_github.py audits README sections, .gitignore rules, CI file existence.

# Implementation

README.md, .github/workflows/ci.yml, scripts/check_github.py.

# Acceptance Criteria

Audit script passes; repo ready to push.

# Notes

No gh CLI on this machine: user runs gh auth login + provided push commands.
