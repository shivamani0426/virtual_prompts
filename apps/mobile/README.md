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

## Download Android test APK (developer preview)

The web dashboard's header includes a compact **Android test APK** link. It opens the
[Android debug preview workflow](https://github.com/shivamani0426/virtual_prompts/actions/workflows/android-debug-preview.yml).
Choose the latest successful run, open its **Artifacts** section and download
`winter-smog-android-debug-preview` (GitHub may require sign-in).
Extract `app-debug.apk` from the ZIP before installing on a test device.
Artifacts expire after 14 days; the workflow page is a stable entry point.

**Important:** This APK is a debug/development preview and may require a local Expo
Metro server. It is **not** a one-tap public standalone release or a Play Store build.
Do not advertise it as production-ready. A standalone signed release APK requires
persistent, securely stored Android signing credentials, a release build, and
physical device acceptance before exposing a public direct-download button.

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
