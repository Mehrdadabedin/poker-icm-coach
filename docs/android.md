# Android app (Capacitor)

The Android app opens the live site, https://icmbot.one, inside an app
window (`server.url` in `frontend/capacitor.config.ts`). It always shows the
latest version, so a site update needs no new app, and it needs no backend
change: the API already allows icmbot.one.

Limits:

- It needs an internet connection, like the site.
- A change to the app itself (plugins, `AndroidManifest.xml`) needs a new
  APK; a change to the site does not.

Google sign-in (plan 088): Google blocks its sign-in page in app web views,
so the app opens it in a Chrome tab (`@capacitor/browser`). When it ends,
the backend sends `com.pokericmcoach.app://auth?code=...` (registered in
`AndroidManifest.xml`), Android brings the app back, and the app trades the
one-time code plus a verifier it kept for a session (`@capacitor/app` hears
the link). The code alone is useless, so another app that catches the link
cannot sign in. APKs built before plan 088 hide the Google button.

## Requirements

- Node 22+, npm
- JDK 17+ (21 works)
- Android SDK with platform 36 and build-tools 35; `ANDROID_HOME` set
  (e.g. `~/Android/Sdk`)

## Build the APK

```bash
cd frontend && npm run cap:sync
```

```bash
cd frontend/android && ./gradlew assembleDebug
```

The APK is `frontend/android/app/build/outputs/apk/debug/app-debug.apk`
(about 24 MB). A debug APK installs on any phone; a Play Store release
needs a signing key (`./gradlew assembleRelease` with a keystore).

## Release to Google Play

Google Play takes a signed app bundle (AAB) and refuses a `versionCode` it
has seen before.

1. Raise `versionCode` (by 1) and `versionName` in
   `frontend/android/app/build.gradle`.
2. Build: `cd frontend && npm run cap:sync`, then
   `cd android && ./gradlew bundleRelease` with the upload keystore. The
   bundle is `frontend/android/app/build/outputs/bundle/release/app-release.aab`.
3. In Play Console, create a release (internal testing first), upload the
   AAB, and roll it out.

Taking a portrait photo (plan 094) needs version 1.1 (code 2) or later: it
lists the camera app under `<queries>` in `AndroidManifest.xml`. Without that
entry, Android 11+ hides the camera app and "Take a photo" opens the gallery.
The app asks for no CAMERA permission, because the camera app takes the photo.

## Install on a phone

Either:

1. **USB:** on the phone, turn on Developer options (tap Build number seven
   times in Settings, About phone), then USB debugging, connect the cable,
   accept the prompt on the phone, and run:

   ```bash
   adb install -r frontend/android/app/build/outputs/apk/debug/app-debug.apk
   ```

2. **Copy the file:** send the APK to the phone (cable, Google Drive, or a
   message to yourself), open it, and allow "Install unknown apps" for the
   app you opened it with when Android asks.

## Icons

`scripts/android_icons.py` makes every launcher icon size from the site's
favicon chip (`frontend/public/icon-192.png`) on a dark background:

```bash
uv run --project backend --with pillow python scripts/android_icons.py
```
