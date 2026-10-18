---
id: 085
title: Android App Opens on Sign-in
phase: 7
status: complete
depends_on: [83]
test_file: frontend/tests/android_app.test.tsx
implementation_files: [frontend/src/services/platform.ts, frontend/src/App.tsx, frontend/src/components/LoginForm.tsx, frontend/capacitor.config.ts]
---

# Objective

The owner tried the app on a phone: it should open on sign-in, not the
landing page, and the Google button should go until Google sign-in works in
the app.

# Change

- The app adds "ICMBOTApp" to its user agent (Capacitor appendUserAgent);
  `inAndroidApp()` also accepts the Capacitor bridge, so an app installed
  before this build is recognised too.
- In the app, / shows sign-in (or the menu when signed in) instead of the
  landing page.
- In the app, the sign-in screen has no Google button: Google blocks its
  sign-in inside app web views. The website keeps both.

# Google sign-in in the app later

Two ways: open Google's sign-in in Chrome (a Custom Tab) and return to the
app through a deep link with the session; or the native Google sign-in on
Android, sending its ID token to a new backend endpoint that checks it.

# Tests

frontend/tests/android_app.test.tsx (3): the app is recognised by its user
agent or the bridge; in the app / opens on sign-in without the landing page
or the Google button (failed without the change); the website keeps both.
capacitor.test.ts checks the user agent marker. Debug APK rebuilt with it.
Not checked on a phone.
