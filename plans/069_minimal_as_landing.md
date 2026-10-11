---
id: 069
title: The Minimal Page Becomes the Landing Page
phase: 6
status: complete
depends_on: [64, 67]
test_file: frontend/tests/landing_minimal_webmcp.test.tsx
implementation_files: [frontend/src/App.tsx, frontend/src/pages/MinimalLandingPage.tsx, frontend/src/landing/landingTools.ts, frontend/src/landing/useLandingWebMcp.ts]
---

# Objective

icmbot.one opens the minimal landing page (plan 064) instead of the old
one. The owner chose the defaults:

1. The old landing page stays at `/#/classic` for a few weeks to compare,
   then is deleted.
2. Quiz, opponents and FAQ are not brought to the new page.
3. The landing WebMCP tools move to the new page.
4. Privacy and Terms pages come in a separate change.

# Changes

- `/` shows the minimal page to a visitor without a session; a signed-in
  user still gets the home menu (A16 unchanged).
- `/classic` shows the old landing page; `/minimal` redirects to `/`, so
  links shared to the comparison page keep working.
- The minimal page registers watch_demo, start_training and explain_icm.
  watch_demo opens the demo video and reports `lm-demo` (the old page keeps
  `lp-demo`); start_training goes to `/login`; explain_icm's description
  no longer refers to a quiz on the page.

# Tests

Frontend 260 passed (259 before). New: landing_minimal_webmcp.test.tsx
(tools registered on `/` and acting on this page). Changed: the entry test
and the two routing tests in landing_minimal.test.tsx now expect the
minimal page at `/`, the old page at `/classic`, and `/minimal` to land on
`/`. Before the routing change those 4 tests failed. Checked in a browser
at 1280px and 375px.

# Later

- Delete the old landing page and its CSS (about 15 files) once the owner
  no longer needs `/classic`.
- Real Privacy and Terms pages.
