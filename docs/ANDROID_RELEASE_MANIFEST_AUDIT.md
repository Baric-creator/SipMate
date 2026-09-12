# SipMate — Android release manifest audit

Reviewed: 12 September 2026

This audit was generated from the merged **release** Android manifest after running Expo prebuild and Gradle `:app:processReleaseMainManifest`.

## Result

**PASS — release manifest is suitable for Google Play internal testing.**

### Confirmed app identity
- Package/application ID: `com.bariccreator.sipmate`
- Version name: `1.0.0`
- Minimum Android SDK: 24
- Target Android SDK: 36

### Permissions intentionally present
- `ACCESS_COARSE_LOCATION` — Nearby discovery
- `ACCESS_FINE_LOCATION` — Nearby distance/discovery
- `INTERNET` / `ACCESS_NETWORK_STATE` — network access
- `POST_NOTIFICATIONS`, `VIBRATE`, `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`, FCM receive permissions — push notifications
- `USE_BIOMETRIC` / `USE_FINGERPRINT` — transitive SecureStore capability
- launcher badge permissions — transitive notification badge support

### Explicitly removed from the final merged release manifest
- `CAMERA`
- `RECORD_AUDIO`
- `READ_MEDIA_IMAGES`
- `READ_MEDIA_VIDEO`
- `READ_EXTERNAL_STORAGE`
- `WRITE_EXTERNAL_STORAGE`
- `SYSTEM_ALERT_WINDOW`

These removals are important because SipMate currently needs only the system photo picker and foreground location; it does not need camera capture, microphone access, broad media-library access, legacy storage permissions or draw-over-other-apps capability.

### Component exposure review
- Main activity is exported as required for launcher/deep links.
- Image picker crop activities are not exported.
- File providers are not exported.
- Firebase/Expo messaging services are not exported.
- Browser proxy activity is not exported.
- Location task service is not exported.

### Notes
- The manifest includes `LocationTaskService` with foreground service type `location`, provided by Expo Location, but no background location permission is declared. SipMate should continue using location only while the app is in use unless a future feature deliberately changes this.
- Notification/launcher badge permissions originate from notification dependencies and are expected.
- The generated release bundle completed Metro bundling and Gradle manifest processing successfully.
- Remaining npm audit findings are moderate transitive dependency advisories; the previously identified high-severity advisory was fixed without forcing breaking Expo changes.

## Release gate

Before production rollout, repeat this audit against the exact final AAB candidate if native dependencies or Expo SDK/plugins change. For the current dependency/configuration set, the Android permission surface is approved for internal testing.
