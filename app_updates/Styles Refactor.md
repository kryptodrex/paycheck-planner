# Styles Refactor Plan

## Goal
Eliminate CSS duplication, fix global class name collisions, and establish canonical shared style patterns — reducing long-term bug risk from load-order-sensitive rule shadowing, centralizing color/surface tokens for future theming, and making the visual language easier to maintain.

## How To Use This File
- Mark an item complete only when its **Done Criteria** are fully met.
- Validate after each phase: `npm run lint`, `npx tsc -b`, `npm run test:run`, and `npm run build` must all pass before moving on.
- Keep each phase scope-limited — do not bundle multiple phases into one PR.
- Prefer extracting repeated visual values into semantic tokens in `src/index.css` rather than adding one-off variables near a component. The target is future theme-editor support, not just local deduplication.
- Phases are ordered by risk and dependency. Phases 1–2 are safe to do in any order; Phases 3–6 depend on Phase 1 being done first; Phases 7–9 are independent of each other; Phases 10–11 are polish and can be deferred.

---

## Prioritized Checklist (Most Important → Least Important)

### 1. Remove Global CSS Collision Hazards
**Priority:** Critical

- [ ] Remove `.btn`, `.btn-primary`, `.btn-secondary` from `WelcomeScreen.css`. Audit the component JSX and confirm all buttons use `<Button variant="...">` from `_shared`. Remove any remaining `<button className="btn ...">` raw elements.
- [ ] Remove `.btn`, `.btn-primary`, `.btn-secondary`, and `.btn-icon` from `BillsManager.css` — same reason.
- [ ] Remove `.btn`, `.btn-primary` from `AboutModal.css` — same reason.
- [ ] Remove the `.form-group` block (label, input, select, focus rules) from `SetupWizard.css`. The component already imports `<FormGroup>` from `_shared`; the local CSS is a latent collision.
- [ ] Remove the `.form-group` block from `WelcomeScreen.css` — same.
- [ ] Remove the `.form-group` block from `BillsManager.css` — same.

**Problem:** Class names already defined in `_shared/controls/Button/Button.css` and `_shared/controls/FormGroup/FormGroup.css` are re-defined in component-local files. Because CSS is globally scoped in this Vite/React setup, load order determines which rule wins — any import order change can silently break appearance.

**Duplication evidence:**
- `.btn`, `.btn-primary`, `.btn-secondary` → `WelcomeScreen.css`, `BillsManager.css`, `AboutModal.css`
- `.btn-icon` → `BillsManager.css` (slightly different padding from canonical)
- `.form-group` and its children → `SetupWizard.css`, `WelcomeScreen.css`, `BillsManager.css`

**Done Criteria:**
- No component-level CSS file redefines `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-icon`, or `.form-group`.
- All button rendering in affected components goes through `<Button>` from `_shared`.
- Visual regression check: app renders correctly after removal (no missing button or input styles).

**Why first:** Zero visual risk — removing a duplicate rule that the canonical component already provides cannot break appearance. Doing this first prevents future silent regressions.

---

### 2. Canonical `.field-error` and Fix Broken `ExportModal` Variables
**Priority:** Critical

- [ ] Add `.field-error { border-color: var(--error-color) !important; }` to `_shared/controls/FormGroup/FormGroup.css` as the single canonical definition.
- [ ] Remove the `.field-error` rule from `BillsManager.css`, `SavingsManager.css`, `TaxBreakdown.css`, `PaySettingsModal.css`, and `LoansManager.css`.
- [ ] Fix `ExportModal.css`: replace `--error-bg`, `--error-border`, `--error-text` (undefined variables) with `var(--alert-error-bg)`, `var(--alert-error-border)`, `var(--alert-error-text)` in both `.field-error` and `.export-error`.

**Problem:** `.field-error` is defined identically in six component files with no shared home. `ExportModal.css` references three CSS variables that do not exist (`--error-bg`, `--error-border`, `--error-text`), causing broken error colors in dark mode.

**Duplication evidence:**
- `.field-error { border-color: var(--error-color) !important; }` in: `BillsManager.css`, `SavingsManager.css`, `TaxBreakdown.css`, `PaySettingsModal.css`, `LoansManager.css`
- `ExportModal.css` uses `var(--error-border)` and `var(--error-bg)` (both undefined)

**Done Criteria:**
- Exactly one definition of `.field-error` exists in the codebase (`FormGroup.css`).
- No CSS file references `--error-bg`, `--error-border`, or `--error-text`.
- Error styling in `ExportModal` renders correctly in both light and dark mode.

**Why second:** The `ExportModal` variable bug is an active visual defect in dark mode. The rest is pure consolidation with no visual risk.

---

### 3. Consolidate `AccountsModal.css` into `AccountsEditor.css`
**Priority:** High

- [ ] Audit `AccountsModal.css` and identify rules that are unique to the modal wrapper (only the `.accounts-manager` max-width/max-height container block).
- [ ] Delete all rules from `AccountsModal.css` that duplicate `AccountsEditor.css` — this includes `.add-account-section`, `.add-account-row`, `.add-account-field`, `.account-item` and its hover/editing states, `.account-name-display`, `.account-icon-display`, `.account-info-text`, `.account-edit-form`, and all focus ring overrides.
- [ ] Rename the modal wrapper class from `.accounts-manager` to `.accounts-modal` in both `AccountsModal.css` and `AccountsModal.tsx` so it has a non-colliding, scope-appropriate name.

**Problem:** `AccountsModal.css` is ~80% a copy of `AccountsEditor.css`. The modal renders `<AccountsEditor>` as a child, so the editor's classes are already in scope — the duplicated rules in the modal file override (and diverge from) the editor's canonical styles.

**Done Criteria:**
- `AccountsModal.css` contains only the modal wrapper sizing rules.
- No class defined in `AccountsEditor.css` appears in `AccountsModal.css`.
- The accounts modal renders and behaves identically to before.

**Why here:** Largest single-file cleanup. Depends on Phase 1 being done (so `.btn` is gone from both files before consolidation).

---

### 4. TabView Shared Baseline
**Priority:** High

- [ ] Create `src/components/tabViews/tabViews.shared.css` defining a `.tab-view` layout class:
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
- [ ] Add `tab-view` to the root element className in `BillsManager.tsx`, `LoansManager.tsx`, `SavingsManager.tsx`, `PayBreakdown.tsx`, `TaxBreakdown.tsx`, and `KeyMetrics.tsx`.
- [ ] Remove the now-redundant root container block (display/flex-direction/gap/padding/overflow/height) from each of those six component CSS files.
- [ ] Remove the now-redundant `@media (max-width: 768px) { .[component] { padding: 1rem; } }` block from each file that has it.

**Problem:** All six tabView components start with an identical 5-property root layout block, each using a different class name. The mobile padding media query is also copy-pasted into every file identically.

**Done Criteria:**
- `tabViews.shared.css` is the sole definition of the tab-view root layout.
- Each tabView JSX root has `className="tab-view [component-name]"` (retains own class for component-specific overrides).
- No media query `padding: 1rem` for the root container remains in any individual tabView CSS.

---

### 5. Extract Shared Account-Section Card and Empty State
**Priority:** High — depends on Phase 4 (`tabViews.shared.css` must exist first)

- [ ] Add `.account-section`, `.account-header`, `.account-info`, `.account-icon`, `.account-total`, `.total-label`, and `.total-amount` to `tabViews/tabViews.shared.css`. Use the common denominator between `BillsManager.css` and `LoansManager.css`.
- [ ] Remove those rules from `BillsManager.css` and `LoansManager.css`. Keep only selectors that are unique to each.
- [ ] Add `.empty-state`, `.empty-icon`, `.empty-state h3`, `.empty-state p`, and `.empty-state-actions` to `tabViews/tabViews.shared.css`. Extract the solid-border variant as the base; add `.empty-state--dashed` modifier for the dashed-border variant used in `LoansManager` and `SavingsManager`.
- [ ] Remove the `.empty-state` / `.empty-icon` blocks from `BillsManager.css`, `LoansManager.css`, and `SavingsManager.css`.

**Problem:** `BillsManager.css` and `LoansManager.css` both define `.account-section` and `.account-header` with a gradient header — structurally identical across both files. All three list-view tabViews also each define their own `.empty-state` with no shared base.

**Done Criteria:**
- `.account-section` and `.account-header` have exactly one definition (`tabViews.shared.css`).
- `.empty-state` has exactly one base definition; dashed variant uses a modifier class.
- Bills, Loans, and Savings empty states render correctly.

---

### 6. Shared Views Baseline (Full-Screen Gradient Card)
**Priority:** Medium

- [ ] Create `src/components/views/views.shared.css` with two classes:
  - `.view-screen` — full-screen flex centering with gradient background (`display: flex`, `align-items/justify-content: center`, `height: 100vh`, `background: var(--header-gradient)`, `padding: 1rem`, `overflow: hidden`)
  - `.view-screen-card` — centered card (`background: var(--bg-primary)`, `border-radius: 1rem`, `padding: clamp(1rem, 3vw, 2rem)`, `max-height: 90vh`, `overflow-y: auto`, `box-shadow: 0 20px 60px rgba(0,0,0,0.3)`, `width: 100%`)
- [ ] Update `WelcomeScreen.tsx` root div to use `view-screen` and its card to use `view-screen-card`. Keep `welcome-screen` / `welcome-card` classes for component-specific overrides (e.g. `max-width: 900px`, `flex-direction: column`).
- [ ] Update `EncryptionSetup.tsx` the same way. Keep `encryption-setup` / `setup-card` for its overrides.
- [ ] Update `SetupWizard.tsx` to use `view-screen` for the wrapper. Keep `wizard-container` for its narrower card (`max-width: 700px`) and distinct internal layout.
- [ ] Remove the duplicated wrapper/card layout declarations from `WelcomeScreen.css`, `EncryptionSetup.css`, and `SetupWizard.css`, keeping only what differs from the shared base.

**Problem:** `WelcomeScreen.css` and `EncryptionSetup.css` define identical full-screen centered gradient wrappers and cards (same padding, border-radius, box-shadow, max-height). `SetupWizard.css` shares the gradient wrapper pattern.

**Done Criteria:**
- `views.shared.css` defines the shared wrapper and card base.
- Each view file contains only its layout overrides and component-specific content styles.
- All three screens render correctly across light/dark themes.

---

### 7. Extract Hard-Coded Color and Surface Tokens
**Priority:** Medium

- [ ] Audit the codebase for repeated hard-coded `rgb()`, `rgba()`, and hex values used for color, background, border, shadow tint, and overlay treatments. Group them by semantic purpose rather than exact literal value.
- [ ] Add semantic CSS variables to `src/index.css` for reused values such as overlays, elevated surface borders, muted backgrounds, card shadows, gradient stops, and accent-tinted backgrounds. Prefer names like `--overlay-backdrop`, `--surface-muted`, `--surface-accent-subtle`, `--shadow-color-strong`, and `--gradient-hero-start/end` rather than component-specific names.
- [ ] Replace repeated hard-coded literals across component CSS with the new variables. Start with values reused in 2+ places or values likely to vary by light/dark/custom theme.
- [ ] Leave truly one-off decorative values alone unless they are part of a broader semantic system. The goal is not zero literals everywhere; it is removing reused theme-relevant values from component files.
- [ ] Document any intentionally deferred literals that should become tokens later only if a second usage appears.

**Problem:** Reused hard-coded colors, backgrounds, overlays, and shadow tints make theme changes expensive because each new theme requires hunting literals across component files. That works against the long-term goal of a user-facing theme editor with custom light and dark color schemes.

**Duplication evidence:**
- Repeated `rgba(0, 0, 0, 0.3)` / `rgba(0, 0, 0, 0.5)` style overlays and shadows across modal/view wrappers
- Repeated hard-coded tint values in badges, alerts, and empty-state treatments that should resolve through semantic theme variables
- Existing shared tokens already live in `src/index.css`, so additional repeated visual values belong there as part of the same system

**Done Criteria:**
- Reused theme-relevant hard-coded color/background/border/shadow literals are replaced with semantic variables in `src/index.css`.
- Component CSS primarily references semantic variables for shared visual treatments instead of repeating raw `rgb()`, `rgba()`, or hex values.
- The variable names are theme-oriented and reusable, not tied to one component.

**Why here:** This is foundational for the future custom theme editor, but it is safer after the first structural CSS cleanup phases. Once shared patterns are extracted, tokenization becomes more obvious and less noisy.

---

### 8. Add `--font-mono` CSS Variable
**Priority:** Medium

- [ ] Add `--font-mono: 'SF Mono', 'Monaco', 'Cascadia Mono', 'Menlo', 'Consolas', monospace;` to `:root` in `src/index.css`.
- [ ] Update `_shared/sharedPathDisplay.css` to use `font-family: var(--font-mono)`.
- [ ] Update `TaxBreakdown.css` (`.summary-row .amount` and `.settings-row .value`) to use `font-family: var(--font-mono)`.
- [ ] Update `KeyboardShortcutsModal.css` (`.keyboard-shortcuts-key`) to use `font-family: var(--font-mono)`.

**Problem:** Three different, inconsistent monospace font stacks are hardcoded across three files. No `--font-mono` token exists in the design system.

**Done Criteria:**
- `--font-mono` is defined once in `:root`.
- No hardcoded monospace `font-family` string remains in any component CSS.

---

### 9. Canonical `.button-group` Definition
**Priority:** Medium

- [ ] Add `.button-group { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }` to `_shared/controls/FormGroup/FormGroup.css` (or `StickyActions.css` if a better fit after review).
- [ ] Remove the `.button-group` definition from `WelcomeScreen.css`.
- [ ] Remove the `.button-group` definition from `EncryptionSetup.css`. Move the `margin-top: 2rem` override to a local rule scoped under `.encryption-setup .button-group` rather than redefining the whole block.

**Problem:** `.button-group` is defined independently in `WelcomeScreen.css` and `EncryptionSetup.css` with slightly different values (`margin-top`), causing inconsistency. It has no canonical home.

**Done Criteria:**
- Exactly one base definition of `.button-group` in the codebase.
- `EncryptionSetup` retains its `margin-top` via a scoped override, not a full redefinition.

---

### 10. Fix `AboutModal`: Use Shared `<Modal>` Component
**Priority:** Medium

- [ ] Refactor `AboutModal.tsx` to render its content inside the shared `<Modal>` component instead of the handrolled overlay.
- [ ] Remove `.about-overlay`, `.about-modal`, `.about-header`, and `.about-close` from `AboutModal.css` — these are now provided by `Modal.css`.
- [ ] Retain `.about-content`, `.about-intro`, `.about-feature`, `.about-feature-icon`, `.about-feature-content`, `.about-version`, and `.about-footer` in `AboutModal.css` for the component-specific content styles.
- [ ] Verify: focus trap, Escape-to-close, and close-on-overlay-click all work through the shared `Modal` after the change.

**Problem:** `AboutModal.css` defines `.about-overlay` — a full-screen fixed overlay with backdrop and flex centering — which is structurally identical to `.modal-overlay` in `Modal.css`. The `AboutModal` component bypasses the shared `<Modal>` component entirely.

**Done Criteria:**
- `AboutModal.tsx` uses `<Modal>` from `_shared`.
- No `.about-overlay` or `.about-modal` class exists in the codebase.
- Focus trap, Escape dismiss, and overlay-click dismiss work correctly.

**Why here:** Most behaviorally impactful CSS change in this plan — it modifies component structure, not just styles. Do in its own PR. Test keyboard and mouse dismiss paths after.

---

### 11. Extract Badge Base Class
**Priority:** Low

- [ ] Add a `.badge` base utility class to `src/index.css` (or a new `_shared/utilities.css`):
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
- [ ] Update `BillsManager.css` (`.benefit-tax-badge`), `SavingsManager.css` (`.savings-type-badge`, `.savings-account-badge`, `.retirement-type-badge`), `LoansManager.css` (`.loan-type-badge`), `SetupWizard.css` (`.account-type-badge`), and `AccountsEditor.css` (`.account-type`) to add `.badge` in their JSX and remove the repeated geometry declarations, keeping only color/background modifiers locally.

**Problem:** The pill-badge shape (`border-radius: 999px`, small padding, small bold font) is copy-pasted across 7+ component files with no shared base class.

**Done Criteria:**
- `.badge` is defined once.
- Each badge variant only specifies its color/background, not the shared geometry.

---

### 12. Consolidate Duplicated Editor CSS (Tax Lines and Leftover Banner)
**Priority:** Low

- [ ] Align the tax line row editor class names: update `SetupWizard.tsx` to use the canonical `.tax-line-*` class names from `TaxBreakdown.css` (replace `.setup-tax-line-*` prefixes). Remove the duplicated `setup-tax-line-*` rules from `SetupWizard.css`.
- [ ] Extract the leftover suggestion banner to a shared class `.leftover-suggestion` and `.leftover-suggestion-copy` in a suitable shared location (candidate: `_shared/feedback/` or a new `modals/modals.shared.css`). Remove `.setup-leftover-suggestion` from `SetupWizard.css` and `.pay-settings-leftover-suggestion` from `PaySettingsModal.css`.

**Problem:** The tax line editor grid layout is defined twice with different prefixes (`tax-line-*` in `TaxBreakdown.css`, `setup-tax-line-*` in `SetupWizard.css`). The leftover suggestion banner is defined nearly identically in two files for the same UI element.

**Done Criteria:**
- Tax line editor uses one class name set across `TaxBreakdown` and `SetupWizard`.
- Leftover suggestion banner has one shared class definition.
- Both tax editing screens render correctly.

---

## Success Metrics

- [ ] No component-level CSS file redefines `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-icon`, or `.form-group`.
- [ ] `.field-error` has exactly one definition in the codebase (`FormGroup.css`).
- [ ] No CSS file references an undefined CSS variable (`--error-bg`, `--error-border`, `--error-text`).
- [ ] `AccountsModal.css` contains only the modal wrapper sizing rules — no editor internals.
- [ ] All six tabView root containers use a shared `.tab-view` class instead of duplicating the layout block.
- [ ] `WelcomeScreen.css`, `EncryptionSetup.css`, and `SetupWizard.css` share a `views.shared.css` wrapper baseline.
- [ ] Reused theme-relevant color, background, border, overlay, and shadow literals are defined through semantic variables in `src/index.css` instead of being repeated across component CSS.
- [ ] `--font-mono` is defined in `:root` and used everywhere a monospace font stack appears.
- [ ] `AboutModal` renders through the shared `<Modal>` component with full keyboard and overlay dismiss behavior.
- [ ] `.badge` is defined once; badge variants only specify color/background overrides.
