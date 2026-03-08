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

- [x] **Pay Breakdown Improvements** - 
  - Enable detailed fund allocation per account (investment goals, savings targets, expense distribution, etc.) after Net Pay is calculated
  - Define account priority and funding order after taxes and other deductions are taken from the Gross Pay (e.g., Investment → Savings → Checking)
  - Allow users to specify how they want their Net Pay distributed across accounts and categories
  - After all allocations are set, show a summary of the final breakdown of how the Gross Pay is distributed across all accounts and categories, including taxes, deductions, and final amounts allocated to each account
  - Show a "On Pay Day" summary of the total amounts that will be deposited into each account and category based on the configured breakdown
  - Show a final "All that remains" summary of the total amount left after all deductions and allocations, which can be used for discretionary spending or additional savings/investments
  - For the pay settings, we want the footer to be stickied for the cancel and save buttons, so the user doesn't have to scroll down to save their changes after configuring the pay breakdown. When selecting cancel as well, it should back out into the prior screen instead of just closing the modal, since it is more of a "cancel and go back" action rather than just "cancel and stay on the same screen".

- [x] **Account Settings Fixes** - There a some improvements we need for the account settings view:
    - The modal is not large enough for the content, making the account list impossible to read on a smaller window. We should make the modal larger and more responsive to accommodate the content.
    - We should add a delete button for accounts, and when an account is deleted, we should prompt the user to choose what to do with any bills or pay breakdowns that are currently using that account (e.g., reassign to another account, delete them, etc.) to prevent orphaned data and ensure a smooth user experience.

- [x] **Tab Management** - Allow for more customization of certain tabs
    - Have a [+] button next to the last tab that allows users to add less commonly used tabs
        - The Benefits and Taxes should be put behind this [+] button by default since they are less commonly used, but users can choose to add them as main tabs if they want
        - Future state could allow users to create custom tabs for different categories of bills or accounts
    - Allow user to hide tabs that they don't use often to declutter the interface, and also allow them to rearrange the order of the tabs based on their preferences
        - They should be able to re-add hidden tabs from the [+] button, and also drag and drop to rearrange the order of the tabs
    - Key Metrics and Pay Breakdown should always be the first two tabs and cannot be hidden since they are the core of the app, but the user can rearrange the order of the other tabs as they see fit

- [x] **Currency Conversions** - When a user changes the currency for a plan, offer to convert all existing amounts to the new currency using an exchange rate (with an option to skip conversion and just change the symbol)
    - For now, just allow user to give the exchange rate manually, but in the future we can look into integrating with a currency exchange API to get real-time rates for more accurate conversions.

- [x] **More Tab options** - Add more tabs for some new categories, including:
    - Loans tab for managing any debts or loans, with details like interest rates, payment or loan amortization schedules, etc.
        - This could be for a home Mortgage, student loans, car loans, or any other type of debt the user wants to track easily

- [x] **Custom Tab Display Modes** - Allow users to show tabs on the left, right, top, or bottom of the screen based on their preference for better accessibility and workflow customization
  - This would involve making the tab component more flexible to support different orientations and placements around the main content area
  - Users could choose to have tabs on the left side for easier vertical navigation, or on the top for a more traditional layout, etc.
  - For tabs on the left or right in a sidebar, we could also allow users to choose between icons only (for a more compact view) or icons with labels for easier identification, with a pleasant animation for expanding/collapsing the sidebar if they choose the icons-only view. 
    - By default we could show icons with labels for better discoverability, but allow users to switch to icons-only if they prefer a more minimalist interface. - This preference should be saved and persist across sessions.
  - When moving tabs manually to rearrange them, there should be a clear indicator to the user of where the tab will be placed when they drop it, and the tab order should update immediately to reflect the change for a smooth and intuitive user experience.

- [ ] **Glossary of Terms** - Add a glossary or tooltip explanations for more complicated financial terms used in the app (e.g., Gross Pay, Net Pay, Deductions, Allocations, etc.) to help users understand the concepts and calculations better
  - This could be implemented as tooltips that appear when hovering over certain terms, or as a dedicated glossary section in the app where users can look up definitions and explanations of key financial terms used in the app
  - We should add a Help menu in the menu bar that links to the glossary and other helpful resources for users who want to learn more about financial planning concepts, with easy searching and navigation to find the information they need.

- [ ] **Unit tests** - Add unit tests for critical components and functions to improve reliability and catch bugs early
  - Focus on testing the core logic of the application, such as the pay breakdown calculations, encryption/decryption functions, and file storage operations
  - Use a testing framework like Jest to write and run the tests
  - Set up a test suite that can be run as part of the development process to ensure that new changes don't break existing functionality


#### Backlog items to be prioritized and scheduled for future development:

- [ ] **More theme options** - Add more theme options beyond just light/dark/system, such as:
  - Custom color themes (allow users to choose their own primary/secondary colors)
    - It should choose automatic dark mode colors based on the primary color they choose, and also allow them to customize the dark mode colors if they want
  - High contrast mode for better accessibility
  - Font size adjustments for better readability
    - Allow users to increase font size via zoom settings, which should be under the View menu in the menu bar, and also accessible via keyboard shortcuts (e.g., Cmd + Plus to zoom in, Cmd + Minus to zoom out, Cmd + 0 to reset zoom)

- [ ] **Allocation Rounding Consistency Follow-up** - Revisit cross-mode rounding behavior for Pay Breakdown allocations to ensure entering values in paycheck/monthly/yearly modes remains stable and predictable after save/reopen.
  - Confirm a clear source-of-truth strategy for stored values and display conversions.
  - Add targeted tests for mode conversion and save/blur flows to prevent regressions.

- [ ] **Year-Aware Calendar Calculations** - Evaluate using the selected plan year in date-based math so projections can account for calendar differences when appropriate.
  - Consider leap year support for custom day-based frequencies (365 vs 366).
  - Decide whether month/day-aware calculations should affect paycheck, bill, and annual/monthly conversion views, or remain fixed-frequency averages.
  - Add targeted tests for leap-year and non-leap-year scenarios to validate expected behavior.

- [ ] **Plan Comparison View** - Add a feature to compare two plans side-by-side to analyze differences in pay breakdowns, bills, and accounts across years or scenarios.
  - Allow users to select two plans (e.g., current year vs next year) and display them in a split view with synchronized scrolling.
  - Highlight differences in key metrics, pay breakdowns, and bill allocations for easy comparison.
  - This would be especially useful for users who want to see the impact of changes they are considering for the next year before committing to them.

- [ ] **Currency Conversion Precision** - Improve currency conversion to minimize rounding errors when converting between currencies multiple times.
  - Issue: Converting currency with manual exchange rates can accumulate rounding errors. Example: $65,000 → ¥10,255,700 (at 157.78) → $64,610.91 (at 0.0063) results in ~$389 loss due to imprecise inverse rate.
  - Potential solutions:
    - Calculate and display the inverse exchange rate automatically when user enters a rate (e.g., "Inverse rate: 1 JPY = 0.00633839 USD")
    - Store original currency and amounts as metadata, allowing "revert to original currency" without loss
    - Increase decimal precision for exchange rates (support more decimal places)
    - Warn users when exchange rate appears to be an imprecise inverse of a recent conversion
  - Consider integration with live exchange rate API for precise real-time rates (previously mentioned in Currency Conversions feature)

- [ ] **More options for saving plans** - In addition to saving plans as local `.budget` files, we want to add more options for saving and exporting plans:
    - Ability to save as an Excel file instead of just a JSON-based `.budget` file, for users who want to manipulate their plans in spreadsheet software
        - We can create a well-formatted Excel file with separate sheets for pay breakdown, bills, accounts, etc. using a library like SheetJS
        - Depending on the Encryption method selected, if the user saves as an Excel file we can adjust the encryption approach (e.g., encrypting the Excel file with a password, or providing an unencrypted export option for users who want to use Excel's built-in password protection)
        - This Excel file should still be able to be opened and edited in the Paycheck Planner app, allowing for a more flexible workflow for users who want to use both the app and spreadsheet software for managing their plans
    - Ability to export the plan as a PDF for easy sharing and printing
        - For PDF export, we can use a library like jsPDF to generate a nicely formatted PDF that includes all the relevant information from the plan (pay breakdown, bills, accounts, etc.) in a clean layout
        - The PDF export should also respect the encryption settings of the plan, either by providing an unencrypted export option or by encrypting the PDF with a password of the user's choice if the plan is encrypted

- [ ] **Custom tabs** - Allow users to create custom tabs for organizing their bills and accounts based on their own categories (e.g., "Travel", "Education", "Health", etc.)
  - Custom category tabs that users can create and customize based on their needs (e.g., "Travel", "Education", etc.)

- [ ] **Mobile Companion App** - Develop a mobile version of the app for iOS and Android to allow users to view and manage their plans on the go.
    - The mobile app would sync with the desktop app via cloud storage (e.g., Dropbox, Google Drive) or a custom backend to keep plans up-to-date across devices
    - The mobile app would have a simplified interface focused on key metrics, pay breakdown, and bill tracking for quick access while away from the desktop
    - This would allow users to check their financial plan, track bills, and make adjustments from their phone, providing more flexibility and convenience in managing their finances