# Paycheck Planner - Claude Code Configuration

## Project Context Files

Read these before working to understand the project and its conventions:

1. [Root README.md](../README.md) - Feature overview and keyboard shortcuts
2. [src/README.md](../src/README.md) - Technical architecture and project structure
3. [CONTRIBUTING.md](../CONTRIBUTING.md) - (if exists) Contribution guidelines
4. [PLAN_TEMPLATE.md](../app_updates/PLAN_TEMPLATE.md) - Template for creating phased tasks based on planned work

---

## Critical Rules

### Security & Data Safety
- **NEVER** commit secrets, credentials, or sensitive information
- **NEVER** send unencrypted plan/vault data to external services
- **NEVER** log decrypted data, encryption keys, or PII (personal information)
- **CRITICAL:** Validate all file operations; only accept `.npc` plan files, reject `.npc-settings` exports
- **CRITICAL:** File relink behavior must preserve `expectedPlanId` validation to prevent data corruption

### Accessibility & Theming
- **CRITICAL:** All UI changes must pass WCAG AA contrast (4.5:1 for text, 3:1 for borders)
- **NEVER** hardcode colors; always use semantic CSS tokens from `src/index.css` (e.g., `var(--bg-primary)`)
- **CRITICAL:** New UI must be tested in light mode, dark mode, and high-contrast mode
- **NEVER** use raw `rgba()`, `rgb()`, or hex colors in component CSS
- **ALWAYS** respect `@media (prefers-reduced-motion: reduce)` for accessibility

### Keyboard Shortcuts & Electron
- **CRITICAL:** Use two-tier keyboard shortcut model: Electron global shortcuts (primary) + React capture phase (fallback)
- **NEVER** rely on bubbling-only event handlers for critical shortcuts—form inputs consume keydown before bubble
- **ALWAYS** use capture phase (3rd parameter `true`) for React keyboard listeners: `window.addEventListener('keydown', handler, true)`
- **CRITICAL:** Modal.tsx handles Escape globally; do NOT add redundant Escape handlers in individual modals

### Shared Reusability
- **NEVER** duplicate logic across components; extract to `utils/`, `services/`, or `hooks/`
- **CRITICAL:** New `src/services/*.ts` or `src/utils/*.ts` MUST have a corresponding `*.test.ts` file
- **CRITICAL:** Every change to existing `src/services` or `src/utils` MUST update or extend existing tests
- **NEVER** hardcode repeated strings/numbers; put them in `electron/constants.ts` or relevant `utils/` module
- **CRITICAL:** New shared controls in `_shared/` MUST have an `index.ts` barrel export

### Testing & Validation
- **ALWAYS** run all four pre-merge checks before PR: `npm run lint && npm run test:run && npx tsc -b && npm run build`
- **NEVER** skip validation even for "small" CSS or comment changes
- **CRITICAL:** Use `npx tsc -b` (project references), not `--noEmit`—CI workflow uses project references build
- **ALWAYS** test keyboard shortcuts with focus on form elements (input, textarea, contentEditable)

### Code Organization
- **NEVER** use global CSS class names (.empty-state, .account-section) without component scope
- **CRITICAL:** CSS selectors must be component-scoped (e.g., `.loans-manager .account-section`) to prevent collisions
- **ALWAYS** maintain separation between `apps/` (if adding) and `libs/` (if modularizing)

---

## Electron + React + TypeScript Architecture

### Tech Stack
- **Framework:** React 18+ with TypeScript
- **Build:** Vite (fast dev build + Electron integration)
- **Desktop Runtime:** Electron (main process + preload script)
- **State Management:** React Context (BudgetContext, ThemeContext) + local state
- **Styling:** CSS + semantic CSS variables (no Tailwind; design tokens in `src/index.css`)
- **Testing:** Vitest (unit/hook/service tests) + mock-based (no real I/O)
- **Encryption:** User passphrase-derived key (scrypt + XChaCha20-Poly1305)

### Project Layout
```
src/
├── components/_shared/        # Reusable UI: controls/, feedback/, layout/, workflows/
├── components/tabViews/       # Tab managers: AccountsManager, LoansManager, BillsManager, etc.
├── components/Settings/       # App settings and accessibility controls
├── contexts/                  # BudgetContext (plan state), ThemeContext (appearance + a11y)
├── hooks/                     # Custom hooks (useGlobalKeyboardShortcuts, useModalEntityEditor, etc.)
├── services/                  # Business logic: fileStorage, accountsService, keychainService, pdfExport (+ *.test.ts)
├── utils/                     # Utilities: frequency, money, payPeriod, accountDefaults, etc. (+ *.test.ts)
├── constants/                 # Shared constants (accountPalette.ts)
├── types/                     # Domain types (auth.ts with Account, Plan, etc.)
├── data/                      # Content (glossary.ts)
└── index.css                  # Global semantic tokens (light, dark, high-contrast themes)

electron/
├── main.ts                    # Electron main process, global shortcuts, file watchers
├── preload.ts                 # Preload script for IPC
└── constants.ts               # App-wide constants

tests/
└── *.test.ts                  # Vitest unit tests for services, utils, hooks
```

### Key Patterns

#### State Management (BudgetContext)
```typescript
// Service exposes RxJS-like pattern via context
<BudgetContext.Provider value={{ plan, updateAccount, addAccount, ... }}>
  <App />
</BudgetContext.Provider>

// Components use directly
const { plan, updateAccount } = useContext(BudgetContext);
```

#### Semantic Theming (ThemeContext)
```typescript
// ThemeContext applies data-theme, data-contrast, root font-size percentage
<ThemeContext.Provider value={{ theme: 'dark', contrast: 'high', fontScale: 1.25 }}>
  <App />
</ThemeContext.Provider>

// CSS uses semantic tokens
.my-component {
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 8px var(--shadow-md);
}
```

#### Shared Controls
All controls in `src/components/_shared/` export via barrel (e.g., `Button/index.ts` → `export { default } from './Button'`).

Example: `src/components/_shared/controls/Button/`
```
Button.tsx       # Component logic
Button.css       # Scoped styles using semantic tokens
Button.test.tsx  # Unit tests (render, accessibility, theme modes)
index.ts         # Barrel export
```

#### File Operations (Safety-Critical)
```typescript
// Service handles relink validation automatically
const result = await fileStorage.loadBudget(filePath);
if (result.status === 'mismatch') {
  // User has a chance to relink or cancel
  await relinkMovedBudgetFile(missingPath, expectedPlanId);
}
```

#### Keyboard Shortcuts (Two-Tier)
```typescript
// Tier 1: React capture phase (fallback for form elements)
useGlobalKeyboardShortcut('cmd+comma', () => openSettings());

// Tier 2: Electron global (primary, works everywhere)
// In electron/main.ts:
globalShortcut.register('Cmd+,', () => {
  focusedWindow.webContents.send('menu:open-settings');
});
```

#### Service Tests (Mock-Based)
```typescript
// Never read/write real files or keychain in tests
vi.mock('../path/to/keychain');

it('saves encrypted data', () => {
  const mockKeychain = vi.mocked(keychainService);
  mockKeychain.save.mockResolvedValue(true);
  // ... test logic
});
```

---

## Accessibility & Contrast Guide

### WCAG AA Requirements
- **Normal text:** 4.5:1 contrast minimum
- **Borders/inactive states:** 3:1 contrast minimum
- **Icons/graphics:** Follow same rules; use color + pattern, not color alone

### Semantic Token System
All colors are defined in `src/index.css` with light/dark/high-contrast overrides:

**Light Mode (Root)**
```css
--bg-primary: #ffffff;
--text-primary: #111827;
--text-secondary: #4b5563;      /* 6.7:1 on white (AA) */
--border-color: #e5e7eb;        /* 1.2:1 — acceptable for borders */
--accent-primary: #667eea;
--error-color: #ef4444;
/* ... */
```

**Dark Mode**
```css
--bg-primary: #1a1a1a;
--text-primary: #f9fafb;
--text-secondary: #d1d5db;      /* 7.1:1 on dark (AA) */
--accent-primary: #a855f7;
--text-accent: #c084fc;         /* 6.06:1 — fallback for headers in dark */
/* ... */
```

**High-Contrast Mode**
Override key tokens for stricter differentiation:
```css
[data-contrast="high"] {
  --text-secondary: #374151;
  --border-color: #9ca3af;
}
```

### Common Affordances
- **Focus state:** `var(--focus-ring-accent)` (solid 2px, WCAG 2.4.11)
- **Disabled text:** `var(--text-tertiary)` (muted)
- **Danger action:** Use `var(--error-color)` with `color-mix(in srgb, var(--error-color) 20%, transparent)`
- **Non-color cues:** Add icons, patterns, bold text where needed (GlossaryTerm ⓘ badge as example)

### Pre-Flight Checklist for UI Changes
- [ ] Light mode text contrast ≥ 4.5:1
- [ ] Dark mode text contrast ≥ 4.5:1
- [ ] Border/inactive contrast ≥ 3:1
- [ ] High-contrast mode readable
- [ ] Focus state visible (outline or background change)
- [ ] Disabled state clearly distinct
- [ ] Hover/active states maintain contrast
- [ ] Animations optional under `prefers-reduced-motion: reduce`
- [ ] Tested on light theme, dark theme, high-contrast mode

---

## Testing & Validation

### Test Structure
- **Unit tests:** Vitest for utils, services, hooks
- **Mock-based:** Never read/write real files, keychain, or Electron APIs in tests
- **Component tests:** Render, accessibility, theme modes, edge cases (recommended for shared controls)

### Running Tests
```bash
npm run test          # Watch mode
npm run test:run      # CI mode
npm run lint          # ESLint
npx tsc -b            # TypeScript build (project refs)
npm run build         # Production build
```

### Pre-Merge Checklist (CRITICAL)
Run in order; all must pass before PR merge:
```bash
npm run lint          # 0 errors required
npm run test:run      # All tests passing
npx tsc -b            # TypeScript build success (NOT --noEmit)
npm run build         # Production build success
```

### Coverage Policy
- **New `src/services/*.ts`:** Must have `src/services/*.test.ts`
- **New `src/utils/*.ts`:** Must have `src/utils/*.test.ts`
- **Changed service/util logic:** Update existing tests; don't skip coverage
- **Shared components:** Optional but recommended (render, accessibility, theme modes, edge cases)

---

## Common Patterns & Anti-Patterns

### ✅ DO: Use Semantic Tokens
```css
.button {
  background: var(--accent-primary);
  border: 1px solid var(--border-color);
  color: var(--text-inverse);
  box-shadow: 0 2px 8px var(--shadow-md);
}
```

### ❌ DON'T: Hardcode Colors
```css
.button {
  background: #667eea;
  border: 1px solid rgba(0, 0, 0, 0.1);
  color: white;
}
```

### ✅ DO: Extract Shared Logic
```typescript
// src/utils/accountDefaults.ts
export function getDefaultAccountColor(type: Account['type']): string {
  return ACCOUNT_TYPE_COLORS[type] ?? DEFAULT_ACCOUNT_COLOR;
}

// Imported in: accountDefaults, demoDataGenerator, fileStorage
```

### ❌ DON'T: Duplicate Logic
```typescript
// Bad: Same logic in 3 components
const color = {
  checking: '#667eea',
  savings: '#f093fb',
  // ... repeated in each file
}[accountType];
```

### ✅ DO: Component-Scoped CSS
```css
.loans-manager {
  padding: 1rem;
}
.loans-manager .account-section {
  background: var(--bg-primary);
}
```

### ❌ DON'T: Global CSS Selectors
```css
/* Causes collisions across tabs */
.account-section {
  background: #fff;
}
```

### ✅ DO: Two-Tier Keyboard Shortcuts
```typescript
// React (capture phase)
window.addEventListener('keydown', handleShortcut, true);

// Electron (global)
globalShortcut.register('Cmd+,', () => openSettings());
```

### ❌ DON'T: Bubbling-Only Shortcuts
```javascript
// Fails when form elements have focus
window.addEventListener('keydown', handleShortcut); // ← no capture
```

### ✅ DO: Respect Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

### ❌ DON'T: Force Animations
```css
.fade-in {
  animation: fadeIn 0.3s ease-in; /* Ignores a11y pref */
}
```

---

## PR Review Focus

When reviewing a PR or changeset, prioritize findings in this order:

### Severity 1: Safety & Security
- File operations: regressions in relink, acceptance of non-plan files, stale paths
- Encryption: no new encryption logic, no PII logging, no unencrypted data export
- Tests: missing coverage for changed service/util logic
- Persistence: are settings/themes persisted correctly?

### Severity 2: Accessibility
- Contrast violations (WCAG AA)
- Missing focus states
- Reduced-motion breakage
- Keyboard shortcut reliability

### Severity 3: Architecture & Patterns
- Duplication: logic that should be in shared utils/services/components
- Reusability bypass: new components that ignore existing shared primitives
- Styling: raw colors instead of semantic tokens, global CSS collisions
- Testing: gaps in coverage for critical paths

### Severity 4: Code Quality
- Type safety, unused imports, clear naming
- Documentation clarity, RELEASE_NOTES.md updated
- Commit hygiene, sensible scope

---

## Keyboard Shortcuts

**App-Level (Electron Global)**
- `Cmd+, (Mac) / Ctrl+, (Windows/Linux)` → Open Settings

**Tab Navigation (React Capture)**
- `Cmd+1–6 (Mac) / Ctrl+1–6 (Windows/Linux)` → Switch tabs in PlanDashboard

**Modals (React Capture)**
- `Escape` → Close modal (Modal.tsx handles globally)

---

## Documentation

### RELEASE_NOTES.md
Update throughout each session with user-visible changes:
- Format: `### Features`, `### Improvements`, `### Bug Fixes`
- Include only changes since last production release (currently v0.3.2)
- Focus on user outcomes, not implementation details

### README.md
Update when user-facing features change:
- What You Can Do
- Keyboard Shortcuts
- Application Features
- Troubleshooting Issues

### src/README.md
Update when architecture or technical patterns change:
- Current Functionality
- Architecture
- Project Structure
- Hooks, Services, Utils
- **Command note:** Always use `npx tsc -b`, not `--noEmit`

---

## File Operations & Data Safety

### File Relink (Moved Budget Detection)
- `FileStorageService.loadBudget(path)` checks if file exists
- If missing → invokes `relinkMovedBudgetFile(missingPath, expectedPlanId?)`
- Returns typed outcome: `success | cancelled | mismatch | invalid`
- **Rejects non-plan files** (including `.npc-settings` exports)
- `PlanDashboard` runs guarded interval check; prompts relink once per missing path

### File Acceptance Rules
- Only `.npc` (Paycheck Plan) files accepted in budget dialogs
- `.npc-settings` (settings exports) explicitly rejected
- Prevents accidental data corruption from cross-app file loading

### Encryption
- User passphrase → scrypt key derivation
- Plan data encrypted with XChaCha20-Poly1305
- No plan data leaves the local machine

---

## Version & Release Info

**Current Production:** v0.3.2  
**Current Development:** v0.4.0 (Theme & Accessibility)  
**Phase Status:** Phase 1 (Foundation) Complete; Planning Phase 2 (Presets)

---

## Quick References

### Important Files
- **Theme System:** `src/index.css` (all semantic tokens)
- **Appearance Settings:** `src/utils/appearanceSettings.ts`
- **Keyboard Shortcuts:** `src/hooks/useGlobalKeyboardShortcuts.ts` (React) + `electron/main.ts` (Electron)
- **File I/O:** `src/services/fileStorage.ts`
- **Shared Components:** `src/components/_shared/`
- **Domain Types:** `src/types/auth.ts`

### Common Tasks
- **New tab view:** Create `src/components/tabViews/MyManager/MyManager.tsx` + `.test.tsx`, register in `PlanDashboard`
- **Shared control:** Create `src/components/_shared/controls/MyControl/` → `MyControl.tsx`, `MyControl.css`, `MyControl.test.tsx`, `index.ts`
- **Utility function:** Create `src/utils/myUtil.ts` + `myUtil.test.ts`, export from barrel
- **Keyboard shortcut:** Register in `electron/main.ts` (Electron) + `useGlobalKeyboardShortcuts` hook (React)

---

## Resources

- [Paycheck Planner GitHub](https://github.com/kryptodrex/paycheck-planner)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Electron Documentation](https://www.electronjs.org/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Vitest Documentation](https://vitest.dev/)

---

**Last Updated:** March 17, 2026