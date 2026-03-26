> Update this file before each production release with a plain-language summary of what changed.
> Keep it focused on user-visible features, fixes, and improvements — not commit hashes.
> This file is read automatically by the release workflow and included in the GitHub Release body.

---

### Features

- No major features for this release


### Improvements

- Plans now save automatically when closed, but can still be saved via shortcut or menubar task
    - Note: If it's a new plan or demo plan that hasn't been saved yet it will still prompt to save
- Reworked the view mode selector to take up less space, and no longer have an unnecessary favorites modal associated with it
- Added a Pay Details button to Key Metrics screen as well
- Increase icon line width for visibility
- Reorganized the plan header to make it less cluttered
- Header actions now switch between full buttons on wider windows and compact dropdowns on smaller screens


### Bug Fixes

- Fixed demo generation immediately causing pay breakdown to go into the negative if random Gross Income is on the lower end
- Fixed off-center "Add Loan Payment" button when no loan items were added yet
- Fixed new plan creation starting with only two view modes visible after exiting Setup Wizard
- Fixed focused header action borders clipping near the sticky tab header edge