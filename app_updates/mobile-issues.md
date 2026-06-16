# Mobile Feature Parity & Fixes — Work Plan

Status keys:
- `[ ]` Planned
- `[-]` In Progress
- `[x]` Done

Release notes discipline:
- [ ] Add a user-facing RELEASE_NOTES.md bullet when each parent item reaches Done.
- [ ] Keep release-note wording focused on outcomes, not implementation details.

> Scope: close the remaining desktop↔mobile parity gaps and UX rough edges in
> `apps/mobile`. Items are ordered roughly by effort (quick UI fixes first, larger
> features last). Research notes under each task capture the intended approach and
> the exact files involved so the approach can be reviewed before any code changes.

> **Status (2026-06-14):** All 8 items implemented. Workspace `lint`, `typecheck`,
> and `test:run` pass (24/24 Turbo tasks); API gains a public-access test; core
> gains an account-icon-defaults test. New deps: `react-native-svg@15.12.1`,
> `@react-native-community/datetimepicker@8.4.4`, `lucide-react-native@0.577.0`
> (matches desktop's `lucide-react@0.577.0` for identical icons). **Remaining gate:**
> behavior must be verified on an on-device/simulator Expo build (the JS test suite
> is node-based and doesn't exercise native modules or navigation).

---

## 1. Move "Close Plan" from the header into Settings
Parent status: `[x] Done` (code-complete; on-device Expo verification pending)

Today every tab shows a `‹ Close` button in the top-left (`src/components/AppHeader.tsx`)
that closes the plan and returns to the welcome screen. Since users typically keep one
plan open for the year, this is unnecessary chrome.

- [ ] Remove the `‹ Close` button from `src/components/AppHeader.tsx`; rebalance the header layout (centered title, gear stays top-right).
    - `AppHeader` currently does `closePlan()` + `router.replace('/')` in `handleClose`; that logic moves to Settings.
- [ ] Add a "Close Plan" button to the **Current Plan** card in `app/settings.tsx`.
    - Use the existing `closePlan()` from `usePlan()` + `router.replace('/')`. Style as a clearly-secondary/destructive action near the bottom of the card.
    - Remove the now-stale tip text in `settings.tsx` ("Close this plan with the '‹ Close' button in the top-left…").
- [ ] Add/update tests where necessary.

Done definition:
- [ ] No back/close chevron appears on the tab headers; a "Close Plan" button in Settings closes the plan and returns to the welcome screen.

---

## 2. Put Search into the native tab bar (iOS search role)
Parent status: `[x] Done` (code-complete; on-device Expo verification pending)

Search is currently a floating FAB (`src/components/SearchFab.tsx`) rendered by
`src/components/PlanTabScreen.tsx`, hovering above the native tab bar. Apple's pattern
is a dedicated search tab. (See screenshot: `Screenshot 2026-06-13 at 5.32.44 PM.png`.)

- [ ] Add a search tab to `app/(tabs)/_layout.tsx` using the native search role.
    - The installed `expo-router/unstable-native-tabs` supports `role="search"` (confirmed in `NativeTabsTabBarItemRole`), which renders the system search tab on iOS 26's liquid-glass `UITabBar`.
- [ ] Move `app/search.tsx` into the tabs group (`app/(tabs)/search.tsx`) so the search role tab targets it.
- [ ] Remove the floating search button: delete `src/components/SearchFab.tsx` and its usage in `src/components/PlanTabScreen.tsx`.
- [ ] Verify Android behavior — confirm the search role degrades to a normal tab acceptably, or supply an Android icon fallback.
- [ ] Add/update tests where necessary.

Done definition:
- [ ] Search is a tab in the native tab bar (no floating FAB), opens the existing search screen, and behaves correctly on iOS and Android.

---

## 3. Remove redundant "Monthly Allocation" from Edit Account
Parent status: `[x] Done` (code-complete; on-device Expo verification pending)

`src/features/accounts/AccountFormSheet.tsx` has a "Monthly Allocation" field bound to
`account.allocation` (a single fixed amount). This overlaps with per-account **Custom
Allocations** (`src/features/accounts/AllocationFormSheet.tsx` → `account.allocationCategories`),
which is the richer model.

- [ ] Remove the "Monthly Allocation" `FormField` from `AccountFormSheet.tsx`.
    - Preserve any existing `account.allocation` value on save (pass it through; do **not** clear it) so desktop-authored data isn't lost.
- [ ] Confirm allocation math: verify `account.allocation` is not required by the allocation plan once custom allocations exist.
    - `account.allocation` is referenced by `packages/core/src/budgetCurrencyConversion.ts` (currency conversion preserves it) and the allocation plan; confirm dropping the mobile input doesn't strand calculations.
- [ ] Add/update tests where necessary.

Done definition:
- [ ] Edit Account no longer shows "Monthly Allocation"; custom allocations remain the sole per-account allocation UI; existing plans open without data loss or calculation changes.

---

## 4. Restore "First Paycheck Date" on Pay Settings
Parent status: `[x] Done` (code-complete; on-device Expo verification pending)

`app/pay-settings.tsx` intentionally hides `firstPaycheckDate` (comment: "unused in
desktop for now"), but it **is** used on desktop — `PayBreakdown` calls
`getPaychecksPerMonthInYear(firstPaycheckDate, …)` to get accurate weekly/bi-weekly
per-month paycheck counts. `paySettings.firstPaycheckDate` already exists in the model.

- [ ] Add a date picker dependency: `@react-native-community/datetimepicker` (Expo-supported; not currently installed). Align the version via `npx expo install`.
- [ ] Add a "First Paycheck Date" field to `app/pay-settings.tsx` (and optionally `app/new-plan.tsx`), storing an ISO date string; validate it.
    - Consider a small reusable `DateField` component since none exists in `src/components/`.
- [ ] Use `firstPaycheckDate` where desktop does — confirm the mobile summary/breakdown apply per-month paycheck counts (`getPaychecksPerMonthInYear`) for weekly/bi-weekly frequencies.
- [ ] Add/update tests where necessary.

Done definition:
- [ ] First paycheck date is editable on Pay Settings, persists to the plan, and weekly/bi-weekly per-month calculations match desktop.

---

## 5. Account icons aligned with desktop (Lucide), replacing color-only
Parent status: `[x] Done` (code-complete; on-device Expo verification pending)

Mobile only lets users pick a `color` (`AccountFormSheet.tsx` `COLOR_PALETTE`). Desktop
lets users pick a **Lucide icon** stored in `account.icon` (desktop
`src/utils/iconNameToComponent.ts` → `ACCOUNT_ICON_MAP` / `ACCOUNT_ICON_NAMES`, chosen via
`AccountIconPicker`). The shared `Account` type already has both `color` and `icon?`, and
core has semantic defaults (`ACCOUNT_TYPE_ICON_KEYS`). Goal: the icon a user picks on
either platform shows on both.

- [ ] Unify the canonical account-icon name set in `packages/core`.
    - Promote the desktop `ACCOUNT_ICON_NAMES` list into a shared core module (e.g. `accountIcons.ts`) so desktop and mobile agree on the exact set; reconcile with core's existing `ACCOUNT_TYPE_ICON_KEYS` so default icons map to real Lucide names.
    - Each platform keeps its own name→component map (desktop: `lucide-react`; mobile: `lucide-react-native`).
- [ ] Add mobile icon rendering deps: `lucide-react-native` (1:1 icon names with desktop's `lucide-react`) and its peer `react-native-svg` (neither installed). Install via `npx expo install`.
- [ ] Add an icon picker to `AccountFormSheet.tsx` (grid of the shared Lucide set) writing `account.icon`; keep `color` as the icon tint/background.
- [ ] Render account icons (not just a color dot) in `app/(tabs)/accounts.tsx` and anywhere accounts are listed, falling back to `getDefaultAccountIconKey(type)`.
- [ ] Add/update tests where necessary.

Done definition:
- [ ] Mobile shows and lets users pick the same Lucide account icons as desktop; an icon chosen on one platform renders identically on the other.

---

## 6. Encryption when creating a new plan on mobile
Parent status: `[x] Done` (code-complete; on-device Expo verification pending)

The storage layer already supports encryption end-to-end — `serializePlan` /
`writePlanFile` / `createPlanFileInLibrary` accept a key and write the shared
`paycheck-planner-encrypted-v1` envelope — but `app/new-plan.tsx` never offers it
(creates plaintext). Opening encrypted files already works (`usePlanFile`).

- [ ] Add an "Encrypt this plan" toggle + key entry (with confirmation) to `app/new-plan.tsx`.
    - Reuse the welcome screen's key-entry sheet pattern if practical; otherwise add a minimal confirmed-password field. Validate non-empty / matching.
- [ ] Wire the key through creation: `createPlanFileInLibrary(plan, key)`, `setPlan(plan, uri, { encryptionKey: key })`, and `storePlanKey(plan.id, key)`.
    - `storePlanKey` (in `src/storage/keychainAdapter.ts`) already prefers biometric-protected storage when available and falls back safely.
- [ ] Add/update tests where necessary.

Done definition:
- [ ] A new plan can be created encrypted; its file is written in the shared encrypted envelope and reopens (desktop and mobile) with the key.

---

## 7. Biometric unlock toggle in Settings (Face ID / Touch ID / fingerprint)
Parent status: `[x] Done` (code-complete; on-device Expo verification pending)

`keychainAdapter.ts` already stores keys with `requireAuthentication` when biometrics are
available and exposes `getAvailableBiometricType()`; app.json already declares
`NSFaceIDUsageDescription`, the `expo-local-authentication` plugin, and Android biometric
permissions. What's missing is a user-facing opt-in and the Apple-required permission
prompt at enable time. Depends on / pairs with item 6 (only meaningful for encrypted plans).

- [ ] Add an "Unlock with Face ID / Touch ID" toggle to `app/settings.tsx`, shown only for encrypted plans.
    - Label dynamically from `getAvailableBiometricType()` (Face ID / Touch ID / Fingerprint); hide/disable when no biometrics are enrolled.
- [ ] On enable: trigger `LocalAuthentication.authenticateAsync()` once (satisfies Apple's permission ask), then (re)store the plan key with `requireAuthentication: true`.
- [ ] On disable: re-store the key without biometric protection (or remove the stored key so it's re-prompted).
- [ ] Persist the per-plan preference (AsyncStorage) and reflect current state on load.
- [ ] Add/update tests where necessary.

Done definition:
- [ ] Users can enable/disable biometric unlock per encrypted plan; enabling prompts for permission once and subsequent opens require Face ID/Touch ID/fingerprint.

---

## 8. Glossary, App FAQs, and currency conversion via the API
Parent status: `[x] Done` (code-complete; on-device Expo verification pending)

The API already serves everything needed (`apps/api/src/routes/reference-data.ts`:
`/reference-data/{index,us-tax,glossary,app-faqs}`; `routes/currency-conversion.ts`),
behind shared-secret auth (`Authorization: Bearer` / `x-api-key`). Desktop consumes it via
`src/services/referenceDataFetcher.ts` (cached, hash-based refresh). Mobile has none, and
`pay-settings.tsx` tells users currency "can be changed on desktop".

- [ ] Make the reference-data + currency-conversion routes public, read-only (no shared secret).
    - **Decision (approved):** nothing in the API is sensitive, so these GET endpoints become publicly accessible — no secret is embedded in either app. Exempt `reference-data` and `currency-conversion` from the auth middleware in `apps/api/src/app.ts` (keep them GET-only); desktop's existing auth headers become harmless no-ops.
- [ ] Add mobile config for the API base URL via app config `extra` / `EXPO_PUBLIC_*` (read through `expo-constants`). Mobile currently has no env/config plumbing.
- [ ] Add a mobile reference-data client (`src/services/referenceDataFetcher.ts`) mirroring desktop: fetch index, compare hashes, cache payloads in AsyncStorage, expose glossary/FAQ/tax getters.
- [ ] Add an **App FAQs** screen (searchable) — mobile equivalent of desktop `AppFaqModal`; reachable from Settings/help.
- [ ] Add a **Glossary** screen (terms grouped by category) — equivalent of desktop `GlossaryModal`; reachable from Settings/help.
- [ ] Enable **currency conversion** on mobile: change plan currency using the currency-conversion endpoint + `packages/core` `budgetCurrencyConversion` to convert existing amounts; update the pay-settings copy. 
- [ ] Add/update tests where necessary.

Done definition:
- [ ] Mobile shows API-backed Glossary and App FAQs and can change a plan's currency (converting existing amounts), matching desktop behavior.

---

## Final Exit Checklist
- [x] All parent items above are implemented (on-device verification pending).
- [x] RELEASE_NOTES.md updated with completed user-facing items.
- [x] Lint, typecheck, tests pass (`pnpm check:boundaries` + `pnpm turbo run lint typecheck test:run` — 24/24).
- [x] New mobile deps aligned to SDK 54 versions (`react-native-svg`, `@react-native-community/datetimepicker`, `lucide-react-native`).
- [ ] Verified on an Expo build (device/simulator) — final gate.
