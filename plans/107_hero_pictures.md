---
id: 107
title: Two Hero Pictures in Turn
phase: 8
status: complete
depends_on: [104]
test_file: frontend/tests/hero_pictures.test.tsx
implementation_files: [frontend/src/landing-minimal/HeroPictures.tsx, frontend/src/landing-minimal/MinimalHero.tsx, frontend/src/styles/landing-minimal.css, frontend/public/images/hero-glow.webp]
---

# Objective

The owner (30 Oct): the landing page on icmbot.one and icmbot.es shows two pictures in turn, 5
seconds each: the real app on a laptop and a phone, and the app on a glowing screen.

# Decisions

- Landing page only. The app, the table and the Android app do not change.
- A soft fade (0.8 s). With reduced motion the first picture stays.
- `hero-glow.webp` is the owner's picture (884x543), with English labels on both sites. It is an
  illustration, not a screenshot like `hero-app.webp`, so `scripts/og-image` does not make it.
