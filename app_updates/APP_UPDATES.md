# App Updates

## Feature Enhancements - All Completed
(Additional features moved into Github Project view)

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

- [x] **Glossary of Terms** - Add a glossary or tooltip explanations for more complicated financial terms used in the app (e.g., Gross Pay, Net Pay, Deductions, Allocations, etc.) to help users understand the concepts and calculations better
  - This could be implemented as tooltips that appear when hovering over certain terms, or as a dedicated glossary section in the app where users can look up definitions and explanations of key financial terms used in the app
  - We should add a Help menu in the menu bar that links to the glossary and other helpful resources for users who want to learn more about financial planning concepts, with easy searching and navigation to find the information they need.

- [x] **Feedback System** - Implement a way for users to easily provide feedback, report bugs, or request features directly from the app to facilitate communication and continuous improvement
  - This could be a simple form in the app that allows users to submit their feedback, which would then be sent to our support email or stored in a database for review
    - Button in the bottom left of the footer (before Last Saved) that opens a feedback form modal where users can enter their feedback, report bugs, or request features
    - The form should have fields for the user's email (optional), a subject line, and a message box for them to describe their feedback in detail
  - If it was a bug they encountered, allow user to select an option to automatically include relevant logs to help us diagnose the issue more effectively
  - If they have a new feature suggestion, allow them to categorize it (e.g., UI improvement, new feature, performance issue, etc.) to help us prioritize and organize the feedback we receive
    - Also allow them to include a screenshot if they want to illustrate their feedback visually, which can be especially helpful for UI-related suggestions or bug reports

- [x] **Unit tests** - Add unit tests for critical components and functions to improve reliability and catch bugs early
  - Focus on testing the core logic of the application, such as the pay breakdown calculations, encryption/decryption functions, and file storage operations
  - Use a testing framework like Jest to write and run the tests
  - Set up a test suite that can be run as part of the development process to ensure that new changes don't break existing functionality
