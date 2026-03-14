# Styles Refactor Plan

## Overview

Analysis of all 47 CSS files across the codebase, covering `src/index.css`, `src/App.css`, and all component-level stylesheets. The primary issues are:

- **Global class name collisions** — broadly-scoped class names like `.btn`, `.form-group`, and `.empty-state` are redefined in multiple component files, shadowing the canonical shared components.
- **Duplicate logic** — identical or near-identical rule blocks appear verbatim across 2–6 unrelated files.
- **Scattered utility tokens** — repeating values (e.g. the `field-error` validation state, the monospace font stack) have no canonical home and are re-typed everywhere.
- **Bypassed shared components** — `AboutModal` implements its own overlay/modal structure instead of using the shared `Modal` component.
- **No directory-level stylesheets** — `tabViews/`, `modals/`, and `views/` each have a repeated structural baseline that could be consolidated into one import per directory.

---

## Inventory of Findings

### A. Global CSS Collision Hazards

These class names are defined in dedicated shared components (`Button.css`, `FormGroup.css`) **and** also re-defined freely in multiple component-scoped files. Because CSS is globally scoped in this Vite/React setup, load order determines which rule wins. Any shuffle in import order can silently break appearance.

| Class(es) | Canonical file | Also defined in |
|---|---|---|
| `.btn`, `.btn-primary`, `.btn-secondary` | `_shared/controls/Button/Button.css` | `WelcomeScreen.css`, `BillsManager.css`, `AboutModal.css` |
| `.btn-icon` | `_shared/controls/Button/Button.css` | `BillsManager.css` (separate definition, slightly different padding) |
| `.form-group`, `.form-group label`, `.form-group input`, `.form-group select` | `_shared/controls/FormGroup/FormGroup.css` | `SetupWizard.css`, `WelcomeScreen.css`, `BillsManager.css` |
| `.button-group` | Not defined in shared, but collides between | `WelcomeScreen.css`, `EncryptionSetup.css` (different `margin-top` values) |

### B. `.field-error` — No Canonical Home

The rule `.field-error { border-color: var(--error-color) !important; }` appears identically in **six** component files with no shared definition. `ExportModal.css` uses a stale variant referencing `--error-border` (an undefined variable):

| File | Note |
|---|---|
| `BillsManager.css` | Correct |
| `SavingsManager.css` | Correct |
| `TaxBreakdown.css` | Correct |
| `PaySettingsModal.css` | Correct |
| `LoansManager.css` | Correct, also extends to `.input-with-prefix input.field-error` |
| `ExportModal.css` | Uses `--error-border` (undefined variable — broken in dark mode) |

### C. AccountsModal.css Duplicates AccountsEditor.css

`AccountsModal.css` and `AccountsEditor.css` are **near-identical files**. The modal wraps the `AccountsEditor` component, so it already inherits its classes. The modal CSS re-duplicates 80%+ of the editor CSS, including `.add-account-section`, `.add-account-row`, `.add-account-field`, `.account-item`, `.account-item:hover`, `.account-name-display`, `.account-icon-display`, `.account-info-text`, `.account-edit-form`, and all focus ring rules.

### D. TabView Root Container — Repeated in 6 Files

Every tabView uses the same root layout block verbatim:

```css
.bills-manager { /* also loans-manager, savings-manager, pay-breakdown, tax-breakdown, key-metrics */
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  overflow-y: auto;
  height: 100%;
}
```

Six separate class names with identical declarations. Only the selector name differs.

### E. Full-Screen Gradient View Card — Repeated in 2 Files

`WelcomeScreen.css` and `EncryptionSetup.css` both define a full-screen gradient wrapper + centered white card:

| Property | `WelcomeScreen.css` | `EncryptionSetup.css` |
|---|---|---|
| Root display layout | `flex, center, 100vh, gradient bg` | Same |
| Card class | `.welcome-card` | `.setup-card` |
| Card `border-radius` | `1rem` | `1rem` |
| Card `padding` | `clamp(1rem, 3vw, 2rem)` | `clamp(1rem, 3vw, 2rem)` |
| Card `max-width` | `900px` | `900px` |
| Card `box-shadow` | `0 20px 60px rgba(0,0,0,0.3)` | Same |
| Card `max-height` / `overflow-y` | `90vh / auto` | Same |

`SetupWizard.css` has a similar root with `max-width: 700px` — close enough to share a base.

### F. Account-Section with Gradient Header — 2 Files

Both `BillsManager.css` and `LoansManager.css` define an `.account-section` card with `.account-header` using `var(--header-gradient)`:

```css
/* Duplicated in both files */
.account-section {
  background: var(--bg-primary);
  border-radius: 12px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
  overflow: hidden;
}
.account-header {
  background: var(--header-gradient);
  color: white;
  padding: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

### G. `.empty-state` / `.empty-icon` — No Shared Definition

An empty state card pattern recurs across `BillsManager.css`, `SavingsManager.css`, and `LoansManager.css`. All three define `.empty-state`, `.empty-icon`, and related children with similar or identical rules and no shared canonical version. Each uses slightly different dashed-border vs solid-border variations.

### H. Badge/Tag Pattern — Scattered Across 7+ Files

The pill-badge shape is repeated across many files with no shared base class:

| Class | File | Notes |
|---|---|---|
| `.account-type-badge` | `SetupWizard.css` | Rounded, `bg-tertiary`, `text-secondary` |
| `.account-type` | `AccountsEditor.css`, `AccountsModal.css` | Same visual intent |
| `.loan-type-badge` | `LoansManager.css` | `border-radius: 999px` |
| `.savings-type-badge`, `.savings-account-badge`, `.retirement-type-badge` | `SavingsManager.css` | Multiple color variants |
| `.benefit-tax-badge` | `BillsManager.css` | Pre/post tax variants |
| `.glossary-badge` | `GlossaryModal.css` | Accent-tinted |

All share `border-radius: 999px`, `padding: 0.2rem 0.5rem`, `font-size: 0.72–0.85rem`, `font-weight: 600`.

### I. Tax Line Editor — Duplicated Between TaxBreakdown and SetupWizard

The tax line row editor UI (header grid layout, input styling, error display) is defined in both `TaxBreakdown.css` and `SetupWizard.css` separately, with slightly different class name prefixes (`tax-line-*` vs `setup-tax-line-*`) but near-identical structure.

### J. AboutModal Bypasses Shared Modal Component

`AboutModal.css` defines `.about-overlay` (a full-screen overlay with `position: fixed`, `z-index: 1000`, `rgba(0,0,0,0.5)` backdrop, `flex` centering) which is structurally identical to `.modal-overlay` in `Modal.css`. The `AboutModal` component does not use the shared `Modal` wrapper component.

### K. Monospace Font Stack Not a CSS Variable

The same monospace font stack appears hardcoded in 3 places:

```css
font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;  /* TaxBreakdown.css */
font-family: 'SF Mono', 'Monaco', 'Cascadia Mono', 'Segoe UI Mono', Consolas, monospace; /* sharedPathDisplay.css */
font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace; /* KeyboardShortcutsModal.css */
```

All three are inconsistent. No `--font-mono` CSS variable exists in `index.css`.

### L. `.form-row` Two-Column Grid — 4 Files

The standard two-column form row grid:
```css
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
```
Appears in `BillsManager.css`, `SavingsManager.css`, `SetupWizard.css`, and `WelcomeScreen.css` with no shared definition.

### M. Leftover Suggestion Banner — 2 Files

The "suggested leftover" hint banner with accent-tinted border and background appears almost identically in both `SetupWizard.css` (`.setup-leftover-suggestion`) and `PaySettingsModal.css` (`.pay-settings-leftover-suggestion`). Both render the same component for the same purpose.

---

## Checklist of Work

### Phase 1 — Stop the Bleeding: Remove Collision-Risk Duplicate Globals

Goal: Eliminate re-definitions of shared component classes from component-local CSS. These are the highest-risk items because they can silently break styling as import order changes.

- [ ] **1.1** Remove `.btn`, `.btn-primary`, `.btn-secondary` from `WelcomeScreen.css` — those screens already use the `Button` shared component. Replace `<button className="btn btn-primary">` style JSX with `<Button variant="primary">` where not already done.
- [ ] **1.2** Remove `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-icon` from `BillsManager.css` — same reason.
- [ ] **1.3** Remove `.btn`, `.btn-primary` from `AboutModal.css` — same reason.
- [ ] **1.4** Remove `.form-group` block from `SetupWizard.css` — `SetupWizard` already imports `FormGroup` from `_shared`. Confirm all form fields use `<FormGroup>` and remove the duplicated CSS rules.
- [ ] **1.5** Remove `.form-group` block from `WelcomeScreen.css` — same.
- [ ] **1.6** Remove `.form-group` block from `BillsManager.css` — same.

### Phase 2 — Canonical `.field-error` and Validation State

Goal: Give validated input error state a single canonical definition.

- [ ] **2.1** Add `.field-error { border-color: var(--error-color) !important; }` to `FormGroup.css` so it lives alongside the form input definitions.
- [ ] **2.2** Remove the `.field-error` rule from `BillsManager.css`, `SavingsManager.css`, `TaxBreakdown.css`, `PaySettingsModal.css`, `LoansManager.css`.
- [ ] **2.3** Fix `ExportModal.css` `.field-error` and `.export-error` to use `var(--error-color)` / `var(--alert-error-bg)` / `var(--alert-error-border)` / `var(--alert-error-text)` instead of the undefined `--error-bg`, `--error-border`, `--error-text` variables.

### Phase 3 — Consolidate AccountsModal.css into AccountsEditor.css

Goal: The modal wraps the editor — it should not duplicate the editor's CSS.

- [ ] **3.1** Audit which rules in `AccountsModal.css` are actually unique to the modal container (the `.accounts-manager` max-width/height wrapper). Keep only those.
- [ ] **3.2** Delete all rules from `AccountsModal.css` that duplicate `AccountsEditor.css` (`.add-account-*`, `.account-item`, `.account-*`, `.account-edit-form`, etc.).
- [ ] **3.3** Rename `.accounts-manager` in `AccountsModal.css` to `.accounts-modal` to give it a clear non-colliding name scoped to the modal wrapper.

### Phase 4 — TabView Shared Baseline

Goal: One shared class defines the tabView layout contract; each component only overrides what differs.

- [ ] **4.1** Create `src/components/tabViews/tabViews.shared.css` with a `.tab-view` class:
  ```css
  .tab-view {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1.5rem;
    overflow-y: auto;
    height: 100%;
  }
  @media (max-width: 768px) {
    .tab-view { padding: 1rem; }
  }
  ```
- [ ] **4.2** Each tabView root (`.bills-manager`, `.loans-manager`, `.savings-manager`, `.pay-breakdown`, `.tax-breakdown`, `.key-metrics`) replaces its container declarations with `@extend` equivalent (add `tab-view` class in JSX and remove the duplicated CSS, keeping only component-specific overrides).
- [ ] **4.3** Remove the now-redundant `@media (max-width: 768px) { .bills-manager { padding: 1rem; } }` blocks from each tabView CSS (they are all the same).

### Phase 5 — Shared Account-Section Card with Gradient Header

Goal: Bills and Loans managers share the same grouped-account card structure. Extract it.

- [ ] **5.1** Add `.account-section`, `.account-header`, `.account-info`, `.account-icon`, `.account-total`, `.total-label`, `.total-amount`, `.no-bills-message`-equivalent empty list message to `tabViews/tabViews.shared.css` (or a dedicated `tabViews/accountSection.shared.css`).
- [ ] **5.2** Remove those rules from `BillsManager.css` and `LoansManager.css`, keeping only the selectors that differ between the two.

### Phase 6 — Extract `.empty-state` to a Shared Utility

Goal: One canonical empty state pattern importable by all list views.

- [ ] **6.1** Add `.empty-state`, `.empty-icon`, `.empty-state h3`, `.empty-state p`, `.empty-state-actions` to `tabViews/tabViews.shared.css`. Reconcile the dashed-border variant into a modifier class (`.empty-state--dashed`).
- [ ] **6.2** Remove the duplicate rules from `BillsManager.css`, `LoansManager.css`, and `SavingsManager.css`.

### Phase 7 — Shared Views Baseline (Full-Screen Gradient Card)

Goal: WelcomeScreen and EncryptionSetup share an identical full-screen layout pattern.

- [ ] **7.1** Create `src/components/views/views.shared.css` with:
  ```css
  .view-screen { /* shared full-screen gradient wrapper */ }
  .view-screen-card { /* shared centered card */ }
  ```
  Values come from the common denominator between `WelcomeScreen.css` and `EncryptionSetup.css`.
- [ ] **7.2** Update `WelcomeScreen.css`: add `view-screen` / `view-screen-card` classes in JSX; only keep `welcome-screen`/`welcome-card` overrides for what is unique (e.g. `max-width: 900px`).
- [ ] **7.3** Update `EncryptionSetup.css` the same way.
- [ ] **7.4** Assess `SetupWizard.css` — share the wrapper background/centering pattern, keep `wizard-container` (different `max-width: 700px`, different internal header structure).

### Phase 8 — Add `--font-mono` CSS Variable

Goal: Consistent monospace stack across all code/key/path display elements.

- [ ] **8.1** Add `--font-mono: 'SF Mono', 'Monaco', 'Cascadia Mono', 'Menlo', 'Consolas', monospace;` to `:root` in `src/index.css`.
- [ ] **8.2** Update `sharedPathDisplay.css`, `TaxBreakdown.css` (`.summary-row .amount`), and `KeyboardShortcutsModal.css` (`.keyboard-shortcuts-key`) to use `var(--font-mono)`.

### Phase 9 — `.button-group` Canonical Definition

Goal: The flex row of action buttons at the bottom of views/panels should have one definition.

- [ ] **9.1** Define `.button-group` in a shared location — best candidate is `_shared/layout/StickyActions/StickyActions.css` or a new utility block in `_shared/index.css` (or add it to `FormGroup.css` since it follows form fields).
- [ ] **9.2** Reconcile the two existing usages: `WelcomeScreen.css` (`.button-group { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }`) and `EncryptionSetup.css` (same with added `margin-top: 2rem`). Make `margin-top` an override, not part of the base.
- [ ] **9.3** Remove local `.button-group` definitions from both files.

### Phase 10 — Extract Badge Base Class

Goal: All pill/tag badges share the same geometric base; colors should be modifiers.

- [ ] **10.1** Add a `.badge` utility class to `_shared` (best in a new `_shared/utilities.css` or appended to `index.css`):
  ```css
  .badge {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 0.2rem 0.55rem;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  ```
- [ ] **10.2** Update `BillsManager.css`, `SavingsManager.css`, `LoansManager.css`, `SetupWizard.css`, `AccountsEditor.css` to use `.badge` as a base and keep only color-modifier overrides locally.

### Phase 11 — Fix AboutModal: Use Shared Modal Component

Goal: Remove the handrolled overlay from `AboutModal`.

- [ ] **11.1** Refactor `AboutModal.tsx` to render its content inside the shared `<Modal>` component.
- [ ] **11.2** Delete `about-overlay`, `about-modal`, `about-header`, `about-close` from `AboutModal.css` — those are provided by `Modal.css` now.
- [ ] **11.3** Keep `about-content`, `about-intro`, `about-feature`, `about-version`, `about-footer`-specific styles.

### Phase 12 — Consolidate Leftover Suggestion Banner

Goal: The nudge banner that suggests a leftover amount is identical in `SetupWizard` and `PaySettingsModal`.

- [ ] **12.1** Extract to a shared class `.leftover-suggestion` in a new or existing shared location (a candidate is `_shared/feedback` or a `modals/modals.shared.css`).
- [ ] **12.2** Remove `.setup-leftover-suggestion` from `SetupWizard.css` and `.pay-settings-leftover-suggestion` from `PaySettingsModal.css`.

### Phase 13 — Consolidate Tax Line Editor CSS

Goal: The tax line row editor pattern is duplicated between `TaxBreakdown.css` and `SetupWizard.css`.

- [ ] **13.1** The `TaxBreakdown` view is the canonical home for tax line editing. Move the shared structural rules to `TaxBreakdown.css` or a `tabViews/taxLines.shared.css` if used from a modal.
- [ ] **13.2** Remove the `setup-tax-line-*` rules from `SetupWizard.css` in favor of the canonical `.tax-line-*` class names, and update the JSX class names accordingly.

---

## Success Metrics

- [ ] No component-level CSS file redefines `.btn`, `.btn-primary`, `.btn-secondary`, `.form-group`, or any other class already defined and exported from `_shared`.
- [ ] `.field-error` has exactly one definition in the codebase (in `FormGroup.css`).
- [ ] `AccountsModal.css` contains only the wrapper-specific rules, not editor internals.
- [ ] All six tabView root containers apply `.tab-view` (or equivalent) rather than each duplicating the same 5-property block.
- [ ] `WelcomeScreen.css` and `EncryptionSetup.css` share a `views.shared.css` baseline.
- [ ] `--font-mono` is defined in `:root` and used in all monospace display sites.
- [ ] `AboutModal` renders through the shared `<Modal>` component.
- [ ] No CSS file references an undefined CSS variable (specifically `--error-bg`, `--error-border`, `--error-text` in ExportModal).
- [ ] Running a full-text search for `border-radius: 999px` across badge classes reduces to one canonical `.badge` base with modifier overrides.

---

## Approach Notes

- **Start with Phases 1 and 2** — they have zero visual risk. Removing a duplicate rule that the shared component already provides cannot break appearance; it can only prevent a future collision from breaking it.
- **Phase 3 (AccountsModal/AccountsEditor deduplication) is the largest individual file cleanup.** Do it in a dedicated commit so it is easy to review.
- **Phases 4–6 (tabViews shared baseline)** have the most mechanical work but are very low risk because the extracted rules are structurally identical — only the selector names are changing.
- **Phase 11 (AboutModal → shared Modal)** is the most behaviorally impactful change in this plan because it changes the component hierarchy. Test focus trap, close-on-overlay-click, and keyboard dismiss after the change.
- **Phases 12 and 13** are polish — defer them if earlier phases surface anything unexpected.
- For each phase: run `npm run lint`, `npm run test:run`, and `npm run build` before moving to the next.
