---
id: 083
title: Android App
phase: 7
status: complete
depends_on: [42]
test_file: docs/android.md
implementation_files: [frontend/capacitor.config.ts, frontend/android/app/src/main/res/values/strings.xml, frontend/android/app/src/main/res/values/ic_launcher_background.xml, scripts/android_icons.py, docs/android.md]
---

# Objective

Install ICMBOT on an Android phone. The Capacitor project existed but its
app showed the bundled site, whose API calls the live backend refuses (its
CORS list does not include the app's https://localhost origin), and its icon
was the wide logo squeezed into a square.

# Change

- The app opens https://icmbot.one (Capacitor `server.url`): always the
  latest site, no backend change. Google sign-in does not work in an app
  web view; username and password do.
- Name "ICMBOT" (was "ICM BOT").
- Launcher icons from the favicon chip, filling the icon on a dark
  background, every density and the adaptive icon (owner's request).
  scripts/android_icons.py makes them.
- docs/android.md: build and install steps (USB or copying the APK).

# Checked

`./gradlew assembleDebug` builds a 23.5 MB debug APK; aapt2 shows package
com.pokericmcoach.app, label ICMBOT, minimum Android 7, and the embedded
config points at https://icmbot.one. Icons previewed in circle, squircle and
square masks. Not checked: running it on a phone (none connected).
