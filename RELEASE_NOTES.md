> Update this file before each production release with a plain-language summary of what changed.
> Keep it focused on user-visible features, fixes, and improvements — not commit hashes.
> This file is read automatically by the release workflow and included in the GitHub Release body.

---

### Features

- New theme preset options available to choose from in App Settings
- Added undo and redo support across planning workflows, plus an audit history overlay so you can review and restore prior changes.
- Added plan-wide search actions that can jump directly to settings, sections, and modals, including common add/edit/delete/pause tasks.
- Added automated reallocation support when remaining spending is below target, with safe-source rules and a clear summary of what changed.
- Added app-wide Lucide icon support with account icon selection, replacing legacy emoji-based iconography.


### Improvements

- Improved gross-to-net clarity with explicit pre-tax and post-tax deduction visibility in key breakdown views.
- Expanded tax modeling so tax lines can be configured using either percentage rates or fixed amounts.
- Expanded view mode flexibility with more cadence options, paycheck-cadence defaults, and better selector guidance.
- Overhauled Appearance and Accessibility settings with curated light/dark preset pairs, manual dark-mode overrides, and a dedicated high-contrast mode.
- Added app-level display scaling controls (zoom/font size) in Settings and View, including keyboard shortcuts for zoom in, zoom out, and reset.


### Bug Fixes

- Fixed cross-mode rounding and persistence behavior so values remain stable after editing, saving, and reopening.
- Fixed several search interaction issues, including navigation/scroll behavior and action responsiveness for pause/resume controls.