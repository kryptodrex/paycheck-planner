> Update this file before each production release with a plain-language summary of what changed.
> Keep it focused on user-visible features, fixes, and improvements — not commit hashes.
> This file is read automatically by the release workflow and included in the GitHub Release body.

---

### Features

- Mobile: create encrypted plans and unlock them with Face ID / Touch ID.
- Mobile: built-in Glossary and App FAQs, and change a plan's currency with live exchange rates — at parity with desktop.
- Mobile: choose from the full set of account icons, shared with desktop so your chosen icon shows the same on both.


### Improvements

- Mobile: new plans now ask where to save — pick a folder like iCloud Drive and the plan file stays updated automatically as you edit (replacing the manual "Export / Back Up Plan" step). Plans kept on-device can be saved to a folder later from Settings.
- Mobile: Search now lives in the tab bar (replacing the floating button), and closing a plan moved into Settings for a cleaner header.
- Mobile: set your first paycheck date so weekly/bi-weekly paychecks-per-month match desktop.
- Mobile: removed the redundant per-account "Monthly Allocation" field in favor of Custom Allocations.


### Security

- Reference data and currency endpoints are now public, read-only APIs — the apps no longer ship any embedded secret.


### Bug Fixes

- Mobile: edits now save back to the file you opened — including cloud documents (iCloud Drive, Google Drive, etc.) — instead of only to a device-local copy. Reopening a plan from Recent Files also picks up changes made on desktop, and Settings shows whether the original file is in sync.
- Mobile: fixed the header back button not responding (e.g. when leaving Settings) on iOS 26.
- Account icons created on mobile now use names desktop can render (previously stored an incompatible value).