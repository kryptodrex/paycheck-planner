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

- [ ] Implement `src/services/budgetCalculations.ts` as the single source of truth for paycheck/tax/net/allocation math.
- [ ] Migrate `BudgetContext.calculatePaycheckBreakdown` to use shared functions.
- [ ] Migrate `PayBreakdown`, `KeyMetrics`, and `pdfExport` to use the same shared functions.
- [ ] Add parity tests proving all consumers return identical numbers for the same fixture.

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

- [ ] Extract shared relink state/decision logic to `src/hooks/useFileRelinkFlow.ts` (or equivalent service + hook).
- [ ] Keep Welcome and PlanDashboard modal UIs, but wire both to the shared flow.
- [ ] Ensure cancel behavior is identical across entry points (clear stale path policy, no stale saves).
- [ ] Add tests for `success`, `cancelled`, `mismatch`, and `invalid` paths.

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

- [ ] Create `src/utils/filePath.ts` for all filename/path parsing.
- [ ] Replace all ad-hoc basename/split logic in `BudgetContext` and `FileStorageService`.
- [ ] Add unit tests for separators, extensions, whitespace, and empty input edge cases.

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

- [ ] Introduce shared app dialogs (`ConfirmDialog`, `ErrorDialog`) and optional `useAppDialogs` helper.
- [ ] Replace highest-impact `alert`/`confirm` calls first (PlanDashboard, Settings, SetupWizard, Welcome).
- [ ] Standardize button wording (`Cancel`, `Confirm`, `Retry`) and error presentation.

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

- [ ] Extract reusable hooks for modal entity editing and field error state.
- [ ] Migrate at least two manager components first (recommended: Bills + Loans), then expand.
- [ ] Preserve existing UX/validation messages while reducing duplicate handlers.

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

- [ ] Add `src/utils/displayAmounts.ts` and migrate manager-level `toDisplayAmount`/`fromDisplayAmount` helpers.
- [ ] Keep pay frequency + display mode conversion rules centralized.

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

- [ ] Move suggestion formula to `src/utils/paySuggestions.ts`.
- [ ] Use it in both SetupWizard and PaySettingsModal.
- [ ] Add tests for rounding/minimum-floor behavior.

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

### 8. Retirement Yearly Limit/Auto-Calc Math
**Priority:** Medium

- [ ] Extract yearly-limit and auto-calc math to `src/utils/retirementMath.ts`.
- [ ] Replace duplicated logic in SavingsManager and BenefitsManager.
- [ ] Add tests for match/no-match and percentage/amount cap variants.

**Problem:** Similar yearly-limit and auto-calc logic appears in multiple managers.

**Current duplication evidence:**
- `SavingsManager`
- `BenefitsManager`

**Refactor target:**
- Add `src/utils/retirementMath.ts`:
  **Done Criteria:**
  - One shared implementation powers both manager UIs.
  - `calculateYearlyRetirementContribution`
  - `checkYearlyLimitExceeded`
  - `autoCalculateContributionForYearlyLimit`

---

### 9. Budget Currency Conversion as Service
**Priority:** Medium

- [ ] Move `convertBudgetAmounts` + rounding logic from `PaySettingsModal` to `src/services/budgetCurrencyConversion.ts`.
- [ ] Add tests covering major numeric fields and excluded percentage fields.

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

- [ ] Add `src/utils/accountGrouping.ts` helpers for repeated reducers/grouping.
- [ ] Migrate Bills/Loans/Savings grouping and subtotal logic to shared helpers.

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

- [ ] Add `src/types/viewMode.ts`.
- [ ] Replace local `'paycheck' | 'monthly' | 'yearly'` declarations with imported type.

**Problem:** `'paycheck' | 'monthly' | 'yearly'` is redeclared in many places.

**Refactor target:**
- Add `src/types/viewMode.ts` and import everywhere.

**Done Criteria:**
- No local re-declarations of `ViewMode` union remain in components.

---

### 12. Encryption Setup Flow Consolidation
**Priority:** Medium-Low

- [ ] Extract reusable encryption setup/save behavior into service/hook.
- [ ] Remove duplicated key validation/saving code across SetupWizard, EncryptionSetup, PlanDashboard.

**Problem:** Encryption setup/save behavior is distributed across SetupWizard, EncryptionSetup, and PlanDashboard handlers.

**Refactor target:**
- Add `src/services/encryptionSetupService.ts` or `useEncryptionSetupFlow(planId)`.

**Done Criteria:**
- One flow controls key generation, validation, save, and error messaging.

---

### 13. Shared Path Display Styling Utility
**Priority:** Low

- [ ] Create one shared CSS utility/class for relink path/code blocks.
- [ ] Replace duplicated modal path classes in Welcome and PlanDashboard.

**Problem:** Similar relink modal path styling classes exist in multiple component CSS files.

**Refactor target:**
- Add one shared utility class for code/path blocks in a shared stylesheet.

**Done Criteria:**
- Path display styling is defined once and reused.

---

### 14. Remove/Archive Backup and Unused Artifacts
**Priority:** Low (Hygiene)

- [ ] Remove or archive `*.backup` files outside `src`.
- [ ] Confirm whether `BenefitsManager` is intentionally unused; either wire it or remove it.
- [ ] Ensure search/indexing and maintenance docs no longer reference stale backups.

**Problem:** `*.backup` files and likely unused component artifacts increase confusion.

**Current candidates:**
- `src/components/BenefitsManager/*.backup`
- `src/components/LoansManager/*.backup`
- `src/components/shared/Button/*.backup`

**Refactor target:**
- Remove from active tree (or move to an archive folder outside `src`).

**Done Criteria:**
- Active source tree has no backup artifacts that can be confused with runtime code.

## Phased Execution Plan

### Phase 1 (Low Risk, High ROI)
- [ ] Shared file-path utils (`filePath.ts`)
- [ ] Shared `ViewMode` type
- [ ] Suggested leftover utility
- [ ] Display amount utility

### Phase 2 (Core correctness)
- [ ] `budgetCalculations` service
- [ ] Migrate `PayBreakdown`, `KeyMetrics`, `pdfExport`, and context calculations to shared engine
- [ ] Add regression tests for parity across all consumers

### Phase 3 (Workflow consistency)
- [ ] File relink hook/service extraction
- [ ] Dialog strategy (`ConfirmDialog`/`ErrorDialog`)
- [ ] Replace high-impact `alert`/`confirm` usage

### Phase 4 (Form architecture)
- [ ] Manager CRUD hooks
- [ ] Retirement math extraction
- [ ] Account grouping helpers

### Phase 5 (Cleanup)
- [ ] Currency conversion service extraction
- [ ] CSS/path styling utility extraction
- [ ] Remove backup artifacts

## Test Strategy Requirements
- [ ] Any changed existing `src/services` or `src/utils` module includes updated tests.
- [ ] Any new `src/services/*.ts` or `src/utils/*.ts` module includes a matching `*.test.ts`.
- [ ] Parity tests added where math is migrated from components/context to shared service.

## Success Metrics
- [ ] Reduced duplicated logic blocks in manager/components/services.
- [ ] Financial outputs match across UI and PDF export for the same input data.
- [ ] Fewer direct `alert`/`confirm` calls in app components.
- [ ] All new/refactored services/utils covered by unit tests.
