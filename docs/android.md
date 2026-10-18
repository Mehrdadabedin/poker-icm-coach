# Android app (Capacitor)

The Android app opens the live site, https://icmbot.one, inside an app
window (`server.url` in `frontend/capacitor.config.ts`). It always shows the
latest version, so a site update needs no new app, and it needs no backend
change: the API already allows icmbot.one.

Limits:

- Google sign-in does not work inside the app: Google blocks sign-in in app
  web views. Username and password work.
- It needs an internet connection, like the site.
- For the Play Store, a Trusted Web Activity (the site in Chrome, where
  Google sign-in works) is the usual way to ship a website as an app.

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
