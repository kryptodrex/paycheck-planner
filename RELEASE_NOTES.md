> Update this file before each production release with a plain-language summary of what changed.
> Keep it focused on user-visible features, fixes, and improvements — not commit hashes.
> This file is read automatically by the release workflow and included in the GitHub Release body.

---

### Features

- No major features for this release


### Improvements

- Reworked the view mode selector to take up less space, and no longer have an unnecessary favorites modal associated with it
- Moved Pay Settings into the plan header for easier access from any view
- Tweaked view mode selector in header to look a bit better
- Increase icon line width for visibility
- Redesigned the header to make it less cluttered


### Bug Fixes

- Fixed demo generation immediately causing pay breakdown to go into the negative if random Gross Income is on the lower end
- Fixed off-center "Add Loan Payment" button when no loan items were added yet
- Fixed new plan creation starting with only two view modes visible after existing Setup Wizard