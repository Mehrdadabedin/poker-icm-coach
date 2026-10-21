---
id: 094
title: Player Portrait
phase: 7
status: complete
depends_on: []
test_file: backend/tests/test_portraits.py
implementation_files: [backend/app/services/portraits.py, backend/app/api/routes_portrait.py, backend/app/models/orm_portraits.py, frontend/src/pages/PortraitPage.tsx, frontend/src/services/portraitApi.ts, frontend/src/services/resizePortrait.ts, frontend/src/components/AdminPortraitsView.tsx, frontend/src/components/PokerSeat.tsx]
---

# Objective

The owner (21 Oct): a "Your portrait" card where players add a photo of
themselves, a card for it in the home menu, the photo on the player's seat at
the table like the bots' portraits (Emma and the others), and photo approval
in the Admin page.

# How it works

- Home menu, SETUP: "Your portrait" opens `#/portrait`: a circle with the
  photo or the first letter of the username, a pill with the state (NO PHOTO,
  WAITING FOR REVIEW, APPROVED, NOT APPROVED), Choose a photo, Remove photo.
- The browser cuts the centre square of the photo and shrinks it to 256 px
  WebP (JPEG where the browser cannot write WebP) before upload, so a phone
  photo of several MB becomes a few tens of KB.
- `PUT /api/portrait` takes JPEG, PNG or WebP up to 200 KB, and the bytes must
  start like the declared type. SVG is refused: it can carry script, and the
  photo is shown back as an image data URL.
- Every upload waits for review. Admin, Photos lists the waiting photos with
  Approve and Reject. Only an approved photo shows on the seat; uploading
  again sends the new photo back to review.
- Storage: the `user_portraits` table when AUTH_STORAGE=database (Render),
  which the backend creates itself; memory otherwise (lost on restart, like
  file-mode tables). Deleting an account deletes its photo.
- The table polls every 350 ms, so the seat reads the photo from a cache that
  lasts a minute and belongs to one sign-in.

# Checked

Backend test_portraits.py (13) and test_portraits_db.py (2, PostgreSQL);
frontend portrait.test.tsx (9). Local browser, headless Chromium, 22 Oct: the
card shows J and NO PHOTO, a 430 px JPEG becomes a 256 px WebP of about 10 KB,
WAITING FOR REVIEW, the photo in Admin, Photos, Approve, and the photo on the
hero's seat at the next table. Not checked on Render.
