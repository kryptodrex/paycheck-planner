# Implementation Notes

## Feedback System via GitHub Issues (Private Repo)

### **Goal**
Submit in-app feedback directly to the private GitHub repository as Issues (without exposing auth tokens in the desktop app).

### **Why this approach**
- The repo is private, so unauthenticated URL-based issue creation is not viable.
- A secure server-side/API intermediary is required to hold credentials and call GitHub.
- Tokens must never be embedded in renderer code, preload code, or shipped desktop binaries.

### **Recommended Architecture**

```
Electron app (Feedback modal)
  -> POST /feedback (serverless endpoint)
      -> GitHub Issues API (authenticated)
          -> Create issue in private repo
```

### **What you need (and where to get it)**

1. **GitHub repository coordinates**
- `owner` and `repo` name
- Source: existing GitHub project settings

2. **Authentication credential (choose one)**
- **Option A (fastest): Fine-grained Personal Access Token**
  - Scope/permission needed: `Issues: Read and write` on the target private repo
  - Create at: GitHub Settings -> Developer settings -> Personal access tokens -> Fine-grained tokens
- **Option B (recommended long-term): GitHub App**
  - Permission: Repository Issues (Read/Write)
  - Create at: GitHub Settings -> Developer settings -> GitHub Apps
  - Better rotation/governance than PAT

3. **Serverless/API host**
- Vercel Functions, Netlify Functions, or Cloudflare Workers
- Needed to securely store token as environment secret and proxy requests

4. **Environment secrets**
- `GITHUB_TOKEN` (if PAT flow) or GitHub App credentials
- `GITHUB_OWNER`
- `GITHUB_REPO`
- Optional: `FEEDBACK_SHARED_SECRET` (to reject unauthorized posts)

5. **Optional attachments storage**
- If screenshot upload should be fully automatic, use object storage (S3/R2/Supabase Storage)
- Include uploaded image URL in issue body

### **API Contract (App -> Backend)**

Suggested request payload:

```json
{
  "category": "bug|feature|ui|performance|other",
  "subject": "string",
  "message": "string",
  "email": "optional string",
  "includeDiagnostics": true,
  "diagnostics": {
    "appVersion": "1.0.0",
    "activeTab": "breakdown",
    "platform": "..."
  },
  "screenshot": {
    "fileName": "optional",
    "dataUrl": "optional base64"
  }
}
```

Suggested response:

```json
{
  "success": true,
  "issueNumber": 123,
  "issueUrl": "https://github.com/<owner>/<repo>/issues/123"
}
```

### **Issue Formatting Strategy**

- **Issue title**: `[Feedback][<category>] <subject>`
- **Labels** (auto):
  - `feedback`
  - `category:bug` / `category:feature` / etc.
- **Issue body sections**:
  - Summary/message
  - Reporter email (if provided)
  - Diagnostics JSON block
  - Screenshot link (if uploaded)

### **Security & Abuse Controls**

- Never expose GitHub token in the app.
- Restrict API CORS origin to your desktop app origin as applicable.
- Add a shared secret header from app -> backend.
- Validate payload size and schema server-side.
- Rate limit by IP and/or generated device/session id.

### **Implementation Steps (Suggested order)**

1. Keep current modal fields and payload model in renderer.
2. Replace current feedback submit transport with HTTPS `POST` to backend endpoint.
3. Build serverless `POST /feedback` function to call GitHub Issues API.
4. Return issue URL and show success toast with issue number.
5. Add optional screenshot upload path (phase 2) if desired.

### **Testing Checklist**

- Valid submission creates issue in private repo.
- Missing/invalid fields return friendly errors.
- Invalid secret/token returns safe generic error to user.
- Category maps to correct labels.
- Diagnostics included only when selected.
- Large screenshot payload rejected with actionable message.

### **Operational Notes**

- Token rotation: quarterly or on team-member changes.
- Keep endpoint logs minimal and avoid storing sensitive payloads long-term.
- Consider moving from PAT to GitHub App once usage grows.


## Excel and PDF Export Features

### **1. Excel Export Implementation**

**✅ FEASIBLE** - This is definitely possible with some caveats.

#### **Technical Approach:**

**Libraries to Use:**
- **SheetJS (xlsx)** - Most popular library for creating/reading Excel files
  - `npm install xlsx` (~5MB, no native dependencies)
  - Supports `.xlsx`, `.xls`, `.csv`, and more
  - Can read AND write Excel files (bidirectional support!)
  - Works in both browser and Node.js (perfect for Electron)

**Architecture:**

1. **Export Path:**
   ```
   BudgetData → Excel Converter → SheetJS → .xlsx file
   ```
   - Create separate sheets: "Pay Breakdown", "Bills", "Accounts", "Benefits", "Taxes", "Summary"
   - Use formatting: headers, colors, number formats, borders
   - Add formulas for calculations (optional)
   - Preserve the plan ID as a hidden sheet for re-import identification

2. **Import Path:**
   ```
   .xlsx file → SheetJS Parser → Data Validator → BudgetData
   ```
   - Read all sheets and reconstruct BudgetData structure
   - Validate data integrity (required fields, types, ranges)
   - Handle missing/invalid data gracefully with errors/warnings

**Encryption Handling:**

- **Option A: Excel Password Protection** (Recommended)
  - SheetJS supports Excel's native password protection
  - Use: `XLSX.write(workbook, { password: "user_password" })`
  - Pros: Standard Excel feature, works in Excel natively
  - Cons: Excel encryption is weaker than AES-256

- **Option B: Encrypt .xlsx as blob before saving** 
  - Encrypt the entire .xlsx file bytes using current AES-256 method
  - Pros: Maintains strong encryption
  - Cons: File won't open in Excel without decryption first

- **Option C: Unencrypted export** (with warning)
  - Allow users to export without encryption for Excel compatibility
  - Show clear warning about security implications

**Challenges:**

1. **Data Roundtrip Accuracy** - Ensuring Excel edits don't break data integrity
   - Solution: Add data validation rules in Excel cells (dropdowns, number ranges)
   - Include a hidden "metadata" sheet with plan ID, version, structure info

2. **Complex Data Structures** - Some fields like `allocationCategories` arrays are nested
   - Solution: Flatten to multiple rows or use JSON column with warning

3. **Formula vs Values** - Should allocations be formulas or static values?
   - Recommendation: Use formulas for calculated fields, values for user inputs

4. **File Association** - Making `.xlsx` files open in Paycheck Planner
   - Challenge: System associates `.xlsx` with Excel by default
   - Solution: Use custom extension like `.budget-xlsx` or add to open file dialog

---

### **2. PDF Export Implementation**

**✅ FEASIBLE** - Straightforward implementation.

#### **Technical Approach:**

**Libraries to Use:**

- **Option A: jsPDF** (Recommended - mentioned in requirements)
  - `npm install jspdf` (~500KB)
  - Pure JavaScript, no dependencies
  - Supports text, tables, images, fonts
  - AutoTable plugin for formatted tables: `npm install jspdf-autotable`

- **Option B: Puppeteer/Electron print** (Alternative)
  - Use Electron's built-in `webContents.printToPDF()`
  - Render HTML/CSS → Print to PDF
  - Pros: Perfect styling, uses existing components
  - Cons: Larger file size, slower

- **Option C: pdf-lib** (For password protection)
  - `npm install pdf-lib` (~1MB)
  - Supports PDF encryption and password protection
  - Can be used alongside jsPDF for final encryption step

**Architecture:**

```
BudgetData → PDF Layout Generator → jsPDF → pdf-lib (for encryption) → .pdf file
```

**Layout Structure:**
1. **Cover Page**: Plan name, year, date generated
2. **Key Metrics Summary**: Net pay, total bills, leftover, etc.
3. **Pay Breakdown**: Gross pay, taxes, deductions with visual breakdown
4. **Accounts**: All accounts with allocations and categories
5. **Bills**: All bills grouped by frequency/account
6. **Benefits & Retirement**: Detailed breakdown
7. **Tax Settings**: Current tax configuration

**Styling:**
- Use currency symbols appropriately
- Color-code sections (match app theme)
- Add charts/graphs using jsPDF drawing or embed images
- Professional formatting with headers/footers

**Encryption Handling:**

- **PDF Password Protection**: Use pdf-lib for encryption
  - Solutions:
    - Generate PDF with jsPDF
    - Load PDF into pdf-lib
    - Apply password protection: `pdfDoc.encrypt({ userPassword: "user_password" })`
    - Export final encrypted PDF
    - Use watermark: "Contains sensitive financial data"

---

### **3. Implementation Challenges & Solutions**

| Challenge | Solution |
|-----------|----------|
| **Large file sizes** | Optimize data structures, compress images, lazy load libraries |
| **Excel bidirectional sync** | Use hidden metadata sheet, validate on import, show diff UI |
| **Encryption compatibility** | Offer 3 modes: App encryption, native format encryption, or unencrypted |
| **File picker UI** | Add file type radio buttons in save dialog: .budget / .xlsx / .pdf |
| **Import validation** | Build robust validator with helpful error messages for Excel imports |
| **Performance** | Generate exports in background/worker thread for large plans |

---

### **4. Recommended Implementation Phase**

**Phase 1: PDF Export** (Easier, faster ROI)
- ✅ Simpler implementation (~1-2 days)
- ✅ Read-only, so no data integrity concerns
- ✅ Great for sharing/printing
- Add "Export as PDF" button in File menu or Plan header

**Phase 2: Excel Export** (More complex but powerful)
- ⚠️ More complex (~3-5 days)
- ✅ Allows Excel manipulation
- Requires thorough testing for data roundtrips

**Phase 3: Excel Import** (Polish & validation)
- ⚠️ Requires robust validation (~2-3 days)
- Add UI for import conflicts/errors
- Consider "selective import" (merge vs replace)

---

### **5. File Menu Structure**

```
File
├── New Plan
├── Open Plan...              (.budget, .budget-xlsx)
├── Save                      (current format)
├── Save As...
│   ├── Budget File (.budget)
│   ├── Excel File (.xlsx) 
│   └── PDF Export (.pdf)
├── Export
│   ├── PDF Document...
│   └── Excel Spreadsheet...
└── Recent Files
```

---

### **6. Code Structure**

```typescript
// New service files
src/services/
  ├── excelExport.ts      // Excel generation logic
  ├── excelImport.ts      // Excel parsing & validation
  ├── pdfExport.ts        // PDF generation logic
  └── exportUtils.ts      // Shared formatting helpers

// IPC handlers in electron/main.ts
- 'save-excel-dialog'
- 'save-pdf-dialog'
- 'export-pdf'

// UI Components
src/components/ExportModal/
  └── ExportModal.tsx     // User selects format + options
```

---

### **7. Estimated Development Time**

- **PDF Export**: 1-2 days
- **Excel Export (write only)**: 2-3 days
- **Excel Import with validation**: 2-3 days
- **Testing & polish**: 1-2 days
- **Total**: ~1-1.5 weeks

---

## PDF Export - Implementation Status

### **Completed (March 7, 2026)**

✅ **Core PDF Generation**
- Installed dependencies: `jspdf`, `jspdf-autotable`, `pdf-lib`
- Created `pdfExport.ts` service with comprehensive layout generation
- Added Electron IPC handlers: `save-pdf-dialog`, `export-pdf`
- Added TypeScript types to `electron.d.ts` and preload bridge
- Created `ExportModal` component with section selection UI
- Integrated export button in PlanDashboard header ("📄 Export PDF")

**PDF Content Sections:**
- Cover page with plan name, year, and generation date
- Key Metrics summary (gross pay, taxes, net pay, allocations, leftover)
- Pay Breakdown (salary/hourly, frequency, target leftover)
- Tax Settings with calculated amounts per paycheck
- Benefits list (if any) with amounts and tax treatment
- Retirement contributions (if any) with employer match details
- Accounts list with allocations and category counts
- Bills list (active only) with frequency and account assignments
- Professional formatting with headers, footers, page numbers

**Export Modal Features:**
- Checkboxes to include/exclude specific sections
- All sections selected by default
- Clean UI with FormGroup components
- Loading state during export
- Error handling and display

### **Not Yet Implemented (Future Enhancement)**

⚠️ **PDF Password Protection**
- Password input fields exist in UI but functionality is disabled
- `pdf-lib` library doesn't have straightforward encryption API in current version
- Documented in code with TODO comment
- Options for future implementation:
  - Upgrade to newer pdf-lib version with encryption support
  - Use alternative library (pdfkit, pdf-to-printer with encryption)
  - Implement custom encryption wrapper around PDF bytes
  - Consider OS-level encryption (macOS FileVault, Windows EFS)

**Current Behavior:**
- Password field shows in modal but displays warning in console
- PDFs are exported unencrypted
- User is not blocked from exporting if password is entered

**Alternative:**
- Remove password UI entirely until encryption is implemented
- Add informational tooltip about encryption plans

---

## Custom Tabs Feature - Implementation Feasibility & Approach

### **Overview**
Allow users to add one or more "Custom Tabs" to the dashboard, each with a user-defined name, icon, and (optionally) a color. These tabs can be used to track arbitrary items, notes, or custom data tables not covered by built-in tabs (e.g., "Subscriptions", "Side Hustle Income", "Goals").

### **Technical Approach:**

**1. Data Model Changes:**
- Extend `TabConfig` type to allow `type: 'custom' | 'metrics' | 'bills' | ...` and add `customConfig?: { name: string; icon: string; color?: string; }`.
- Add a new array to `BudgetData`: `customTabs: CustomTab[]` (or store custom tab data in a generic way).
- Each custom tab can have a unique ID and user-defined metadata.

**2. UI/UX:**
- Update Tab Management modal to include "Add Custom Tab" button.
- Show a form for name, icon (emoji picker or icon list), and color.
- Allow reordering, renaming, and deleting custom tabs.
- Render a new tab in the dashboard for each custom tab.
- Each custom tab can show a simple note field, a table, or a checklist (MVP: rich text or markdown note area).

**3. Persistence:**
- Save custom tab configs and their content in the plan file (`BudgetData`).
- Ensure import/export (Excel/PDF) includes custom tab data (as a new sheet/section).

**4. Export/Import:**
- **Excel:** Add a "Custom Tabs" sheet, with each tab as a section or separate sheet.
- **PDF:** Add a section for each custom tab, showing its name, icon, and content.

**5. Migration:**
- On plan load, migrate any legacy custom tab data to new structure.

### **Complexity & Estimated Effort:**
- **MVP (notes only):** 1-2 days (UI, data model, persistence, export)
- **With tables/checklists:** +1-2 days (dynamic schema, validation)
- **Rich text/markdown:** +1 day (use existing editor component)
- **Total:** 2-4 days for robust, flexible custom tabs

### **Challenges:**
- Designing a flexible data model for arbitrary user content
- Ensuring custom tab data is included in all exports/imports
- UI for icon/color picking and tab management
- Data validation and migration for future extensibility

### **Recommendation:**
Start with MVP: custom tabs as named notes with icon/color, editable markdown or rich text. Expand to tables/checklists if user demand is high.

---

## Effective-Dated Settings History (Post-Beta) - Discovery Notes

### **Status**
- Deferred for beta due to size and risk.
- Keep as a planned post-beta feature.

### **User-Confirmed Requirements**
1. Apply to all editable financial configuration areas (not just pay settings).
2. Changes use an exact calendar effective date.
3. Elapsed periods remain locked; only future periods recalculate.
4. Provide a visible history UI.
5. Allow removing history entries.

### **Why This Is Large**
- Current data model uses a single current-state object for key settings (for example `budgetData.paySettings`) and no effective-date timeline.
- Core calculations currently assume one global settings state, not "state as of date".
- UI save flows overwrite the current object immediately, without versioning.
- Implementing this correctly requires a date-aware calculation engine plus migration-safe persistence changes.

### **Current Code Areas Impacted (Initial Map)**
- `src/types/auth.ts`
  - `BudgetData` and settings types currently model present-state only.
- `src/services/fileStorage.ts`
  - Load/save validation and migration logic will need timeline support.
- `src/contexts/BudgetContext.tsx`
  - `calculatePaycheckBreakdown` and related helpers currently use one settings object.
- `src/utils/payPeriod.ts`
  - Gross pay utilities are settings-only and not date-aware.
- `src/components/PaySettingsModal/PaySettingsModal.tsx`
  - Save flow currently replaces `paySettings` directly.
- Additional managers that edit financial settings will need effective-date save paths and history views.

### **Recommended Architecture**

#### 1) Effective-Dated Timeline Layer
- Introduce timeline/version records by domain, each with:
  - `id`
  - `effectiveDate` (ISO date)
  - `createdAt`
  - `snapshot` (full normalized settings payload)
- Keep existing top-level fields short-term for backward compatibility during migration.

#### 2) "State As Of Date" Resolver
- Add centralized resolver utilities:
  - `getEffectiveSnapshot(domain, date)`
  - `getMergedStateAsOf(date)`
- All calculators consume resolved state for a given period/date instead of direct top-level objects.

#### 3) Period-Aware Calculation Engine
- Generate year pay periods from frequency.
- For each period date:
  - Resolve applicable snapshots.
  - Compute gross, deductions, taxes, allocations using that resolved state.
- Aggregate period outputs for paycheck/monthly/yearly views.

#### 4) History Management UI
- On save in settings modals: "Apply starting" date input.
- History table per domain:
  - effective date
  - short summary of changes
  - delete action
- Deletion rules:
  - allow deleting non-baseline entries
  - recalculate future periods only
  - keep baseline entry for plan integrity

### **Data and Behavior Rules**
- Effective date precision: calendar date (no time-of-day needed initially).
- Conflict handling:
  - If multiple entries share a date for same domain, keep latest `createdAt`.
- Locking elapsed periods:
  - Period results with dates before "today" treated as historical/immutable in UI recomputation flows.
  - Future periods recompute after edits/deletes.
- Frequency changes mid-year:
  - Keep elapsed schedule fixed.
  - Regenerate schedule from effective date onward.

### **Migration Plan (Backward Compatible)**
1. Add new timeline fields and parser support.
2. On load of legacy files, create baseline entries (for example Jan 1 of plan year) from existing current settings.
3. Continue writing both legacy + timeline fields for one release (safety window).
4. Switch calculators to timeline resolvers.
5. Remove legacy write-path after validation period.

### **Testing Requirements**
- Unit:
  - resolver correctness across dates
  - overlap/same-date tie-break behavior
  - deletion recomputation boundaries
- Integration:
  - mid-year salary change
  - mid-year frequency change
  - tax/deduction/benefit/retirement changes mid-year
  - import existing legacy plans and preserve numbers
- UI:
  - effective-date inputs, history list rendering, delete confirmations, and error states.

### **Estimated Effort**
- MVP (effective-date engine + pay domain + minimal history UI): ~3-5 days.
- Expanded "all domains" support + robust history management + full tests: ~2-4 weeks.
- Recommendation for beta: defer full feature, optionally keep schema groundwork behind a feature flag.

### **Suggested Phased Rollout**
1. **Phase A (Foundation)**
   - Timeline schema + migration + resolver utilities.
2. **Phase B (Pay + Tax Domains)**
   - Date-aware calculators and modal effective-date save path.
3. **Phase C (Benefits/Retirement/Deductions)**
   - Extend timeline saves and resolution.
4. **Phase D (History UX + Delete + Hardening)**
   - History lists, delete workflows, regression coverage.

### **Open Product Decision (Still Needed)**
- Clarify whether "all" includes full effective-dated behavior for accounts/bills/loans as well, or only payroll-related financial settings (pay/tax/deductions/benefits/retirement).
