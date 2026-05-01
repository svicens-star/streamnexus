# StreamNexus Mobile/TV Installer Guide

## What is now prepared
- Capacitor configured (`capacitor.config.ts`)
- Android native project in `android/`
- iOS native project in `ios/`
- Android TV launcher category enabled in `android/app/src/main/AndroidManifest.xml`

## Android phones and Android TV (installer APK)
1. Install Android Studio + SDK + JDK 17.
2. Run:
   - `npm run mobile:android:apk`
3. APK output (debug):
   - `android/app/build/outputs/apk/debug/app-debug.apk`
4. Install on phone/TV:
   - Phone: open APK and allow unknown apps.
   - TV: use `adb install app-debug.apk` or Send Files to TV.

## iPhone / iPad
- iOS build requires macOS + Xcode.
- On Mac run:
  - `npm install`
  - `npm run mobile:build`
  - `npx cap open ios`
- Then build/archive in Xcode.

## Updating app on mobile/TV
Every code change:
1. `npm run mobile:build`
2. Rebuild APK/iOS package
3. Reinstall/update app on device
