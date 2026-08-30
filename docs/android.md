# Android Build (Capacitor)

The React app is packaged as an Android application with Capacitor.

## Requirements

- Node 22+, npm
- JDK 17+
- Android SDK (platform-tools, build-tools, platforms;android-34)
- `ANDROID_HOME` environment variable set (e.g. `~/Android/Sdk`)

## Build the APK

```bash
cd frontend
npm install
npm run cap:sync          # builds web assets + syncs into android/
cd android
./gradlew assembleRelease # -> app/build/outputs/apk/release/app-release.apk
```

For a fast debug build: `./gradlew assembleDebug`.

## Backend URL

The APK communicates with the FastAPI backend over HTTP. `capacitor.config.ts`
sets `server.url` (default `http://localhost:8000`). For a physical device,
change it to the development machine's LAN IP:

```bash
npx cap run android --mode development
```

## Honest status note

The Android *project* is fully generated and the web build must pass before
sync. Producing a signed `app-release.apk` requires the Android SDK and JDK,
which are **not installed in this development environment**. The exact
commands above produce the APK on any machine with the SDK installed; a CI
workflow (`gradle` job) can automate this.

## Notes

- Offline/local play is NOT implemented; the APK requires the backend.
- `cleartext: true` allows HTTP during development; use HTTPS in production.
