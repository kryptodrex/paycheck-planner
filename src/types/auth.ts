// TypeScript Type Definitions
// These are like "contracts" that describe the shape of our data
// They help catch bugs by ensuring we use data correctly throughout the app

/**
 * CoreFrequency - Shared recurring cadence values used across features
 */
export type CoreFrequency = 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly' | 'yearly';

/**
 * PayFrequency - How often the user gets paid
 */
export type PayFrequency = Exclude<CoreFrequency, 'yearly'>;

/**
 * BillFrequency - How often a bill is due
 */
export type BillFrequency = CoreFrequency | 'quarterly' | 'semi-annual' | 'custom';

/**
 * LoanPaymentFrequency - Valid payment frequencies for loans (excludes 'custom')
 */
export type LoanPaymentFrequency = Exclude<BillFrequency, 'custom'>;

/**
 * SavingsFrequency - How often a savings/investment contribution occurs
 */
export type SavingsFrequency = CoreFrequency | 'quarterly' | 'semi-annual';

/**
 * PayType - Whether user is paid by salary or hourly
 */
export type PayType = 'salary' | 'hourly';

/**
 * Benefit - A benefits election (health insurance, FSA, etc.)
 */
export interface Benefit {
  id: string;
  name: string;                  // Benefit name (e.g., "Health Insurance")
  amount: number;                // Amount per paycheck
  isTaxable: boolean;            // If true, this is post-tax; if false, pre-tax
  isPercentage?: boolean;        // If true, amount is percentage of gross pay
  deductionSource?: 'paycheck' | 'account'; // Where deduction is applied
  sourceAccountId?: string;      // Account ID when deductionSource is 'account'
}

/**
 * RetirementElection - 401k or similar retirement contribution election
 */
export interface RetirementElection {
  id: string;
  type: '401k' | '403b' | 'roth-ira' | 'traditional-ira' | 'pension' | 'other'; // Type of retirement plan
  customLabel?: string;                    // Custom label when type is 'other'
  employeeContribution: number;            // Amount employee contributes per paycheck
  employeeContributionIsPercentage: boolean; // If true, amount is percentage of gross pay
  isPreTax?: boolean;                      // If true/undefined, pre-tax; if false, post-tax
  deductionSource?: 'paycheck' | 'account'; // Where deduction is applied
  sourceAccountId?: string;                // Account ID when deductionSource is 'account'
  hasEmployerMatch: boolean;               // Whether employer offers matching contributions
  employerMatchCap: number;                // Maximum employer will match (amount or percent)
  employerMatchCapIsPercentage: boolean;   // If true, cap is percentage of gross; if false, it's dollar amount
  yearlyLimit?: number;                    // Optional yearly contribution limit (employee + employer total)
}

/**
 * BudgetData - The main data structure for a paycheck plan file
 * This is what gets saved to disk (after encryption)
 */
export interface BudgetData {
  id: string;                    // Unique identifier for this plan
  name: string;                  // Display name (e.g., "2026 Plan")
  year: number;                  // Year this plan is for (e.g., 2026)
  paySettings: PaySettings;      // How the user gets paid
  preTaxDeductions: Deduction[]; // Pre-tax deductions (401k, benefits, etc.)
  benefits: Benefit[];           // Benefits elections (health insurance, FSA, etc.)
  retirement: RetirementElection[]; // Retirement plan elections (401k, etc.)
  taxSettings: TaxSettings;      // Tax configuration
  accounts: Account[];           // User's accounts (checking, savings, etc.)
  bills: Bill[];                 // Recurring bills and expenses
  loans: Loan[];                 // Loans and debts
  savingsContributions?: SavingsContribution[]; // Savings/investment transfers funded from accounts
  settings: BudgetSettings;      // User preferences
  createdAt: string;            // ISO date string when created
  updatedAt: string;            // ISO date string when last modified
}

/**
 * PaySettings - Configuration for how the user gets paid
 */
export interface PaySettings {
  payType: PayType;              // Salary or hourly
  annualSalary?: number;         // Annual salary (if payType is 'salary')
  hourlyRate?: number;           // Hourly rate (if payType is 'hourly')
  hoursPerPayPeriod?: number;    // Hours per pay period (if hourly)
  payFrequency: PayFrequency;    // How often paid
  firstPaycheckDate?: string;    // First paycheck date in YYYY-MM-DD (weekly, bi-weekly, monthly)
  semiMonthlyFirstDay?: number;  // First paycheck day of month for semi-monthly schedules
  semiMonthlySecondDay?: number; // Second paycheck day of month for semi-monthly schedules
  minLeftover?: number;          // Minimum amount to keep leftover per paycheck (default: 0)
}

/**
 * Deduction - A pre-tax deduction (401k, health insurance, etc.)
 */
export interface Deduction {
  id: string;
  name: string;                  // Description (e.g., "401k", "Health Insurance")
  amount: number;                // Amount per paycheck
  isPercentage: boolean;         // If true, amount is percentage of gross pay
}

/**
 * TaxLine - A single named tax rate line
 */
export interface TaxLine {
  id: string;
  label: string;   // User-editable label (e.g. "Federal Tax", "VAT", "National Insurance")
  rate: number;    // Percentage (0-100)
}

/**
 * TaxSettings - Tax configuration (user-entered)
 */
export interface TaxSettings {
  taxLines: TaxLine[];           // Dynamic list of named tax rates
  additionalWithholding: number; // Additional dollar amount to withhold per paycheck
}

/**
 * Account - A financial account where money is allocated
 */
export interface Account {
  id: string;
  name: string;                  // Account name (e.g., "Checking", "Savings")
  type: 'checking' | 'savings' | 'investment' | 'other';
  allocation?: number;           // DEPRECATED: Dollar amount allocated per paycheck
  isRemainder?: boolean;         // DEPRECATED: If true, gets whatever is left after other allocations
  priority?: number;             // DEPRECATED: Funding order (1 = first funded)
  allocationCategories?: AccountAllocationCategory[]; // Category-level allocation targets
  color: string;                 // Hex color for UI display
  icon?: string;                 // Optional emoji or icon
}

/**
 * AccountAllocationCategory - Category targets within an account allocation
 */
export interface AccountAllocationCategory {
  id: string;
  name: string;                  // Category name (e.g., "Emergency Fund", "Groceries")
  amount: number;                // Amount per paycheck targeted for this category
  isBill?: boolean;              // If true, this is an auto-calculated sum of bills for this account
  billCount?: number;            // Number of bills in this category (if isBill is true)
  isBenefit?: boolean;           // If true, this is an auto-calculated sum of benefits for this account
  benefitCount?: number;         // Number of benefits in this category (if isBenefit is true)
  isRetirement?: boolean;        // If true, this is an auto-calculated sum of retirement for this account
  retirementCount?: number;      // Number of retirement contributions in this category (if isRetirement is true)
  isLoan?: boolean;              // If true, this is an auto-calculated sum of loan payments for this account
  loanCount?: number;            // Number of loan payments in this category (if isLoan is true)
  isSavings?: boolean;           // If true, this is an auto-calculated sum of savings/investments for this account
  savingsCount?: number;         // Number of savings/investment items in this category (if isSavings is true)
}

/**
 * SavingsContribution - A recurring transfer to savings/investment funded from an account
 */
export interface SavingsContribution {
  id: string;
  name: string;                                  // Contribution label (e.g., "Brokerage Transfer")
  amount: number;                                // Amount due each frequency interval
  frequency: SavingsFrequency;                   // How often contribution occurs
  accountId: string;                             // Which account funds this contribution
  type: 'savings' | 'investment';                // Contribution category for badges/filtering
  enabled?: boolean;                             // Whether this contribution is active
  notes?: string;                                // Optional notes
}

/**
 * Bill - A recurring bill or expense
 */
export interface Bill {
  id: string;
  name: string;                  // Bill description
  amount: number;                // Amount due
  frequency: BillFrequency;      // How often it's due
  accountId: string;             // Which account this is paid from
  enabled?: boolean;             // Whether bill is active (undefined defaults to true)
  dueDay?: number;               // Day of month/week it's due (if applicable)
  customFrequencyDays?: number;  // For custom frequency: days between occurrences
  category?: string;             // Optional category for organization
  notes?: string;                // Optional notes
}

/**
 * Loan - A debt or loan with payment tracking
 */
export interface Loan {
  id: string;
  name: string;                        // Loan description (e.g., "Mortgage", "Car Loan")
  type: 'mortgage' | 'auto' | 'student' | 'personal' | 'credit-card' | 'other';
  principal: number;                   // Original loan amount
  currentBalance: number;              // Current remaining balance
  interestRate: number;                // Annual interest rate (percentage)
  propertyTaxRate?: number;            // Annual property tax rate (mortgage only, percentage of property value)
  propertyValue?: number;              // Property value used for mortgage tax calculations
  monthlyPayment: number;              // Monthly payment amount
  paymentFrequency?: Exclude<BillFrequency, 'custom'>; // Original entered payment frequency
  accountId: string;                   // Which account payments come from
  startDate: string;                   // ISO date string when loan started
  termMonths?: number;                 // Total loan term in months (optional)
  insurancePayment?: number;           // Monthly insurance amount (PMI/GAP/etc.) (optional)
  insuranceEndBalance?: number;        // Insurance stops at fixed balance amount (optional)
  insuranceEndBalancePercent?: number; // Insurance stops at % of original principal (optional)
  paymentBreakdown?: LoanPaymentLine[]; // Optional line-item payment components for tracking
  enabled?: boolean;                   // Whether loan is active (undefined defaults to true)
  notes?: string;                      // Optional notes
}

/**
 * LoanPaymentLine - A line item that contributes to a loan's recurring payment total
 */
export interface LoanPaymentLine {
  id: string;
  label: string;                                       // Line-item label (e.g., "Principal & Interest")
  amount: number;                                      // Entered amount for this line item
  frequency: LoanPaymentFrequency;                     // Frequency for this line item amount
}

/**
 * Tab configuration for customizable dashboard tabs
 */
export interface TabConfig {
  id: string;             // Tab identifier
  label: string;          // Display label
  icon: string;           // Emoji/icon
  visible: boolean;       // Whether tab is currently shown
  order: number;          // Display order (lower numbers first)
  pinned: boolean;        // Whether tab cannot be hidden (Key Metrics, Pay Breakdown)
}

/**
 * TabPosition - Where tabs are displayed on screen
 */
export type TabPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * TabDisplayMode - How tabs are displayed in sidebar orientations
 */
export type TabDisplayMode = 'icons-only' | 'icons-with-labels';

/**
 * BudgetSettings - User preferences and app configuration
 */
export interface BudgetSettings {
  currency: string;                  // Currency code (e.g., "USD", "EUR")
  locale: string;                    // Locale for formatting (e.g., "en-US")
  filePath?: string;                 // Where the budget is saved (optional, may not be set yet)
  lastSavedAt?: string;              // ISO date string of last successful save to disk
  encryptionEnabled?: boolean;       // Whether to encrypt budget files (undefined = not set)
  encryptionKey?: string;            // User's encryption key (only if encryption enabled)
  tabConfigs?: TabConfig[];          // Tab visibility and order configuration
  tabPosition?: TabPosition;         // Where tabs are displayed (default: 'top')
  tabDisplayMode?: TabDisplayMode;   // How tabs are displayed in sidebar (default: 'icons-with-labels')
  windowSize?: {                     // Window dimensions and position when last closed
    width: number;
    height: number;
    x: number;
    y: number;
  };
  activeTab?: string;                // Last active tab ID when plan was closed
}

/**
 * AppSettings - Global app settings stored in localStorage
 */
export interface AppSettings {
  encryptionEnabled?: boolean;  // Global preference for encryption (undefined = not set up yet)
  encryptionKey?: string;       // User's master encryption key
  lastOpenedFile?: string;      // Path to last opened budget file
  themeMode?: 'light' | 'dark' | 'system'; // App theme preference mode
  glossaryTermsEnabled?: boolean; // Whether glossary term links are active (hover + click)
}

/**
 * PaycheckBreakdown - Calculated breakdown of a paycheck
 */
export interface TaxLineAmount {
  id: string;
  label: string;
  amount: number;
}

export interface PaycheckBreakdown {
  grossPay: number;              // Total before any deductions
  preTaxDeductions: number;      // Total pre-tax deductions
  taxableIncome: number;         // Gross minus pre-tax deductions
  taxLineAmounts: TaxLineAmount[]; // Per-line tax amounts calculated from taxLines
  additionalWithholding: number; // Additional withholding
  totalTaxes: number;            // Sum of all taxes + additionalWithholding
  netPay: number;                // Take-home pay after all deductions
}

/**
 * BudgetContextType - Describes what the budget context provides
 * This interface defines all the state and functions available via useBudget() hook
 */
export interface BudgetContextType {
  budgetData: BudgetData | null;  // Current budget data (null if none loaded)
  loading: boolean;               // Whether an operation is in progress
  
  // File operations
  saveBudget: (activeTab?: string, budgetOverride?: Partial<BudgetData>) => Promise<boolean>;    // Save to disk with optional active tab and override data, returns true on success
  saveWindowState: (width: number, height: number, x: number, y: number, activeTab?: string) => Promise<void>; // Save only window state
  loadBudget: (filePath?: string) => Promise<void>;     // Load from disk
  createNewBudget: (year: number) => void;              // Create empty plan for a year
  createDemoBudget: () => void;                         // Create demo plan with random realistic data
  closeBudget: () => void;                              // Close current budget (return to welcome)
  selectSaveLocation: () => Promise<void>;              // Choose where to save
  copyPlanToNewYear: (newYear: number) => Promise<void>; // Duplicate plan to new year (with encryption key transfer)
  updateBudgetData: (data: Partial<BudgetData>) => void; // Generic update for any budget data
  
  // Pay settings operations
  updatePaySettings: (settings: PaySettings) => void;
  
  // Deduction operations
  addDeduction: (deduction: Omit<Deduction, 'id'>) => void;
  updateDeduction: (id: string, deduction: Partial<Deduction>) => void;
  deleteDeduction: (id: string) => void;
  
  // Tax settings operations
  updateTaxSettings: (settings: TaxSettings) => void;
  
  // Budget settings operations
  updateBudgetSettings: (settings: BudgetSettings) => void;
  
  // Account operations
  addAccount: (account: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, account: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  
  // Bill operations
  addBill: (bill: Omit<Bill, 'id'>) => void;
  updateBill: (id: string, bill: Partial<Bill>) => void;
  deleteBill: (id: string) => void;
  
  // Loan operations
  addLoan: (loan: Omit<Loan, 'id'>) => void;
  updateLoan: (id: string, loan: Partial<Loan>) => void;
  deleteLoan: (id: string) => void;
  
  // Benefit operations
  addBenefit: (benefit: Omit<Benefit, 'id'>) => void;
  updateBenefit: (id: string, benefit: Partial<Benefit>) => void;
  deleteBenefit: (id: string) => void;

  // Savings operations
  addSavingsContribution: (contribution: Omit<SavingsContribution, 'id'>) => void;
  updateSavingsContribution: (id: string, contribution: Partial<SavingsContribution>) => void;
  deleteSavingsContribution: (id: string) => void;
  
  // Retirement operations
  addRetirementElection: (election: Omit<RetirementElection, 'id'>) => void;
  updateRetirementElection: (id: string, election: Partial<RetirementElection>) => void;
  deleteRetirementElection: (id: string) => void;
  
  // Calculation functions
  calculatePaycheckBreakdown: () => PaycheckBreakdown;
  calculateRetirementContributions: (election: RetirementElection) => { employeeAmount: number; employerAmount: number };
}
