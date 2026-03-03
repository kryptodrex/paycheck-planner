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

- [x] **Encryption enhancements** - Make encryption more baked into the plan creation via the Wizard, and more flexible overall:
    - In the Wizard, they should be able to choose whether they want to enable encryption for the plan they're creating, and if so, guide them through the encryption setup right there in the Wizard flow (instead of having it as a separate step after the plan is created).
    - The encryption key they choose should be saved securely in their local keychain (using a package that is available on all platforms) instead of just in localStorage, for better security and convenience. This way it is easier for users to manage their keys and they don't have to worry about losing them as much.
    - If they want, they should be able to turn that encryption off individually for the plans (for sharing the file or other reasons).
    - On the plan page header, display the encryption status as a clickable badge that opens encryption settings for quick access

- [ ] **Pay Breakdown Improvements** - 
  - Enable detailed fund allocation per account (investment goals, savings targets, expense distribution, etc.) after Net Pay is calculated
  - Define account priority and funding order after taxes and other deductions are taken from the Gross Pay (e.g., Investment → Savings → Checking)
  - Allow users to specify how they want their Net Pay distributed across accounts and categories
  - After all allocations are set, show a summary of the final breakdown of how the Gross Pay is distributed across all accounts and categories, including taxes, deductions, and final amounts allocated to each account
  - Show a "On Pay Day" summary of the total amounts that will be deposited into each account and category based on the configured breakdown
  - Show a final "All that remains" summary of the total amount left after all deductions and allocations, which can be used for discretionary spending or additional savings/investments
  - For the pay settings, we want the footer to be stickied for the cancel and save buttons, so the user doesn't have to scroll down to save their changes after configuring the pay breakdown. When selecting cancel as well, it should back out into the prior screen instead of just closing the modal, since it is more of a "cancel and go back" action rather than just "cancel and stay on the same screen".

- [ ] **Account Settings Fixes** - There a some improvements we need for the account settings view:
    - The modal is not large enough for the content, making the account list impossible to read on a smaller window. We should make the modal larger and more responsive to accommodate the content.
    - We should add a delete button for accounts, and when an account is deleted, we should prompt the user to choose what to do with any bills or pay breakdowns that are currently using that account (e.g., reassign to another account, delete them, etc.) to prevent orphaned data and ensure a smooth user experience.

- [ ] **Currency Conversions** - When a user changes the currency for a plan, offer to convert all existing amounts to the new currency using an exchange rate (with an option to skip conversion and just change the symbol)
    - For now, just allow user to give the exchange rate manually, but in the future we can look into integrating with a currency exchange API to get real-time rates for more accurate conversions.

- [ ] **More theme options** - Add more theme options beyond just light/dark/system, such as:
  - Custom color themes (allow users to choose their own primary/secondary colors)
    - It should choose automatic dark mode colors based on the primary color they choose, and also allow them to customize the dark mode colors if they want
  - High contrast mode for better accessibility
  - Font size adjustments for better readability
    - Allow users to increase font size via zoom settings, which should be under the View menu in the menu bar, and also accessible via keyboard shortcuts (e.g., Cmd + Plus to zoom in, Cmd + Minus to zoom out, Cmd + 0 to reset zoom)

- [ ] **Unit tests** - Add unit tests for critical components and functions to improve reliability and catch bugs early
  - Focus on testing the core logic of the application, such as the pay breakdown calculations, encryption/decryption functions, and file storage operations
  - Use a testing framework like Jest to write and run the tests
  - Set up a test suite that can be run as part of the development process to ensure that new changes don't break existing functionality