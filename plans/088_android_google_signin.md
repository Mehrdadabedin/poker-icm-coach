---
id: 088
title: Google Sign-in in the Android App
phase: 7
status: complete
depends_on: [83, 85]
test_file: frontend/tests/android_google.test.tsx
implementation_files: [backend/app/services/google_app_auth.py, backend/app/api/routes_oauth.py, frontend/src/services/appGoogle.ts, frontend/src/components/AppLinkListener.tsx, frontend/src/components/ProviderButtons.tsx, frontend/src/components/LoginForm.tsx, frontend/android/app/src/main/AndroidManifest.xml]
---

# Objective

The owner wants Google sign-in in the Android app. Plan 085 hid the button
there because Google blocks its sign-in page in app web views.

# Change

1. In the app, Continue with Google opens Google in a Chrome tab
   (`@capacitor/browser`). The web view keeps a random verifier and sends
   its SHA-256 as `app_challenge` (PKCE, RFC 7636).
2. The backend callback for such a start sends the tab to
   `com.pokericmcoach.app://auth?code=...` (or `?error=...`), not to the
   website with the token. The code lives two minutes and works once.
3. Android opens the app for that link (intent filter in
   `AndroidManifest.xml`); `@capacitor/app` hands it to the web view, which
   posts code and verifier to `/api/auth/google/app-exchange` and gets the
   session.

Any app can claim a link scheme, so the code is treated as public. Without
the verifier it is worth nothing, and a wrong verifier burns it.

The website flow is unchanged. Its pages load no Capacitor code (the plugins
are imported only on use, in the app).

# Checked

Backend 7 new tests, frontend 5 new. Removing each safeguard fails its test:
verifier check, single try, code instead of token, the app click, the
"did this web view start it" check. The APK builds (26.8 MB) and its merged
manifest has the link and the Custom Tabs query.

Not checked: the full flow on a phone. It needs the backend and site
deployed and the new APK installed.
