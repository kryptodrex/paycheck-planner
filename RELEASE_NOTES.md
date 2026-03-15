> Update this file before each production release with a plain-language summary of what changed.
> Keep it focused on user-visible features, fixes, and improvements — not commit hashes.
> This file is read automatically by the release workflow and included in the GitHub Release body.

---

### Features

- Added a dedicated modal to edit plan name and plan year, including preset year options and validated custom year entry.
- Added pause/resume support for deduction items to match other financial item cards.
- Added stronger visual flow reporting in Key Metrics, including a relocated "Your Pay Breakdown" section above Money Flow Summary.

### Improvements

- Improved account editing usability by prioritizing existing accounts, keeping add controls at the bottom, and improving smaller-window behavior.
- Refined allocation row readability with cleaner category logic, earlier count indicators, and one-line ellipsis handling for very long category names.
- Standardized and polished several shared UI surfaces (cards, headers, and modal interactions) for more consistent behavior across views.

### Bug Fixes

- Fixed remaining amount behavior so negative remaining values are shown correctly and highlighted with a clear danger state.
- Fixed retirement contribution rounding consistency to nearest cent across affected flows.
- Fixed Setup Wizard tax defaults to avoid USD-centric assumptions when using non-USD currencies.
- Fixed glossary term rendering so intended capitalization is preserved.
- Fixed header drag-region interaction regressions that could block certain modal close/button interactions.

