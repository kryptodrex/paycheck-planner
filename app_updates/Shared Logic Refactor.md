# Shared Logic Refactor

## Goal
Reduce duplication, improve consistency, and lower bug risk by extracting reusable logic into shared `utils`, `services`, hooks, and shared UI patterns.

## How To Use This File
- Mark an item complete only when its **Done Criteria** are fully met.
- For any task that changes/adds `src/services` or `src/utils`, add/update tests in the same task.
- Keep each item scope-limited; do not bundle multiple large refactors into one PR.

## Prioritized Checklist (Most Important -> Least Important)

### 1. Centralize Financial Calculation Engine
**Priority:** Critical

- [x] Implement `src/services/budgetCalculations.ts` as the single source of truth for paycheck/tax/net/allocation math.
- [x] Migrate `BudgetContext.calculatePaycheckBreakdown` to use shared functions.
- [x] Migrate `KeyMetrics` and `pdfExport` to use the same shared functions.
- [x] Migrate `PayBreakdown` to use the same shared functions.
- [x] Add parity tests proving all consumers return identical numbers for the same fixture.

**Problem:** Core pay/tax/net/leftover math is duplicated across multiple layers.

**Current duplication evidence:**
- `src/contexts/BudgetContext.tsx` (`calculatePaycheckBreakdown`)
- `src/components/PayBreakdown/PayBreakdown.tsx` (yearly/display breakdown math)
- `src/components/KeyMetrics/KeyMetrics.tsx` (annual/monthly metric math)
- `src/services/pdfExport.ts` (its own gross/tax/net math)

**Refactor target:**
- Add `src/services/budgetCalculations.ts` with pure functions:
  - `calculatePayBreakdownPerPaycheck`
  - `calculateAnnualizedSummary`
  - `calculateDisplaySummary(displayMode)`
  - `calculateAllocationTotals`

**Done Criteria:**
- No component/service performs independent pay/tax/net math outside shared calculator functions.
- `pdfExport` values match `PayBreakdown`/`KeyMetrics` outputs for test fixtures.
- New/updated tests exist for `budgetCalculations` and all touched services/utils.

**Why first:** This removes the highest bug surface area and guarantees all screens/export use identical numbers.

---

### 2. Unified Missing/Moved File Relink Flow
**Priority:** Critical

- [x] Extract shared relink state/decision logic to `src/hooks/useFileRelinkFlow.ts` (or equivalent service + hook).
- [x] Keep Welcome and PlanDashboard modal UIs, but wire both to the shared flow.
- [x] Ensure cancel behavior is identical across entry points (clear stale path policy, no stale saves).
- [x] Add tests for `success`, `cancelled`, `mismatch`, and `invalid` paths.

**Problem:** Similar relink state + modal handling exists in multiple components.

**Current duplication evidence:**
- `src/components/WelcomeScreen/WelcomeScreen.tsx`
- `src/components/PlanDashboard/PlanDashboard.tsx`
- Shared behavior depends on `FileStorageService.relinkMovedBudgetFile`

**Refactor target:**
- Add `src/hooks/useFileRelinkFlow.ts` (or a small service + hook pair)
- Keep modal visuals local if desired, but centralize decision/state logic:
  - open/cancel/retry
  - invalid/mismatch message handling
  - stale path cleanup policy

**Why second:** Prevents regressions in file safety logic and keeps save/load behavior consistent.

**Done Criteria:**
- Welcome and PlanDashboard use a common relink flow contract.
- Saving cannot proceed to stale paths from any trigger (`button`, menu, keyboard shortcut).
- Shared tests cover all status outcomes.

---

### 3. File Path / Plan Name Helpers
**Priority:** High

- [x] Create `src/utils/filePath.ts` for all filename/path parsing.
- [x] Replace all ad-hoc basename/split logic in `BudgetContext` and `FileStorageService`.
- [x] Add unit tests for separators, extensions, whitespace, and empty input edge cases.

**Problem:** Path-to-name parsing logic is duplicated in context/service and ad-hoc splits exist.

**Current duplication evidence:**
- `src/contexts/BudgetContext.tsx` (`derivePlanNameFromFilePath`)
- `src/services/fileStorage.ts` (`derivePlanNameFromFilePath` and repeated basename extraction)

**Refactor target:**
- Add `src/utils/filePath.ts`:
  - `getBaseFileName(path)`
  - `getPlanNameFromPath(path)`
  - `stripFileExtension(name)`

**Why third:** Low risk and immediately improves consistency.

**Done Criteria:**
- Only shared helpers are used for plan-name derivation and basename extraction.
- No direct `split(/[\\/])` basename parsing remains in business logic.

---

### 4. Shared Dialog Strategy (Replace scattered `alert` / `confirm`)
**Priority:** High

- [x] Introduce shared app dialogs (`ConfirmDialog`, `ErrorDialog`) and optional `useAppDialogs` helper.
- [x] Replace highest-impact `alert`/`confirm` calls first (PlanDashboard, Settings, SetupWizard, Welcome).
- [x] Standardize button wording (`Cancel`, `Confirm`, `Retry`) and error presentation.

**Problem:** Browser dialogs are still scattered and inconsistent for UX/testing.

**Current duplication evidence:**
- `PlanDashboard`, `Settings`, `WelcomeScreen`, `SetupWizard`, `EncryptionSetup`, `PlanTabs`, and manager components.

**Refactor target:**
- Add shared modal-based helpers:
  - `ConfirmDialog`
  - `ErrorDialog`
  - optional `useAppDialogs`

**Why fourth:** Better UX consistency and testability.

**Done Criteria:**
- Critical flows no longer rely on native `window.alert`/`window.confirm`.
- Dialog interaction behavior is consistent and keyboard-accessible.

---

### 5. Manager CRUD Form Patterns -> Shared Hooks
**Priority:** High

- [x] Extract reusable hooks for modal entity editing and field error state.
- [x] Migrate at least two manager components first (recommended: Bills + Loans), then expand.
- [x] Preserve existing UX/validation messages while reducing duplicate handlers.

**Problem:** Bills/Loans/Savings/Benefits managers all implement similar modal-form CRUD state and validation patterns.

**Current duplication evidence:**
- Add/edit modal toggles and `editingX` patterns
- `handleAdd*`, `handleEdit*`, `handleSave*`, `handleDelete*` duplication

**Refactor target:**
- Add hooks:
  - `useModalEntityEditor<T>()`
  - `useFieldErrors<T>()`
  - `useDeleteConfirmation()`

**Why fifth:** Large maintainability win, but higher refactor complexity than utility-only changes.

**Done Criteria:**
- Repeated `handleAdd/Edit/Save/Delete` scaffolding is reduced substantially across managers.
- No behavior regressions in add/edit/delete flows.

---

### 6. Display Mode Conversion Utilities
**Priority:** Medium-High

- [x] Add `src/utils/displayAmounts.ts` and migrate manager-level `toDisplayAmount`/`fromDisplayAmount` helpers.
- [x] Keep pay frequency + display mode conversion rules centralized.

**Problem:** Local `toDisplayAmount` helpers repeated across managers.

**Current duplication evidence:**
- `BillsManager`, `SavingsManager`, `PayBreakdown`, and related components.

**Refactor target:**
- Add `src/utils/displayAmounts.ts`:
  - `toDisplayAmount(perPaycheck, paychecksPerYear, mode)`
  - `fromDisplayAmount(value, paychecksPerYear, mode)`

**Why now:** Reduces small arithmetic drift and simplifies components.

**Done Criteria:**
- All display amount conversions route through one shared utility API.

---

### 7. Suggested Leftover Logic
**Priority:** Medium

- [x] Move suggestion formula to `src/utils/paySuggestions.ts`.
- [x] Use it in both SetupWizard and PaySettingsModal.
- [x] Add tests for rounding/minimum-floor behavior.

**Problem:** Same suggestion formula exists in setup and pay settings modal.

**Current duplication evidence:**
- `SetupWizard`
- `PaySettingsModal`

**Refactor target:**
- Add `src/utils/paySuggestions.ts`:
  **Done Criteria:**
  - Setup and modal produce identical suggestion values for the same inputs.
  - `getSuggestedLeftoverPerPaycheck(grossPerPaycheck)`
  - `formatSuggestedLeftover(...)` if needed

---

### 8. Split And Rename `auth.ts` Types
**Priority:** Medium

- [x] Break `src/types/auth.ts` into smaller domain-focused type files.
- [x] Replace the misleading `auth.ts` entry point with a narrow compatibility barrel during migration.
- [x] Update imports so active app code no longer keeps expanding the old catch-all file.

**Problem:** `src/types/auth.ts` has become a catch-all type file for the entire app, and the name no longer matches the domain.

**Current duplication / maintenance evidence:**
- Unrelated budget, account, tax, loan, tab, and settings types all live in one file.
- New shared services and components continue importing from `auth.ts`, increasing coupling and search noise.
- The filename suggests authentication concerns even though this app does not have an auth domain.

**Refactor target:**
- Split `src/types/auth.ts` into clearer modules such as:
  - `src/types/budget.ts`
  - `src/types/accounts.ts`
  - `src/types/payroll.ts`
  - `src/types/settings.ts`
  - `src/types/tabs.ts`
- Optionally keep a temporary barrel during migration if needed, but the end state should avoid `auth.ts` as the main import surface.

**Why here:** This is foundational cleanup for Phase 2 and later shared-service work, because type sprawl will otherwise keep leaking into every new abstraction.

**Done Criteria:**
- New code no longer imports app domain types from `src/types/auth.ts`.
- Domain types are grouped into smaller files with clearer names.
- Any compatibility barrel is temporary and no longer the default import target.

---

### 9. Budget Currency Conversion as Service
**Priority:** Medium

- [x] Move `convertBudgetAmounts` + rounding logic from `PaySettingsModal` to `src/services/budgetCurrencyConversion.ts`.
- [x] Add tests covering major numeric fields and excluded percentage fields.

**Problem:** Deep budget amount conversion currently lives in component-level modal logic.

**Current duplication evidence:**
- `PaySettingsModal` (`convertBudgetAmounts`)

**Refactor target:**
- Add `src/services/budgetCurrencyConversion.ts`:
  **Done Criteria:**
  - Component only orchestrates UI; conversion logic lives in service with tests.
  - `convertBudgetAmounts(data, rate)`
  - `roundCurrency` helper

---

### 10. Account Grouping and Totals Helpers
**Priority:** Medium

- [x] Add `src/utils/accountGrouping.ts` helpers for repeated reducers/grouping.
- [x] Migrate Bills/Loans/Savings grouping and subtotal logic to shared helpers.

**Problem:** Multiple account-grouping reducers and subtotal patterns exist in managers.

**Current duplication evidence:**
- `BillsManager`, `LoansManager`, `SavingsManager`

**Refactor target:**
- Add `src/utils/accountGrouping.ts`:
  **Done Criteria:**
  - Manager components use shared grouping functions for account-based list construction.
  - `groupByAccountId`
  - `buildAccountRows`
  - `sumByFrequency`

---

### 11. Shared `ViewMode` Type
**Priority:** Medium-Low

- [x] Add `src/types/viewMode.ts`.
- [x] Replace local `'paycheck' | 'monthly' | 'yearly'` declarations with imported type.

**Problem:** `'paycheck' | 'monthly' | 'yearly'` is redeclared in many places.

**Refactor target:**
- Add `src/types/viewMode.ts` and import everywhere.

**Done Criteria:**
- No local re-declarations of `ViewMode` union remain in components.

---

### 12. Encryption Setup Flow Consolidation
**Priority:** Medium-Low

- [x] Extract reusable encryption setup/save behavior into service/hook.
- [x] Remove duplicated key validation/saving code across SetupWizard, EncryptionSetup, PlanDashboard.

**Problem:** Encryption setup/save behavior is distributed across SetupWizard, EncryptionSetup, and PlanDashboard handlers.

**Refactor target:**
- Add `src/services/encryptionSetupService.ts` or `useEncryptionSetupFlow(planId)`.

**Done Criteria:**
- One flow controls key generation, validation, save, and error messaging.

---

### 13. Shared Path Display Styling Utility
**Priority:** Low

- [x] Create one shared CSS utility/class for relink path/code blocks.
- [x] Replace duplicated modal path classes in Welcome and PlanDashboard.

**Problem:** Similar relink modal path styling classes exist in multiple component CSS files.

**Refactor target:**
- Add one shared utility class for code/path blocks in a shared stylesheet.

**Done Criteria:**
- Path display styling is defined once and reused.

---

### 14. Remove/Archive Backup and Unused Artifacts
**Priority:** Low (Hygiene)

- [x] Remove or archive `*.backup` files outside `src`.
- [x] Confirm whether `BenefitsManager` is intentionally unused; either wire it or remove it.
- [x] Ensure search/indexing and maintenance docs no longer reference stale backups.

**Problem:** `*.backup` files and likely unused component artifacts increase confusion.

**Current candidates:**
- `src/components/BenefitsManager/*.backup`
- `src/components/LoansManager/*.backup`
- `src/components/_shared/Button/*.backup`

**Refactor target:**
- Remove from active tree (or move to an archive folder outside `src`).

**Done Criteria:**
- Active source tree has no backup artifacts that can be confused with runtime code.

## Phased Execution Plan

### Phase 1 (Low Risk, High ROI)
- [x] Shared file-path utils (`filePath.ts`)
- [x] Shared `ViewMode` type
- [x] Suggested leftover utility
- [x] Display amount utility

### Phase 2 (Core correctness)
- [x] `budgetCalculations` service
- [x] Migrate `PayBreakdown`, `KeyMetrics`, `pdfExport`, and context calculations to shared engine
- [x] Add regression tests for parity across all consumers
- [x] Split and rename `src/types/auth.ts` into domain type modules

### Phase 3 (Workflow consistency)
- [x] File relink hook/service extraction
- [x] Dialog strategy (`ConfirmDialog`/`ErrorDialog`)
- [x] Replace high-impact `alert`/`confirm` usage

### Phase 4 (Form architecture)
- [x] Manager CRUD hooks
- [x] Account grouping helpers

### Phase 5 (Cleanup)
- [x] Currency conversion service extraction
- [x] CSS/path styling utility extraction
- [x] Remove backup artifacts
- [x] Rename 'shared' directory under 'components' to '_shared' and adjust imports as necessary
- [x] Reorganize the `components` directory to group related components together: tab-driven plan views under `tabViews`, separate non-plan windows under `views`, and `_shared` components into more intuitive subgroups.
- [x] Extract any reused constants to a new `src/constants` directory, split out by files that make sense, and update imports

## Test Strategy Requirements
- [x] Any changed existing `src/services` or `src/utils` module includes updated tests.
- [x] Any new `src/services/*.ts` or `src/utils/*.ts` module includes a matching `*.test.ts`.
- [x] Parity tests added where math is migrated from components/context to shared service.

## Success Metrics
- [x] Reduced duplicated logic blocks in manager/components/services.
- [x] Financial outputs match across UI and PDF export for the same input data.
- [x] Fewer direct `alert`/`confirm` calls in app components.
- [x] All new/refactored services/utils covered by unit tests.
