# Winter Smog Assistant — Expo native mobile preview (Milestone 9)

**Stack:** Expo SDK 58, React Native 0.88, React 19.3, Expo SecureStore, Expo Localization, Expo Speech.

## Run on Android or iPhone

```bash
cd apps/mobile
npm install
npx expo install --check
npx expo start
```

Install the compatible [Expo Go](https://expo.dev/go) on your Android phone or iPhone, then scan the QR code. The app fetches live environmental data through the existing Python FastAPI/Uvicorn backend at `winter-smog-fastapi.onrender.com`, and D1-backed community state through the independent `winter-smog-community.1nc24cs197.workers.dev` Worker.

## Install the standalone Android testing preview

Open the [ClearSkies Android preview APK](https://github.com/shivamani0426/virtual_prompts/releases/download/android-preview/clearskies-android-preview.apk)
from an Android phone. This is a directly downloadable APK (not a ZIP).
The release is published **only after** the app bundles its JavaScript, passes
APK-signature checks, installs in an Android 15 emulator, and launches without
a local Expo/Metro server.

Installation: allow **Install unknown apps** for the browser or Files app only
if you trust the file's publisher, open the downloaded APK, and follow Android's
confirmation prompts. For a pre-existing older debug build that reports
`App not installed` or a signature conflict, uninstall the older
**Winter Smog Assistant** first; **this erases locally stored preferences and
anonymous-device progress**. Avoid uninstalling until you can afford that loss.
Check free space and Android OS compatibility if installation still fails.

**Important:** This is a developer/test prerelease signed using the generated
Android debug/test certificate, not a production signing key. It is not a
Play Store release or a certified public health application. Please do not
treat it as production-ready or depend on it for emergency decisions.
A phone-specific test is still necessary, and older Android versions may
not be supported. The running app needs network access for live AQI, WHO/CPCB
source answers, and community features.

## City and location selection (Android preview v0.9.2)

On **Air outlook**, type any supported city or town into **Search any city or town**,
then tap **Search city** and select a returned result. This queries the existing
`/api/v1/places` geocoding endpoint rather than a fixed eight-city list. If the
geocoding provider has no result or the network is offline, the previous city
remains selected and the app displays an error rather than inventing coordinates.

**Use my location** is optional and must be tapped to request **foreground**
device location permission. No location permission is requested on startup and
no background tracking is implemented. The GPS coordinates are rounded to
**two decimal degrees** before air-quality requests (approximately kilometer
precision). Locality naming is best-effort; when reverse geocoding is unavailable
the app shows "Near my location" rather than inventing a city name. Coordinates
are not saved to SecureStore and are not sent to the community reporting service.
If location permission is denied or location services are off, ordinary city
search remains available.

**Scope note:** Community reports and advisory preferences still use the
moderated, supported city list; dynamic place search and device geolocation
are for the **air outlook** only. The displayed reading is modelled **US AQI**,
not an official CPCB measurement.

**Android phone acceptance:** In v0.9.2, check both city results and
**Use my location** on a real phone: allow approximate location, deny the
permission, disable location services, retry offline, and check the displayed
area and AQI. The emulator install-and-launch CI is not a physical GPS or
translation-verification pass.

## Included mobile flows

- Real modelled **US AQI** by city; missing readings never become made-up numbers.
- WHO/CPCB assistant answers, approved-source links, and **native text-to-speech** using `expo-speech`. Audio is spoken from the original English evidence to avoid unreviewed translation of health claims.
- Regional-language UI labels for English, Hindi, Kannada, Telugu, Tamil, Bengali, and Marathi, with an explicit language picker and English fallback.
- Pseudonymous community sessions stored with OS-secured `expo-secure-store`; reports remain pending until a human moderator approves them via GitHub Actions.
- Daily challenge joining/check-ins, replay-protected on the same date, and advisory modelled US AQI alert thresholds.
- Android/iOS keyboard dictation can be used for voice questions **only if supplied by the device keyboard**. This app does not yet have its own native speech recognition engine or background recorder.

## Important limitations, no misleading release claims

- **Not published to Google Play or Apple's App Store.** An Expo JS bundle is not an Android APK/IPA, nor a physical-device acceptance test. Store signing, permissions/privacy disclosures, screen-reader tests, device matrix and actual store review are final release requirements.
- Background remote push notifications are **not implemented**. The alerts screen checks the current modelled US AQI when opened or explicitly refreshed, and uses a foreground native dialog. No alert is guaranteed when the app is closed. Never promise timely delivery for an emergency.
- Regional language dictionaries contain interface labels and simple warnings, **not certified translations of WHO/CPCB documents**. Independent native-speaker scientific review and right script/font accessibility checks remain required before representing them as clinically reliable.
- Inference and public data require connectivity; there is no complete offline environmental cache.
- Anonymous device sessions are not linked to login accounts and cannot synchronize reports or challenge progress across devices. SecureStore does not provide account recovery.

CI: `npm run typecheck`, `npm test`, `npm run export` for Android and iOS JavaScript bundles. Physical-phone QA, package signing and store release are separate tasks.
