# Mobile deployment guide

How to ship **Paycheck Planner** (Expo / React Native) to **iOS TestFlight** and
**Google Play internal testing**. Builds run on [EAS Build](https://docs.expo.dev/build/introduction/);
store uploads run through [EAS Submit](https://docs.expo.dev/submit/introduction/).

Everything in this repo is already configured for store builds. What's left is
one-time account setup that only you can do (it needs your Apple, Google, and
Expo logins). This guide walks through it.

---

## What's already configured

- **`app.json`**
  - `version` `1.0.0`, iOS `buildNumber` `1`, Android `versionCode` `1` (starting points; EAS auto-increments from here).
  - `ios.bundleIdentifier` / `android.package`: `com.paycheck.planner`.
  - `ios.icon` → `assets/images/icon-ios.png`, a full-bleed **1024×1024 opaque** icon (App Store requires this; transparent/rounded icons get rejected or look wrong).
  - `ITSAppUsesNonExemptEncryption: false` — the app only uses standard AES (exempt) encryption, so this skips the export-compliance prompt on every TestFlight upload. (If you ever add non-standard crypto, revisit this.)
  - Branded splash screen via `expo-splash-screen`.
- **`eas.json`**
  - `production` profile builds a **Release** iOS archive and an Android **app bundle (.aab)** — the formats the stores require — with `autoIncrement` so build numbers bump automatically.
  - `submit.production` targets **TestFlight** (iOS) and the **`internal`** track (Android), reading credentials from env vars / a gitignored key file (below).
- **`.github/workflows/mobile.yml`** — CI quality gate on every PR; manual **workflow_dispatch** to build (and optionally `--auto-submit`) on EAS.

---

## Prerequisites (accounts)

| Need | For |
| --- | --- |
| [Expo account](https://expo.dev/signup) (free) | Running EAS Build/Submit |
| Apple Developer Program membership ($99/yr) | TestFlight |
| Google Play Developer account ($25 one-time) | Play internal testing |

Install the CLI and log in:

```bash
npm install -g eas-cli
eas login
```

---

## One-time: link the Expo project

From `apps/mobile`:

```bash
cd apps/mobile
eas init
```

This creates the project on your Expo account and writes `expo.owner` +
`extra.eas.projectId` into `app.json`. Commit that change.

---

## iOS → TestFlight

### 1. Create the app record
In [App Store Connect](https://appstoreconnect.apple.com) → **Apps → +** create an
app with bundle ID `com.paycheck.planner`. Note its **Apple ID** number
(the `ascAppId`).

### 2. Build
```bash
cd apps/mobile
eas build --platform ios --profile production
```
Let EAS manage signing credentials when prompted (it creates the distribution
certificate and provisioning profile for you).

### 3. Submit to TestFlight
Easiest path — generate an **App Store Connect API key** ([App Store Connect →
Users and Access → Integrations → App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api))
and let EAS store it:

```bash
eas submit --platform ios --profile production --latest
```

The `submit.production.ios` profile in `eas.json` reads these env vars if you
prefer the Apple-ID method instead:

```bash
export APPLE_ID="your-apple-id@example.com"
export ASC_APP_ID="1234567890"          # the App Store Connect app's Apple ID
export APPLE_TEAM_ID="ABCDE12345"        # Membership → Team ID
```

After processing (a few minutes), the build appears under **TestFlight**. Add
internal testers (up to 100, no review needed) and they get it immediately.

---

## Android → Google Play internal testing

### 1. Create the app + first release
In the [Play Console](https://play.google.com/console) create an app with package
`com.paycheck.planner`.

> **The very first upload must be done by hand.** Google's API can't create the
> first release on a brand-new app. Build an `.aab` (step 2), then upload it once
> via **Testing → Internal testing → Create new release** in the Play Console.
> After that, `eas submit` works for every subsequent build.

### 2. Build
```bash
cd apps/mobile
eas build --platform android --profile production
```

### 3. Service account for automated submits
- Play Console → **Setup → API access** → link a Google Cloud project and create a
  **service account** with the *Release to testing tracks* permission.
- Download its JSON key to `apps/mobile/google-play-service-account.json`
  (already gitignored — **do not commit it**).

### 4. Submit
```bash
eas submit --platform android --profile production --latest
```
This uploads to the **`internal`** track as a **draft** (per `eas.json`). Open the
release in the Play Console, add internal testers, and roll it out.

> Want submits to go live without the manual draft step? Change
> `submit.production.android.releaseStatus` to `"completed"` in `eas.json`.

---

## CI builds & submits (optional)

The `Mobile` workflow can build on EAS from the Actions tab:

1. Add repo secrets: `EXPO_TOKEN` (required for any EAS build), and for
   `--auto-submit`: `APPLE_ID`, `ASC_APP_ID`, `APPLE_TEAM_ID`,
   `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (paste the full JSON).
2. **Actions → Mobile → Run workflow**: pick `platform`, set `profile` to
   `production`, and toggle `submit` to also push to the stores.

---

## Releasing a new version

1. Bump `apps/mobile/version` and `expo.version` in `app.json` (e.g. `1.0.1`).
2. `eas build --profile production` — `autoIncrement` bumps `buildNumber` /
   `versionCode` automatically.
3. `eas submit --profile production --latest`.

---

## Pre-flight checklist

- [ ] `eas init` run; `owner` + `extra.eas.projectId` committed in `app.json`.
- [ ] App records created in App Store Connect and Play Console with matching IDs.
- [ ] `pnpm --filter @paycheck-planner/mobile lint typecheck test:run` passes.
- [ ] iOS: API key (or `APPLE_*` vars) set; first `eas submit` succeeds → build in TestFlight.
- [ ] Android: first `.aab` uploaded manually; service account JSON in place; `eas submit` succeeds.
- [ ] Internal testers added on both stores.
