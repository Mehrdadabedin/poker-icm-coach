---
id: 096
title: Spanish Demo Video
phase: 7
status: in-progress
depends_on: [093]
test_file: frontend/tests/demo_video.test.tsx
implementation_files: [scripts/demo-video/demo_scenes.es.json, scripts/demo-video/record_demo.mjs, frontend/src/landing/demoVideo.ts, frontend/src/landing/LandingDemo.tsx, frontend/src/landing-minimal/MinimalDemo.tsx]
---

# Objective

The owner (27 Oct): the landing demo video in Spanish for icmbot.es and
?lang=es, recorded from the Spanish app with a Spanish voice. English visitors
keep ICMBOT_promo.mp4. (Asked as plan 094; 094 is the player portrait, so this is 096.)

# Decisions

- `demo_scenes.es.json`: same scenes and marks, Spanish lines (draft, to be
  checked by a native speaker). Screen names match the UI.
- `record_demo.mjs`: `LANG_PARAM=es` adds `?lang=es` to the first load. The
  coach panel shows Spanish action words, so the recorder compares against a
  small Spanish word table. English runs are unchanged.
- The poster tagline was English (PRACTICE IMPROVE WIN): `ICMBOT_video_poster.es.png`.
- `demoVideo()` picks the `.es` files by domain only: icmbot.es and www.icmbot.es. Page language and ?lang do not matter (owner, 27 Oct). On localhost, `?demoVideo=es` shows it for testing.

# Steps

1. Scenes, recorder, poster, landing switch, tests (done).
2. Voice samples in ~/Downloads/ICMBOT_voice_samples/es/ (done, owner picks).
3. Voice: jessica (owner's pick, 27 Oct). Narrated, `ICMBOT_promo.es.mp4` built (56.7 s, 7.4 MB, -16.4 LUFS) (done). PR after the owner's go.
