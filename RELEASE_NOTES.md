> Update this file before each production release with a plain-language summary of what changed.
> Keep it focused on user-visible features, fixes, and improvements — not commit hashes.
> This file is read automatically by the release workflow and included in the GitHub Release body.

---

### Features

- Added Other Income support so you can track bonus, commission, rental, retirement withdrawal, reimbursement, investment income, and custom sources with fixed or percent-of-gross rules, choose whether each entry affects gross pay, taxable income, or net pay, and see the impact in paycheck breakdowns and PDF exports.


### Improvements

- Reallocation Review modal redesigned with per-item slider controls for savings and retirement proposals so you can fine-tune how much of each item to free up rather than accepting the algorithm's amounts wholesale.
- Added Auto-Balance mode to the Reallocation Review modal: adjusting one slider automatically redistributes the freed target proportionally across the remaining adjustable items.
- Reallocation algorithm now spreads reduction proposals proportionally across eligible savings and retirement items instead of greedily exhausting them one at a time.
- Bills and deductions in the Reallocation Review modal are now grouped by category with section-level "Pause all / Clear all" and "Reset section" controls.
- Added a "Protect from reallocation suggestions" toggle to savings contributions and retirement elections so specific items are never included in reallocation proposals.
- Protected savings and retirement items are now marked with a "Protected" badge in the Savings Manager.




### Bug Fixes

- 