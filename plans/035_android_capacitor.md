---
id: 035
title: Android (Capacitor)
phase: 4
status: planned
depends_on: [15]
test_file: frontend/tests/capacitor.test.ts
implementation_files: [frontend/capacitor.config.ts, frontend/package.json]
---

# Objective

Package the React app as an Android application with Capacitor: web build, capacitor config, android platform, build instructions; produce app-release.apk when SDK available.

# Requirements

- capacitor.config.ts with appId poker.icm.coach.
- npm scripts: build, cap:sync, cap:android.
- APK communicates with backend via configurable API base URL.
- Document that offline mode requires a local server on device; not claimed unless implemented.

# Dependencies

Part 15.

# Tests

Config validity, web build succeeds, capacitor project syncs (Android SDK required for APK).

# Implementation

frontend/capacitor.config.ts, frontend/package.json scripts, docs/android.md.

# Acceptance Criteria

Web build passes; APK build attempted and status reported honestly.

# Notes

No Java/Android SDK in this environment: sync + docs provided, APK build command documented for CI.
