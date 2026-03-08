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
- **Setup wizard**: Guided onboarding for currency, encryption choice, pay details, pay frequency, tax assumptions, and initial accounts.
- **Paycheck planning dashboard**:
  - Key metrics
  - Gross-to-net pay breakdown
  - Bills manager
  - Benefits manager
  - Tax breakdown
  - Accounts manager
  - **Customizable tabs**: Show/hide tabs, reorder non-pinned tabs, with pinned tabs (Key Metrics, Pay Breakdown) always visible
- **Year-based workflows**: Duplicate a plan into a new year.
- **Security options**: Per-plan encryption can be enabled/disabled; encryption keys are stored in OS keychain.
- **Desktop UX**: Native menu integration, keyboard shortcuts (including `Cmd/Ctrl + ,` for settings), and session/window state handling.

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

Type check:

```bash
npx tsc --noEmit
```

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
- **Purpose**: Quality gate for changes before merge
- **Runs**:
  - `npm run lint`
  - `npx tsc -b`

### 2) Build (`build.yml`)
- **Trigger**: Pull requests targeting `develop` (`opened`, `synchronize`, `reopened`)
- **Purpose**: Ensure the app builds on all supported desktop platforms
- **Matrix builds**:
  - `macos-latest` → `npm run build:mac`
  - `windows-latest` → `npm run build:win`
  - `ubuntu-latest` → `npm run build:linux`
- **Artifacts**: Uploads platform build outputs from `release/` (short retention)

### 3) Version Validation (`version-validation.yml`)
- **Trigger**: Pull requests targeting `develop` (`opened`, `synchronize`, `reopened`)
- **Purpose**: Enforce version increments in the `version` file
- **Behavior**:
  - Compares PR branch `version` against `develop`
  - Fails if not incremented
  - Posts pass/fail comment on the PR

### 4) Beta Release Build (`beta-release.yml`)
- **Trigger**: PR to `develop` is **closed and merged**
- **Purpose**: Produce prerelease artifacts for validation/testing from `develop`
- **Matrix builds**: macOS, Windows, Linux
- **Release output**:
  - Creates GitHub **prerelease** (`prerelease: true`)
  - Tag format: `beta-v<version>-<run_number>`
  - Uploads available platform installers/binaries (e.g., `.dmg`, `.zip`, `.exe`, `.msi`, `.AppImage`, `.deb`)

### 5) Production Release Build & Deploy (`release.yml`)
- **Trigger**: PR to `main` is **closed and merged**
- **Condition**: Runs only when merged branch is exactly `develop` → `main`
- **Purpose**: Create production-ready, ship-ready release artifacts
- **Matrix builds**: macOS, Windows, Linux
- **Release output**:
  - Creates GitHub **release** (`prerelease: false`)
  - Tag format: `v<version>`
  - Publishes cross-platform production artifacts

### Branch Promotion Flow
- Feature work merges into `develop` → triggers CI + Beta prerelease workflow
- `develop` merges into `main` → triggers Production release workflow

## Storage & Security

- Plan files use `.budget` extension.
- Unencrypted plans are stored as JSON.
- Encrypted plans use an envelope format (`paycheck-planner-encrypted-v1`) containing:
  - `planId`
  - encrypted `payload`
- Encryption uses AES via `crypto-js`.
- Encryption keys are **not** stored inside plan files or localStorage; they are saved in system keychain via `keytar`.

## Architecture (Current)

```text
Renderer (React + Context)
  ├─ App.tsx (view routing: setup/welcome/dashboard)
  ├─ BudgetContext.tsx (state + calculations + CRUD + save/load orchestration)
  └─ components/* (wizard, dashboard tabs, settings, about, shared UI)

Services
  ├─ fileStorage.ts (save/load, encryption envelope, recent files, migrations)
  └─ keychainService.ts (secure key management via Electron IPC)

Electron Main Process
  ├─ main.ts (window lifecycle, menu events, file dialogs, keychain/file IPC)
  └─ preload.ts (secure bridge to renderer)
```

## Project Structure

```text
paycheck-planner/
├── electron/
│   ├── main.ts
│   └── preload.ts
├── src/
│   ├── components/
│   │   ├── SetupWizard/
│   │   ├── WelcomeScreen/
│   │   ├── PlanDashboard/
│   │   │   ├── PlanTabs/
│   │   │   │   ├── PlanTabs.tsx
│   │   │   │   ├── TabManagementModal.tsx
│   │   │   │   └── PlanTabs.css
│   │   │   ├── PlanDashboard.tsx
│   │   │   └── PlanDashboard.css
│   │   ├── KeyMetrics/
│   │   ├── PayBreakdown/
│   │   ├── BillsManager/
│   │   ├── BenefitsManager/
│   │   ├── AccountsManager/
│   │   ├── TaxBreakdown/
│   │   ├── Settings/
│   │   └── About/
│   ├── contexts/
│   │   └── BudgetContext.tsx
│   ├── services/
│   │   ├── fileStorage.ts
│   │   └── keychainService.ts
│   ├── types/
│   │   ├── auth.ts
│   │   └── electron.d.ts
│   └── App.tsx
├── app_updates/
│   ├── APP_MVP.md
│   └── APP_UPDATES.md
├── package.json
└── README.md
```

## Troubleshooting

### "Electron API not available"

This app must run in Electron mode (not plain browser mode). Use `npm run dev` from project root.

### Can’t open an encrypted plan

- Confirm the plan was encrypted.
- Confirm the key exists for that `planId` in your local keychain.
- If keychain access is blocked by OS permissions, allow keychain access and retry.

### Session/window state issues

If window/session restore gets stuck, remove session state and restart:

```bash
rm -f ~/Library/Application\ Support/Paycheck\ Planner/session.json
```

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

- `Features.md` – high-level, user-focused overview of current app capabilities.
- `app_updates/APP_MVP.md` – MVP scope notes.
- `app_updates/APP_UPDATES.md` – shipped + planned update tracking.

## License

MIT
