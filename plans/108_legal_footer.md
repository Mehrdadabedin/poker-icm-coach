---
id: 108
title: Terms, Privacy and the Copyright Line
phase: 8
status: complete
depends_on: [104]
test_file: frontend/tests/legal_pages.test.tsx
implementation_files: [frontend/src/pages/LegalPage.tsx, frontend/src/legal/operator.ts, frontend/src/landing-minimal/MinimalFooter.tsx, frontend/src/components/AuthFooter.tsx, frontend/src/i18n/messages/en/legal.ts, frontend/src/i18n/messages/es/legal.ts, frontend/src/i18n/messages/en/landing.ts, frontend/src/i18n/messages/es/landing.ts]
---

# Objective

The owner (31 Oct): the landing footer links to Terms and Conditions and a Privacy Policy, says
"All rights reserved", and no page credits a person: the copyright line on every page reads
"© 2026 ICMBOT. All rights reserved."

# Decisions

- `/terms` and `/privacy` open without an account, on the landing page's look and footer.
- The text comes from what the app really stores and does (profile, photo, hands, Google sign-in,
  Google Analytics by consent, Render, data export and account deletion). The owner gave the
  details in `frontend/src/legal/operator.ts`: ICMBOT, info@icmbot.one (Spanish: info@icmbot.es),
  Spain. It has not had a lawyer's review.
- The sign-in panel links both pages, in a new tab so a half-filled form stays. It shows when
  signing in too, because Continue with Google creates the account from there.
- The old GitHub Pages site (`website/`) keeps the owner's name, by the owner's choice.
