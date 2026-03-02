# App Updates

## Feature Enhancements

- [x] **App Settings Panel** - Create a dedicated Settings interface accessible via `Cmd+,` / `Ctrl+,` (or through the menu bar) with app-wide configuration options:
  - Theme preference (Light, Dark, or System default)
  - Additional settings to be determined as needed

- [x] **Dynamic Currency Support** - Implement multi-currency support across the entire application:
  - Allow users to set a currency per plan
  - Display the correct currency symbol throughout the plan (replacing hardcoded `$` signs)
  - Enable currency configuration within the Pay Settings editor

- [x] **Enhanced Modal Navigation** - Improve UX for windows with Cancel buttons:
  - Implement Esc key handling to close modals and dialogs without requiring a Cancel button click

- [x] **Account Configuration** - Move account management from the Bills section to the initial setup flow:
  - Allow users to create and configure multiple accounts during setup
  - Remove the Account creation from the Bill editor to streamline the bill management process
  - Accounts should be app-wide entities that can be associated with bills and pay breakdowns, rather than being tied to specific bills
  - Update the UI to reflect this change, ensuring that users can easily manage their accounts and associate them with their financial plans

- [x] **Improve Welcome page** - Refine the welcome screen to better guide new users:
  - Keep the Create new and Open existing, but below them have the recently opened plans (with file names and last opened dates) for quick access
  - Remove the blurbs about the app features from the welcome screen and move them to the About section (accessible from the menu bar or settings) to keep the welcome screen focused on getting users to create or open a plan

- [ ] **Pay Breakdown Improvements** - 
  - Enable detailed fund allocation per account (investment goals, savings targets, expense distribution, etc.) after Net Pay is calculated
  - Define account priority and funding order after taxes and other deductions are taken from the Gross Pay (e.g., Investment → Savings → Checking)
  - Allow users to specify how they want their Net Pay distributed across accounts and categories
  - After all allocations are set, show a summary of the final breakdown of how the Gross Pay is distributed across all accounts and categories, including taxes, deductions, and final amounts allocated to each account
  - Show a "On Pay Day" summary of the total amounts that will be deposited into each account and category based on the configured breakdown
  - Show a final "All that remains" summary of the total amount left after all deductions and allocations, which can be used for discretionary spending or additional savings/investments

- [ ] **Encryption enhancements** - Make encryption an app-level setting rather than plan-specific:
    - The Encryption should not be Plan-specific, but instead be an app-level setting. If the user doesn't start by having encryption on, and creates some plans then turns it on, it should encrypt all those existing plans with the key they chose. 
    - If they want, they should be able to turn that encryption off individually for the plans (for sharing the file or other reasons).
    - If they then turn off app-level encryption, all the plans should be decrypted.
    - On the plan page, move the encryption status text to the bottom footer area and make it more clear that the encryption is an app-level setting, and provide a link to the settings page where they can change it.

- [ ] **Currency Conversions** - When a user changes the currency for a plan, offer to convert all existing amounts to the new currency using an exchange rate (with an option to skip conversion and just change the symbol)
    - For now, just allow user to give the exchange rate manually, but in the future we can look into integrating with a currency exchange API to get real-time rates for more accurate conversions.