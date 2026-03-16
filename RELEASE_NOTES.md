> Update this file before each production release with a plain-language summary of what changed.
> Keep it focused on user-visible features, fixes, and improvements — not commit hashes.
> This file is read automatically by the release workflow and included in the GitHub Release body.

---

### Features

- Added a dedicated modal to edit plan name and plan year, including preset year options and validated custom year entry.
- Added pause/resume support for deduction items to match other financial item cards.
- Redesigned Key Metrics tab with a unified breakdown card offering three switchable views: Bars (individual flow bars per category), Stacked (proportional bar across all segments), and Pie (SVG donut chart with hover interactions). Selected view is persisted per plan file.
- Added a semantic color system to the Key Metrics breakdown: expense categories use distinct warm hues, savings/flexible spending use cooler hues, and gross pay remains green.
- Added a new "All Accounts Total" banner to Bills, Savings, and Loan views so totals across accounts are visible at a glance.

### Improvements

- Improved account editing usability by prioritizing existing accounts, keeping add controls at the bottom, and improving smaller-window behavior.
- Refined allocation row readability with cleaner category logic, earlier count indicators, and one-line ellipsis handling for very long category names.
- Standardized and polished several shared UI surfaces (cards, headers, and modal interactions) for more consistent behavior across views.
- Updated Key Metrics chart categorization to combine deductions and bills into a clearer "Bills & Deductions" grouping.
- Improved Key Metrics stacked chart rendering so the bar reliably fills the full container width.
- Improved Key Metrics card layout responsiveness so cards flow more naturally by available screen space.

### Bug Fixes

- Fixed remaining amount behavior so negative remaining values are shown correctly and highlighted with a clear danger state.
- Fixed retirement contribution rounding consistency to nearest cent across affected flows.
- Fixed Setup Wizard tax defaults to avoid USD-centric assumptions when using non-USD currencies.
- Fixed glossary term rendering so intended capitalization is preserved.
- Fixed header drag-region interaction regressions that could block certain modal close/button interactions.
- Fixed Key Metrics totals mismatches by aligning Remaining-for-Spending calculations between cards and charts.
- Fixed Key Metrics savings calculations to include Savings & Investment Contributions and properly classify retirement contributions in savings.
- Fixed Key Metrics bills totals to ignore paused/disabled bills.