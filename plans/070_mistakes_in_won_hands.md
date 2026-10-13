---
id: 070
title: Mistakes in Won Hands Are Marked, and Can Be Hidden
phase: 6
status: complete
depends_on: [62, 68]
test_file: frontend/tests/mistakes.test.tsx
implementation_files: [frontend/src/pages/MistakesPage.tsx, frontend/src/components/MistakeCard.tsx, frontend/src/styles/mistakes.css]
---

# Objective

The owner saw a hand he won listed in My Mistakes and asked whether it
should be. Decided with him: keep it (option B), because a decision is
graded on what was known when it was made, not on the cards that came, and
hiding won hands hides leaks that sometimes win (a call with 84o) and
missed value (calling the nut flush on the river where a raise wins more).
But make it clear and let him hide them.

# Changes

- A mistake in a hand the hero won (`net > 0` from `/hands`, already sent by
  the server) gets a green WON label and a gold left edge instead of red.
- The summary says how many are in won hands, e.g. "5 mistakes in 10
  decisions over 3 hands; 2 in a hand you won."
- A "Hide won hands (n)" button, shown only when there are any, removes them
  from the list and from the filter counts; it toggles back.
- When the filters hide every mistake, the page says so.
- No backend change.

# Tests

frontend/tests/mistakes.test.tsx: 3 new (WON label and hide toggle; no
button without won hands; message when everything is hidden), 1 changed
(summary text). The first new test failed before the change. Frontend 263
passed. Checked in a browser with the server's answers faked (one lost,
one won hand).
