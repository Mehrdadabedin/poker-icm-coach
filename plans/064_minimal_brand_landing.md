---
id: 064
title: Minimalist Brand Landing Page at /minimal
phase: 6
status: complete
depends_on: [62, 63]
test_file: frontend/tests/landing_minimal.test.tsx
implementation_files: [frontend/src/pages/MinimalLandingPage.tsx, frontend/src/landing-minimal/MinimalHeader.tsx, frontend/src/landing-minimal/MinimalHero.tsx, frontend/src/landing-minimal/MinimalProductShot.tsx, frontend/src/landing-minimal/MinimalProof.tsx, frontend/src/landing-minimal/MinimalFeatures.tsx, frontend/src/landing-minimal/MinimalDemo.tsx, frontend/src/landing-minimal/MinimalClosing.tsx, frontend/src/landing-minimal/MinimalFooter.tsx, frontend/src/styles/landing-minimal.css, frontend/src/styles/landing-minimal-proof.css, frontend/src/styles/landing-minimal-shot.css]
---

# Objective

A clean, simple, focused brand landing page to compare with the current one
before choosing. It lives at `/#/minimal`; the current landing page keeps
serving `/` unchanged.

# Design

One message, one action, one picture. Top bar (logo, Log in, Start free);
hero with "Master tournament decisions.", one sentence, one gold button,
a quiet "Watch the demo" link and the practice-only note; the hero picture;
one real My Mistakes card as product proof; three features; a closing line
with the same button; a footer with Cookie settings. Dark background, one
gold accent, no boxes except the proof card.

# How it was built

The Sonnet agent built the first version (header, hero, features, demo,
footer) in an isolated worktree; it was reviewed and extended with the
proof card, the closing call to action, the note under the hero and the
Cookie settings link.

# Out of scope until the page replaces `/`

- The current landing page's WebMCP tools (watch_demo, start_training,
  explain_icm) are not registered here.
- The current landing page's Privacy and Terms links point to `#privacy`
  and `#terms`, which do not exist; this page shows no dead links.
- Quiz, opponents and FAQ are not on this page.

# Results

- Frontend 252 passed (243 on main, plus 9 for this page).
- Page height: 2298px on desktop (current: 5161), 1705px on a phone
  (current: 7325). Checked at 1280px and 375px.

# Revision: light "study software" look

The first version kept the dark, gold, robot look of the current page and
read as the same page. Revised to a light page that presents ICMBOT as
study software rather than a poker room:

- Warm off-white background, near-black text, gold only on the main
  button, a deeper amber (#8a5a00) for the accent word and icons.
- Hero picture: a fresh screenshot of the real table with the ICM coach
  panel (RAISE, "K8s is in the CO open range") in a plain browser frame,
  instead of the robot artwork. 75 KB, 1680x805.
- Wordmark: the poker-chip mark and "ICMBOT" set in type, because the logo
  file is white lettering on black.
- The mistake card turned white with a red edge.

Results: frontend 252 passed; page height 2187px desktop, 1688px phone.
On phones the product screenshot is a picture rather than readable text;
a phone-specific crop of the coach panel is a possible follow-up.

# Revision: coach-screen picture and the logo

- Hero picture: "Neon AI Poker Coach Interface" (a robot hand presenting the
  ICMBOT table with the ICM coach panel), as hero-coach-hand.webp, 1536x1024,
  159 KB. It replaces the browser-framed screenshot, whose component, CSS and
  image were removed.
- Logo: logo.png converted for light backgrounds as Logo/logo-on-light.png
  (black background removed, white lettering turned near-black, gold and the
  robot chip kept as drawn), 406x96 for a sharp 48px header (30px on phones).
- Footer: Cookie settings removed from the footer, because the shared consent
  banner already shows its own Cookie settings button on every page.
