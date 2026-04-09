# Paycheck Planner

Paycheck Planner is a local-first desktop app for paycheck-based financial planning. It helps you model gross-to-net pay, allocate money across accounts, track recurring bills, and save yearly plans as `.budget` files (optionally encrypted).

Built with Electron, React, TypeScript, and Vite.

## Table of Contents

- [Current Functionality](#current-functionality)
- [Prerequisites](#prerequisites)
- [Development](#development)
- [Build & Package](#build--package)
- [CI/CD Workflows](#cicd-workflows)
- [Storage & Security](#storage--security)
- [Architecture (Current)](#architecture-current)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Keeping This README Updated](#keeping-this-readme-updated)
- [Related Docs](#related-docs)
- [License](#license)

## Current Functionality

- **Welcome flow**: Create a new year plan, open existing plan, open recent plans, or load a demo plan.
- **Setup wizard**: Guided onboarding for currency, encryption choice, pay details (salary/hourly), pay frequency (weekly/bi-weekly/semi-monthly/monthly), tax assumptions, and initial accounts.
- **Paycheck planning dashboard**:
  - Key metrics (income, deductions, bills, remaining)
  - Gross-to-net pay breakdown with per-paycheck, monthly, and yearly views
  - Bills manager with flexible frequency options (weekly through annually)
  - Benefits manager (health insurance, FSA/HSA, life, disability, commuter)
  - Retirement manager (401k/403b/457, IRA, employee/employer contributions)
  - Loans manager (student, car, personal, mortgage)
  - Tax breakdown (federal, state, FICA, Medicare, additional withholding)
  - Accounts manager (checking, savings, investments, etc.)
  - **Customizable tabs**: Show/hide tabs, reorder non-pinned tabs, with pinned tabs (Key Metrics, Pay Breakdown) always visible
- **Year-based workflows**: Duplicate a plan into a new year, keeping structure while resetting balances.
- **Security options**: Per-plan encryption can be enabled/disabled; encryption keys are stored via `electron.safeStorage` (OS-level protection, no Keychain password prompts). On Macs with Touch ID enrolled, opening an encrypted plan requires biometric authentication once per session.
- **Export functionality**: Generate PDF reports with optional password protection and granular section selection.
- **Desktop UX**: 
  - Native menu integration (File, Edit, View, Window, Help menus)
  - Keyboard shortcuts (`Cmd/Ctrl+,` for settings, `Cmd/Ctrl+S` for save, etc.)
  - Session/window state handling (size, position, active tab persistence)
  - Settings panel (theme, glossary tooltips)
  - Glossary with searchable terms and inline tooltips
  - About dialog with version/license info
  - Theme support (light/dark/system with CSS variables)

## Prerequisites

- Node.js `v20.19+` or `v22.12+`
- npm (bundled with Node.js)

## Development

Install dependencies:

```bash
npm install
```

Run in development (Vite + Electron plugin workflow):

```bash
npm run dev
```

Lint:

```bash
npm run lint
```

Type check (uses project references build, matching CI):

```bash
npx tsc -b
```

Run tests:

```bash
npm run test        # Watch mode
npm run test:run    # Run once
```

Test coverage includes:
- Unit tests for utility functions (pay periods, currency, bill frequency, money math, display amounts, account grouping, retirement, pay suggestions, frequency, file paths, etc.)
- Service tests with mocking (keychain, file storage, accounts service, budget calculations, currency conversion)
- Hook tests (keyboard shortcuts, app dialogs, file relink flow, encryption setup flow, field errors, modal entity editor)

## Build & Package

Build for current platform:

```bash
npm run build
```

Build without installer packaging:

```bash
npm run build:dir
```

Platform-specific builds:

```bash
npm run build:mac
npm run build:win
npm run build:linux
npm run build:all
```

Outputs are written to `release/`.

## CI/CD Workflows

This repository uses GitHub Actions workflows in `.github/workflows/`.

### 1) Test (`test.yml`)
- **Trigger**: Pull requests targeting `develop` (`opened`, `synchronize`, `reopened`)
- **Path filters**: Skips when only `.github/workflows/**` or `**/*.md` files change
- **Purpose**: Quality gate for changes before merge
- **Runs**:
  - `npm run lint`
  - `npx tsc -b` (TypeScript compilation check)
  - `npm run test:run` (Vitest unit tests)

### 2) Build (`build.yml`)
- **Trigger**: Pull requests targeting `develop` (`opened`, `synchronize`, `reopened`)
- **Path filters**: Skips when only workflows or markdown files change
- **Purpose**: Ensure the app builds on all supported desktop platforms
- **Matrix builds**:
  - `macos-latest` → `npm run build:mac`
  - `windows-latest` → `npm run build:win`
  - `ubuntu-latest` → `npm run build:linux` (with native dependencies install)
- **Artifacts**: Uploads platform build outputs from `release/` (short retention)

### 3) Version Validation (`validate-version.yml`)
- **Trigger**: Pull requests targeting `develop` or `main` (`opened`, `synchronize`, `reopened`)
- **Path filters**: Skips when only workflows or markdown files change
- **Purpose**: Enforce version increments in the `version` file
- **Behavior**:
  - Compares PR branch `version` against target branch
  - Gracefully handles missing version files (skips validation instead of failing)
  - Posts pass/fail/skipped comment on the PR
  - Fails PR if version not incremented (when both branches have version files)

### 4) Beta Release Build (`beta-release.yml`)
- **Trigger**: PR to `develop` is **closed and merged**
- **Purpose**: Produce prerelease artifacts for validation/testing from `develop`
- **Matrix builds**: macOS, Windows, Linux (with Linux native dependencies)
- **Release output**:
  - Creates GitHub **prerelease** (`prerelease: true`)
  - Tag format: `beta-v<version>-<run_number>`
  - Uploads disk images only: DMG (macOS), EXE (Windows), AppImage (Linux)
  - Includes repository source backup ZIP
  - Artifacts retained for 14 days

### 5) Production Release Build & Deploy (`release.yml`)
- **Trigger**: PR to `main` is **closed and merged**
- **Condition**: Runs only when merged branch is exactly `develop` → `main`
- **Purpose**: Create production-ready, ship-ready release artifacts
- **Note**: Currently rebuilds from scratch; planned update to reuse beta artifacts
- **Matrix builds**: macOS, Windows, Linux (with Linux native dependencies)
- **Release output**:
  - Creates GitHub **release** (`prerelease: false`)
  - Tag format: `v<version>`
  - Publishes cross-platform production disk images
  - Includes repository source backup ZIP
  - Auto-generated changelog from git commits

### Branch Promotion Flow
- Feature work merges into `develop` → triggers CI (test/build/version-validation) + Beta prerelease workflow
- `develop` merges into `main` → triggers Production release workflow

## Storage & Security

- Plan files use `.budget` extension.
- Unencrypted plans are stored as JSON.
- Encrypted plans use an envelope format (`paycheck-planner-encrypted-v1`) containing:
  - `planId`
  - encrypted `payload`
- Encryption uses AES via `crypto-js`.
- Encryption keys are **not** stored inside plan files or localStorage; they are stored as `safeStorage`-encrypted blobs in `keys.json` inside the app's `userData` directory.
- On macOS with Touch ID enrolled, `get-keychain-key` IPC calls prompt Touch ID before returning the key. The verification is cached per-plan per-session so saves do not re-prompt.
- On Windows, `safeStorage` uses DPAPI (cryptographically bound to the Windows user account). On Linux, Chromium's secret store is used. Both provide OS-session-level protection without interactive prompts.
- Existing plans encrypted with the legacy `keytar` keychain are migrated automatically on first key retrieval: the key is re-saved via `safeStorage` and deleted from the OS keychain.
- Cross-mode display storage is domain-specific rather than globally yearly-normalized.
  - Manual Pay Breakdown allocation categories are stored as normalized per-paycheck amounts.
  - Bills, loans, savings, and other recurring items keep their existing native/monthly/frequency-based storage models.
  - Display-mode helpers are expected to round-trip user-entered monthly/yearly values without save/reopen drift.

## Architecture (Current)

```text
Renderer Process (React + Context + Hooks)
  ├─ App.tsx (routing: setup/welcome/dashboard, settings/about/glossary modals)
  ├─ BudgetContext.tsx (state management, calculations, CRUD, save/load orchestration)
  ├─ ThemeContext.tsx (theme management with light/dark/system modes)
  ├─ Hooks
  │   ├─ useGlobalKeyboardShortcuts.ts (cross-platform keyboard shortcuts)
  │   ├─ useAppDialogs.ts (app-level dialog open/close state)
  │   ├─ useEncryptionSetupFlow.ts (step-by-step encryption enable/disable flow)
  │   ├─ useFieldErrors.ts (field-level validation error tracking)
  │   ├─ useFileRelinkFlow.ts (relink plan file when path moves or is missing)
  │   └─ useModalEntityEditor.ts (generic CRUD editor state for modal-based entity forms)
  └─ Components
  ├─ views/SetupWizard/ (onboarding flow)
  ├─ views/WelcomeScreen/ (new/open/recent/demo entry points)
      ├─ PlanDashboard/ (main dashboard shell + PlanTabs for tab management)
  ├─ tabViews/KeyMetrics/ (high-level summary)
  ├─ tabViews/PayBreakdown/ (gross-to-net paycheck detail)
  ├─ tabViews/BillsManager/ (recurring expenses)
  ├─ tabViews/LoansManager/ (debt tracking)
  ├─ tabViews/SavingsManager/ (savings and retirement planning)
  ├─ tabViews/TaxBreakdown/ (tax withholding detail)
  ├─ modals/AccountsModal/ (checking, savings, etc.)
  ├─ modals/SettingsModal/ (theme, font, glossary tooltips config)
  ├─ modals/AboutModal/ (version, credits, license)
  ├─ modals/GlossaryModal/ (searchable financial terms reference)
  ├─ modals/ExportModal/ (PDF export with password protection)
  ├─ modals/PaySettingsModal/ (edit pay settings post-setup)
  ├─ modals/FeedbackModal/ (in-app bug/feature feedback submission)
  ├─ modals/KeyboardShortcutsModal/ (keyboard shortcuts reference dialog)
  ├─ modals/AppFaqModal/ (searchable FAQ with expandable drawers)
  ├─ modals/ReallocationReviewModal/ (reallocation proposal review with sliders)
  ├─ modals/ReallocationSummaryModal/ (post-reallocation summary and undo)
  ├─ views/EncryptionSetup/ (encryption enable/disable/rekey flow)
  └─ _shared/ (Button, Modal, Card, Input, Toggle, PillToggle, etc.)

Services
  ├─ fileStorage.ts (save/load, encryption envelope, recent files, migrations, settings persistence)
  ├─ keychainService.ts (secure key management via Electron IPC)
  ├─ accountsService.ts (accounts CRUD, default account setup, account validation)
  ├─ budgetCalculations.ts (gross-to-net calculations, paycheck math, deduction totals)
  ├─ budgetCurrencyConversion.ts (currency conversion and formatting for budget values)
  ├─ currencyRateFetcher.ts (live exchange rates via Frankfurter API, 24h cache, offline fallback)
  ├─ taxEstimationService.ts (progressive federal brackets, FICA/Medicare, state-rate heuristics)
  ├─ reallocationPlanner.ts (automated reallocation proposals and application)
  └─ pdfExport.ts (jsPDF generation with password protection)

Utilities
  ├─ payPeriod.ts (paycheck frequency calculations via Record lookups)
  ├─ payCalendar.ts (paycheck date generation with exhaustive frequency handling)
  ├─ currency.ts (formatting with symbol placement)
  ├─ money.ts (rounding and financial math)
  ├─ billFrequency.ts (bill frequency calculations)
  ├─ frequency.ts (general frequency conversion helpers)
  ├─ accountDefaults.ts (default account configurations via Record lookups)
  ├─ accountGrouping.ts (group and sort accounts by type)
  ├─ accountAllocation.ts (account allocation helpers)
  ├─ allocationEditor.ts (stable round-trip conversion for editable allocation amounts)
  ├─ assertNever.ts (exhaustive switch/union guard — compile-time + runtime safety)
  ├─ auditHistory.ts (audit history tracking and diffing)
  ├─ deductionLineItems.ts (pre-tax and post-tax deduction line item builders)
  ├─ displayAmounts.ts (format amounts for display with period normalization)
  ├─ filePath.ts (file path utilities for platform-safe path handling)
  ├─ otherIncome.ts (other income annual amount calculations)
  ├─ otherIncomeLabels.ts (other income display labels)
  ├─ otherIncomeWithholding.ts (other income tax withholding)
  ├─ paySuggestions.ts (generate leftover/allocation suggestions based on pay)
  ├─ planSearch.ts (plan-wide search index builder and query engine)
  ├─ retirement.ts (retirement contribution limits and calculation helpers)
  ├─ tabManagement.ts (tab visibility and ordering)
  ├─ taxLines.ts (tax line helpers for estimation and display)
  ├─ viewModePreferences.ts (view mode preference persistence)
  └─ demoDataGenerator.ts (demo plan generation)

Electron Main Process
  ├─ main.ts (window lifecycle, native menus, file dialogs, keychain/file IPC, shortcuts)
  ├─ preload.ts (secure IPC bridge to renderer)
  └─ constants.ts (app-wide constants like support email)

Data Flow:
  User Interaction → Component → BudgetContext
  BudgetContext → Calculations → State Update → Re-render
  Save Trigger → fileStorage → Encryption (optional) → Electron File Dialog → OS
  Load Trigger → Electron File Dialog → fileStorage → Decryption (optional) → BudgetContext
```

## Project Structure

```text
paycheck-planner/
├── .github/
│   └── workflows/
│       ├── test.yml (lint + TS + tests on PRs)
│       ├── build.yml (multi-platform build validation)
│       ├── validate-version.yml (version increment enforcement)
│       ├── beta-release.yml (prerelease builds on develop merges)
│       └── release.yml (production builds on main merges)
├── electron/
│   ├── main.ts (app lifecycle, menus, IPC handlers)
│   ├── preload.ts (secure IPC bridge)
│   └── constants.ts (app constants)
├── src/
│   ├── components/
│   │   ├── views/
│   │   │   ├── SetupWizard/ (onboarding flow)
│   │   │   ├── WelcomeScreen/ (entry point selection)
│   │   │   └── EncryptionSetup/ (encryption enable/disable/rekey)
│   │   ├── PlanDashboard/
│   │   │   ├── PlanTabs/ (tab management)
│   │   │   ├── PlanDashboard.tsx (main shell)
│   │   │   └── PlanDashboard.css
│   │   ├── tabViews/
│   │   │   ├── KeyMetrics/ (summary dashboard)
│   │   │   ├── PayBreakdown/ (gross-to-net detail)
│   │   │   ├── BillsManager/ (recurring expenses)
│   │   │   ├── LoansManager/ (debt tracking)
│   │   │   ├── SavingsManager/ (savings + retirement)
│   │   │   └── TaxBreakdown/ (tax detail)
│   │   ├── modals/
│   │   │   ├── AccountsModal/ (accounts CRUD)
│   │   │   ├── SettingsModal/ (app preferences + font)
│   │   │   ├── AboutModal/ (version/license)
│   │   │   ├── GlossaryModal/ (terms reference)
│   │   │   ├── ExportModal/ (PDF export)
│   │   │   ├── PaySettingsModal/ (pay settings editor)
│   │   │   ├── FeedbackModal/ (in-app feedback)
│   │   │   ├── KeyboardShortcutsModal/ (shortcuts reference)
│   │   │   ├── AppFaqModal/ (searchable FAQ)
│   │   │   ├── ReallocationReviewModal/ (reallocation review with sliders)
│   │   │   └── ReallocationSummaryModal/ (post-reallocation summary + undo)
│   │   └── _shared/ (reusable UI components)
│   ├── contexts/
│   │   ├── BudgetContext.tsx (budget state management)
│   │   └── ThemeContext.tsx (theme management)
│   ├── hooks/
│   │   ├── useGlobalKeyboardShortcuts.ts
│   │   ├── useAppDialogs.ts
│   │   ├── useEncryptionSetupFlow.ts
│   │   ├── useFieldErrors.ts
│   │   ├── useFileRelinkFlow.ts
│   │   └── useModalEntityEditor.ts
│   ├── services/
│   │   ├── fileStorage.ts (file I/O + encryption)
│   │   ├── keychainService.ts (secure key storage)
│   │   ├── accountsService.ts (accounts CRUD + validation)
│   │   ├── budgetCalculations.ts (gross-to-net + deduction math)
│   │   ├── budgetCurrencyConversion.ts (currency conversion for budget values)
│   │   ├── currencyRateFetcher.ts (live exchange rates + caching)
│   │   ├── taxEstimationService.ts (smart tax auto-estimation)
│   │   ├── reallocationPlanner.ts (automated reallocation proposals)
│   │   └── pdfExport.ts (PDF generation)
│   ├── types/
│   │   ├── accounts.ts (account data + stored allocation category types)
│   │   ├── auth.ts (budget data types)
│   │   ├── budget.ts (budget document type)
│   │   ├── budgetContext.ts (context value type)
│   │   ├── fieldErrors.ts (shared field-error types)
│   │   ├── frequencies.ts (PayFrequency, BillFrequency, etc.)
│   │   ├── obligations.ts (Bill, Loan, Benefit, SavingsContribution)
│   │   ├── payBreakdown.ts (runtime AllocationCategory discriminated union)
│   │   ├── payroll.ts (PaySettings, RetirementElection)
│   │   ├── settings.ts (app settings types)
│   │   ├── tabs.ts (tab types)
│   │   ├── viewMode.ts (ViewMode, SelectableViewMode)
│   │   └── electron.d.ts (Electron API types)
│   ├── utils/
│   │   ├── payPeriod.ts
│   │   ├── payCalendar.ts
│   │   ├── currency.ts
│   │   ├── money.ts
│   │   ├── billFrequency.ts
│   │   ├── frequency.ts
│   │   ├── accountDefaults.ts
│   │   ├── accountGrouping.ts
│   │   ├── accountAllocation.ts
│   │   ├── allocationEditor.ts
│   │   ├── assertNever.ts
│   │   ├── auditHistory.ts
│   │   ├── deductionLineItems.ts
│   │   ├── displayAmounts.ts
│   │   ├── filePath.ts
│   │   ├── otherIncome.ts
│   │   ├── planSearch.ts
│   │   ├── tabManagement.ts
│   │   ├── paySuggestions.ts
│   │   ├── retirement.ts
│   │   ├── taxLines.ts
│   │   ├── viewModePreferences.ts
│   │   └── demoDataGenerator.ts
│   ├── constants/
│   │   ├── frequencies.ts (frequency + view mode constants)
│   │   ├── tabIds.ts (centralized tab identifiers)
│   │   ├── loanTypes.ts (loan type metadata)
│   │   ├── retirementTypes.ts (retirement plan type metadata)
│   │   ├── reallocationSourceTypes.ts (reallocation source type metadata)
│   │   ├── accountPalette.ts (account type colors)
│   │   ├── appearancePresets.ts (theme presets)
│   │   ├── storage.ts (localStorage keys)
│   │   └── events.ts (custom app events)
│   ├── data/
│   │   ├── glossary.ts (financial terms glossary)
│   │   ├── appFaqs.ts (FAQ content)
│   │   └── usTaxData.ts (IRS-backed US tax rules)
│   ├── App.tsx (main app component)
│   ├── App.css
│   ├── main.tsx (React entry point)
│   └── index.css (global styles)
├── build/ (icon assets)
├── scripts/
│   ├── generate-icons.js (icon generation)
│   └── sync-version.js (version sync)
├── app_updates/
│   ├── APP_MVP.md
│   ├── APP_UPDATES.md
│   └── Implementations.md
├── package.json
├── version (app version file)
├── tsconfig.json
├── vite.config.ts
└── README.md (user-facing feature overview)
```

## Troubleshooting

### "Electron API not available"

This app must run in Electron mode (not plain browser mode). Use `npm run dev` from project root.

### Can’t open an encrypted plan

- Confirm the plan was encrypted during setup.
- On macOS with Touch ID: ensure Touch ID is enrolled in System Settings → Touch ID & Password. If Touch ID is unavailable the app falls back to `safeStorage` protection without a biometric prompt.
- If `keys.json` has been deleted from the app's `userData` folder, the key is gone and the plan cannot be recovered without the original key. There is no Keychain fallback once migration has completed.
- On first run after upgrade from a version that used `keytar`, the key is migrated automatically from the OS keychain on the first open; no user action is needed.

### Session/window state issues

If window/session restore gets stuck or behaves unexpectedly, remove session state and restart:

**macOS:**
```bash
rm -f ~/Library/Application\ Support/Paycheck\ Planner/session.json
```

**Windows:**
```powershell
del "%APPDATA%\Paycheck Planner\session.json"
```

**Linux:**
```bash
rm -f ~/.config/Paycheck\ Planner/session.json
```

### Build failures on Linux (CI)

If you see errors about missing libraries during `electron-builder` on Ubuntu:
- Ensure `libsecret-1-dev`, `libnss3-dev`, `pkg-config`, `fakeroot`, and `dpkg` are installed
- The build workflow already includes these; check for apt update failures

### Native module rebuild issues

If `keytar` or other native modules fail to load:

```bash
npm run rebuild-native
# or
npx electron-rebuild
```

### Icon generation skipped

If you see "Skipping icon generation: build/icon-source.png not found":
- Ensure `build/icon-source.png` exists and is committable (check `.gitignore`)
- Run `npm run generate-icons` manually to create platform icons
- Build scripts use `--if-present` flag to gracefully skip if source is missing

### Version validation failures

If version validation workflow fails on PRs to `develop`:
- Increment the `version` file in your PR branch
- Format: `MAJOR.MINOR.PATCH` (e.g., `0.1.0` → `0.1.1`)
- Workflow gracefully skips if `version` file doesn't exist on either branch

### macOS signing and notarization (release automation)

Production-quality macOS builds require both code signing and notarization.

#### Required GitHub Secrets for Release Workflows

**macOS Code Signing & Notarization:**
- `CSC_LINK`: Base64-encoded `.p12` certificate payload (Developer ID Application)
- `CSC_KEY_PASSWORD`: Password for the `.p12` certificate
- `APPLE_ID`: Apple ID email used for notarization
- `APPLE_APP_SPECIFIC_PASSWORD`: App-specific password for the Apple ID
- `APPLE_TEAM_ID`: Apple Developer Team ID

**Feedback Form Configuration:**
- `FEEDBACK_FORM_URL`: Google Form prefill URL (e.g., `https://docs.google.com/forms/d/e/FORM_ID/viewform`)
- `FEEDBACK_FORM_ENTRY_EMAIL`: Google Form entry ID for email field
- `FEEDBACK_FORM_ENTRY_CATEGORY`: Google Form entry ID for feedback category
- `FEEDBACK_FORM_ENTRY_SUBJECT`: Google Form entry ID for subject line
- `FEEDBACK_FORM_ENTRY_DETAILS`: Google Form entry ID for message body

See `.env.example` for local development setup and how to extract Google Form entry IDs.

#### Build Configuration

- Build config uses hardened runtime + Electron entitlements and runs notarization in `scripts/notarize.mjs`.
- If notarization env vars are missing, local mac builds still complete but notarization is skipped.
- Feedback form configuration is optional for local builds; if omitted, the feedback modal will display a config error.

## Keeping This README Updated

When any **major feature** or **architecture** changes, update this README in the same PR.

Use this checklist:

1. Update **Current Functionality** (what users can do now).
2. Update **Architecture (Current)** if data flow/modules changed.
3. Update **Project Structure** if folders/components changed.
4. Update **Build/Run commands** if scripts changed in `package.json`.
5. Update **Storage & Security** when file format or encryption/key handling changes.
6. Move roadmap-only items to `app_updates/APP_UPDATES.md` (keep README focused on shipped behavior).

## Related Docs

- `README.md` (project root) – User-facing feature overview and getting started guide
- `app_updates/Implementations.md` – Implementation notes and technical decisions for in-progress features
- `app_updates/Shared Logic Refactor.md` – Shared logic extraction roadmap and progress checklist
- `app_updates/Styles Refactor.md` – CSS deduplication and theme-token roadmap and progress checklist
- `.github/workflows/` – CI/CD pipeline configurations

## License

MIT
