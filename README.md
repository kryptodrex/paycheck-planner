# Paycheck Planner — Feature Overview

**Paycheck Planner** is a local-first desktop application for comprehensive paycheck-based financial planning. Built with security and privacy in mind, all your data stays on your own computer.

## What You Can Do

### 1) Start Quickly & Securely
- **Create a new yearly plan**: Set up planning for a specific year
- **Open an existing plan**: Load any `.budget` file from your computer  
- **Recent files access**: Quick-reopen from automatically tracked recent plans
- **Demo mode**: Try a fully-populated demo plan to explore features before entering your own data
- **Optional encryption**: Choose per-plan encryption during setup; keys are stored securely in your system keychain

### 2) Guided Setup Wizard
Walk through initial configuration with an intuitive step-by-step wizard:
- **Currency selection**: Choose from multiple currency options (USD, CAD, EUR, GBP, etc.)
- **Encryption preference**: Enable/disable AES encryption for your plan file
- **Pay structure**: Enter whether you're paid salary or hourly
- **Pay frequency**: Select weekly, bi-weekly, semi-monthly, or monthly pay periods
- **Tax assumptions**: Configure federal, state, Social Security, Medicare rates, and additional withholdings
- **Starting accounts**: Create initial accounts (checking, savings, investments, etc.)

### 3) Comprehensive Paycheck Analysis
- **Full pay breakdown**: See your complete journey from gross to net pay
- **Estimated taxes**: View federal, state, Social Security, Medicare, and additional withholdings
- **Deductions tracking**: Monitor pre-tax and post-tax deductions
- **Multiple views**: Switch between per-paycheck, monthly, and yearly perspectives
- **Key metrics dashboard**: High-level summary of income, deductions, bills, and remaining funds
- **Customizable tabs**: Show/hide dashboard tabs, reorder tabs, manage your view
  - Manage Tabs button for tab customization
  - All tabs can be shown/hidden (at least one must remain visible)
  - Available tabs: Key Metrics, Pay Breakdown, Bills, Loans, Benefits, Taxes
  - Drag and drop to reorder tabs
  - Tab preferences saved per plan

### 4) Financial Planning & Allocation

#### Accounts Management
- Create and manage multiple accounts (checking, savings, investments, etc.)
- Set default destinations for paychecks
- Track account types and purposes

#### Bills & Recurring Expenses
- Add unlimited bills with flexible frequency options:
  - Weekly, bi-weekly, monthly
  - Quarterly, semi-annually, annually, or custom
- Assign bills to specific accounts
- Automatic calculation of per-paycheck and annual impact
- View total bill allocation vs. remaining funds

#### Benefits & Deductions
- Add any employer-provided benefits (health insurance, FSA, HSA, etc.)
- Configure benefit amount per paycheck or as percentage of gross pay
- Choose pre-tax or post-tax deduction
- Deduct from paycheck or specific account
- Track total benefit costs per paycheck, monthly, and annually

#### Retirement Planning
- **401(k) / 403(b)**: Track traditional, Roth, or after-tax contributions
- **IRA accounts**: Traditional and Roth IRA contributions
- **Pension and other plans**: Support for pension plans and custom retirement accounts
- **Employee contributions**: Dollar amount or percentage of gross pay
- **Employer match**: Configure match percentage or dollar cap
- **Yearly limits**: Optional contribution limit tracking with auto-calculate feature
- **Deduction from paycheck or account**: Choose where contributions come from
- **Automatic calculations**: See per-paycheck and annual retirement savings

#### Loans & Debt Management
- Track student loans, car loans, personal loans, mortgages
- Monitor payment amounts and frequency
- View total debt service per paycheck

#### Tax Configuration
- Granular control over tax withholdings:
  - Federal income tax rate
  - State income tax rate
  - Social Security (6.2% default)
  - Medicare (1.45% default)
  - Additional withholding amounts
- Instant recalculation of net pay as you adjust rates

### 5) Plan Management

#### Year-Based Organization
- Keep separate plans for each year
- **Copy Plan**: Duplicate a plan into a new year to preserve setup and structure
- Clean separation of historical vs. current planning

#### Save & Security
- **Local storage**: All data stored as `.budget` files on your computer
- **Optional encryption**: Per-plan AES encryption
- **Keychain integration**: Encryption keys stored in OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- **Auto-save prompts**: Never lose work with save reminders
- **Recent files**: Automatic tracking of recently opened plans
- **Session persistence**: Window size, position, and active tab saved and restored

#### Export & Sharing
- **PDF export**: Generate comprehensive PDF reports
  - Optional password protection for PDFs
  - Granular section selection (metrics, pay, accounts, bills, benefits, taxes)
  - Professional formatting with all your plan details

### 6) Desktop-First Experience

#### Keyboard Shortcuts
- **Cmd+, / Ctrl+,**: Open Settings
- **Cmd+N / Ctrl+N**: New budget plan
- **Cmd+O / Ctrl+O**: Open existing plan
- **Cmd+S / Ctrl+S**: Save current plan
- **Keyboard shortcuts reference**: View a full list of all available shortcuts from the Help menu

#### Native Menus
- **File menu**: New, Open, Save, Close
- **Edit menu**: Standard editing commands
- **View menu**: Toggle developer tools (dev builds only)
- **Window menu**: Minimize, zoom, bring all to front (macOS)
- **Help menu**: Glossary, keyboard shortcuts reference, support/feedback

#### Application Features
- **Settings panel**: Configure theme (light/dark/system), enable/disable glossary tooltips
- **Glossary**: Built-in financial terms reference accessible from Help menu or inline tooltips
- **Keyboard shortcuts reference**: View all available shortcuts in a dedicated in-app dialog, accessible from the Help menu
- **In-app feedback**: Submit bug reports and feature requests directly from within the app via the Help menu
- **About dialog**: Version info, credits, license
- **Window state**: Automatically saves and restores window size, position, and active tab
- **Confirmation dialogs**: Save prompts before closing unsaved work

### 7) User Interface & Experience

#### Theme Support
- **Light mode**: Clean, professional light theme
- **Dark mode**: Eye-friendly dark theme
- **System theme**: Automatically match your OS preference
- **Persistent preference**: Theme choice saved across sessions

#### Glossary & Help
- **Interactive tooltips**: Hover over or click glossary terms for definitions
- **Toggle on/off**: Disable glossary tooltips in Settings if preferred
- **Searchable glossary**: Access full glossary from Help menu
- **Deep linking**: Open glossary to specific term from inline references

#### Data Validation
- Real-time validation of numeric inputs
- Currency formatting with proper symbol placement
- Percentage inputs with automatic bounds checking
- Required field enforcement

## Technical Stack

- **Framework**: Electron + React + TypeScript
- **Build System**: Vite
- **Encryption**: AES (crypto-js)
- **Keychain**: Native OS integration (keytar)
- **PDF Generation**: jsPDF with autoTable
- **Styling**: CSS with CSS variables for theming (light/dark/system modes via `ThemeContext`)

## Who This Is For

- **Privacy-conscious users**: Keep your financial data on your own computer, not in the cloud
- **Detailed planners**: Need granular control over paycheck allocation and deductions
- **Multi-account managers**: Track how income flows to different accounts and bills
- **Yearly budgeters**: Prefer planning by year with clean separation between periods
- **Security-focused individuals**: Want optional encryption with OS keychain integration
- **Benefits navigators**: Need to model complex employer benefits and retirement contributions

## Getting Started

1. **Download** the latest release for your platform (macOS, Windows, Linux)
2. **Install** the application
3. **Launch** and choose to create a new plan or try the demo
4. **Follow** the setup wizard to configure your paycheck details
5. **Start planning** by adding accounts, bills, benefits, and other allocations

## Troubleshooting

### macOS: "App is damaged and can't be opened"

Official release builds are signed and notarized for macOS. If you still see this warning, it is usually due to a stale or partially downloaded artifact, or because you are running a local unsigned build. To open the app:

**Option 1: Terminal command (remove quarantine flag)**
1. Open Terminal
2. Run:
  ```bash
  xattr -c "/Applications/Paycheck Planner.app"
  ```
3. Try opening the app again

If your app is in a different location, replace the path with your app's actual location.

**Option 2: Right-click to Open**
1. Right-click (or Control-click) on the app
2. Select **Open** from the menu
3. Click **Open** in the security dialog that appears

**Option 3: System Settings**
1. Try to open the app normally (it will be blocked)
2. Go to **System Settings > Privacy & Security**
3. Scroll down to the Security section
4. Click **Open Anyway** next to the message about Paycheck Planner
5. Confirm by clicking **Open**

You only need to do this once. After the first launch, macOS will remember your choice and the app will open normally.

### Windows: SmartScreen Warning

Windows may show a SmartScreen warning for unsigned apps. Click **More info** and then **Run anyway** to proceed.

### Linux: Permission Issues

If the AppImage won't run, make it executable:
```bash
chmod +x Paycheck-Planner-*.AppImage
```

---

**Note**: This is a beta release. All core features are functional, but you may encounter minor issues. Please report any bugs or feature requests via GitHub issues or the built-in support email feature.

For technical documentation, build instructions, and architecture details, see [src/README.md](src/README.md).
