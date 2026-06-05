import type { Account } from './accounts';
import type { BudgetMetadata } from './audit';
import type { Bill, Loan, SavingsContribution } from './obligations';
import type { Benefit, Deduction, OtherIncome, PaySettings, RetirementElection, TaxSettings } from './payroll';
import type { ViewMode } from './payPeriod';

/**
 * Cross-platform budget settings — fields shared by desktop, mobile, and any
 * future platform. Platform adapters extend this with platform-specific fields
 * (e.g. desktop adds tabConfigs, windowSize; mobile adds its own preferences).
 */
export interface BudgetSettings {
  currency: string;
  locale: string;
  displayMode?: ViewMode;
  calendarAccurate?: boolean;
  keyMetricsBreakdownView?: 'flow' | 'stacked' | 'pie';
}

/**
 * The canonical budget plan structure shared across all platforms.
 *
 * TSettings defaults to BudgetSettings, allowing platform adapters to
 * substitute an extended settings type (e.g. DesktopBudgetSettings) while
 * keeping the rest of the plan shape identical.
 */
export interface BudgetData<TSettings extends BudgetSettings = BudgetSettings> {
  id: string;
  name: string;
  year: number;
  paySettings: PaySettings;
  preTaxDeductions: Deduction[];
  otherIncome?: OtherIncome[];
  benefits: Benefit[];
  retirement: RetirementElection[];
  taxSettings: TaxSettings;
  accounts: Account[];
  bills: Bill[];
  loans: Loan[];
  savingsContributions?: SavingsContribution[];
  metadata?: BudgetMetadata;
  settings: TSettings;
  createdAt: string;
  updatedAt: string;
}
