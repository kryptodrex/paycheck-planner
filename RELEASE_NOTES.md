> Update this file before each production release with a plain-language summary of what changed.
> Keep it focused on user-visible features, fixes, and improvements — not commit hashes.
> This file is read automatically by the release workflow and included in the GitHub Release body.

---

### Features

- Added Other Income support so you can track bonus, commission, rental, retirement withdrawal, reimbursement, investment income, and custom sources with fixed or percent-of-gross rules, choose whether each entry affects gross pay, taxable income, or net pay, and see the impact in paycheck breakdowns and PDF exports.
- Added live currency conversion powered by Frankfurter.app so exchange rates are fetched automatically when you change currency, with a visible "Last updated" timestamp and a manual refresh button. Falls back to cached rates offline and to manual entry when no cache exists.
- Added smarter tax estimation with a one-click "Auto-estimate rates" action in Pay Details that uses progressive federal brackets, Social Security wage-base capping, and Medicare surtax behavior. Setup Wizard tax starter estimates now use the same engine. All tax data is shipped locally from IRS-backed rules — no network required.
- Added a customizable font system: choose from system fonts or set any locally installed font from App Settings. Includes accessibility-focused options such as a dyslexia-friendly font.
- Added a Frequently Asked Questions modal accessible from the Help menu with searchable, categorized how-tos and expandable question/answer drawers.
- Added ability to set up Theme, Preset, and visible tabs when going through the initial Setup Wizard


### Improvements

- Reallocation Review modal redesigned with per-item slider controls for savings and retirement proposals so you can fine-tune how much of each item to free up rather than accepting the algorithm's amounts wholesale.
- Added Auto-Balance mode to the Reallocation Review modal: adjusting one slider automatically redistributes the freed target proportionally across the remaining adjustable items.
- Reallocation algorithm now spreads reduction proposals proportionally across eligible savings and retirement items instead of greedily exhausting them one at a time.
- Bills and deductions in the Reallocation Review modal are now grouped by category with section-level "Pause all / Clear all" and "Reset section" controls.
- Added a "Protect from reallocation suggestions" toggle to savings contributions and retirement elections so specific items are never included in reallocation proposals.
- Protected savings and retirement items are now marked with a "Protected" badge in the Savings Manager.
- Inverse exchange rate is now auto-calculated and displayed in real time when editing the exchange rate, eliminating manual math.
- Suggested account buffer amounts now appear in the Pay Breakdown for weekly and bi-weekly pay frequencies to help keep accounts funded during variable paycheck months.


### Security

- Encryption keys are now stored using Electron's built-in `safeStorage` API instead of the OS keychain via `keytar`. On macOS this eliminates the repeated "Paycheck Planner wants to use your confidential information" Keychain password prompts. On Windows, keys are protected by DPAPI (bound to your Windows user account). On Linux, Chromium's secret store is used. Existing encrypted plans are migrated automatically on first launch — no action required.
- On Macs with Touch ID enrolled, opening an encrypted plan now requires a biometric fingerprint scan. The prompt appears once per plan per app session, so saves and other in-session key retrievals do not re-prompt.
- On devices without Touch ID (Windows, Linux, or older Macs), `safeStorage` protection remains active: keys are cryptographically bound to the OS user session and inaccessible without the system login.

### Bug Fixes

- Minor fixes across the app