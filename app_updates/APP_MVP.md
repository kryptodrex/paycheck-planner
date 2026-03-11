# MVP Specification

## Proposed App Name
**Primary recommendation:** **Paycheck Planner**

Why this name:
- Clearly communicates paycheck-to-expense flow
- Sounds practical and desktop-friendly
- Broad enough to support future features without rebranding

Other good options:
- **PayMap**
- **NetNest**
- **SpendPath**

## MVP Goal
Help a user plan where each paycheck goes, from gross pay to remaining spendable amount, with optional local encryption and year-based planning.

## Minimum Features (Must-Have)
1. **New/Open Home Screen**
	- Create new plan
	- Open existing plan
	- Show recently opened plans

2. **Setup Wizard for New Plan**
	- Year selection
	- Pay input: yearly salary or hourly wage + hours/pay period
	- Pay frequency (weekly, bi-weekly, monthly)
	- Optional pre-tax deductions (401k, benefits)

3. **Core Breakdown Engine**
	- Calculate gross → pre-tax deductions → estimated taxes (user entered for now) → net pay
	- Show values in bi-weekly, monthly, and yearly formats
	- Let user allocate net pay across user-defined accounts (Checking, Savings, etc.)
	- Show the breakdown in a pleasing UI where they can also see the amount visually shrinking as it goes down to the final net amount lef

4. **Bills and Line Items**
	- Add/edit/delete bill or expense line items
	- Frequencies: weekly, monthly, yearly, custom
	- Assign each line item to a selected account

5. **Three MVP Views**
	- **Key Metrics:** totals for income, bills, savings, remaining
	- **Pay Breakdown:** gross-to-net flow
	- **Bills:** recurring items and account assignment

6. **Local Save + Optional Encryption**
	- Save/load plan files locally
	- User chooses encrypted or unencrypted on setup
	- If encrypted, key stored securely in local keychain

7. **Year-Based Plan + Copy Forward**
	- Plans are tied to a year
	- Duplicate prior year plan into a new year

## Not MVP (Defer)
- Fully automatic location-aware tax calculations
- Custom user-defined view builder
- Full audit history and deleted-item restore

## Lightweight MVP Additions That Improve UX (Still Minimal)
- **Unsaved changes indicator** in the window title/footer
- **Auto-save every N seconds** with manual save still available
- **First-run sample plan** to reduce setup friction