# Paycheck Planner

Paycheck Planner is a local-first desktop app for paycheck-based financial planning. It helps you model gross-to-net pay, allocate money across accounts, track recurring bills, and save yearly plans as `.budget` files (optionally encrypted).

Built with Electron, React, TypeScript, and Vite.

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
