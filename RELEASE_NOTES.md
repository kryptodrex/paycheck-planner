> Update this file before each production release with a plain-language summary of what changed.
> Keep it focused on user-visible features, fixes, and improvements — not commit hashes.
> This file is read automatically by the release workflow and included in the GitHub Release body.

---

### Features

- No major features for this release


### Improvements

- Added the tab icon next to each view title so the active workspace has clearer visual context.
- Simplified retirement setup by removing employer match handling from retirement elections to reduce complexity, as it's not an amount taken out of your paycheck generally
- Improved Key Metrics view accuracy
	- Remaining-for-spending totals now match between Key Metrics and Pay Breakdown in yearly mode.
	- The Bills metric was reworked as Recurring Expenses and now reflects the total of custom allocations, bills, deductions, and loan payments.
- Improved account deletion behavior so linked items are handled more intelligently across all supported item types.
- Reduced icon width to look cleaner, and replaced a few icons to make more sense in context
- Reduced built application size by around 100MB


### Bug Fixes

- Fixed deduction amount rounding/display inconsistencies (for example 9.30 no longer drifting to 9.31).
- Fixed edit-form amount formatting so trailing zeros are preserved more consistently when editing existing bill and deduction values.
- Added tighter decimal precision handling in amount entry fields to match what the UI can reliably display.
- Fixed history overlay behavior for legacy entries so edits no longer appear as misleading empty-to-value changes.
- Fixed a history overlay deletion bug where deleting an Initial tracked state row could delete the wrong item in stacked history.
- Fixed tax settings history to actually break out the line item changes done