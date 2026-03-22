import type { Account } from './accounts';
import type { BudgetMetadata } from './audit';
import type { Bill, Loan, SavingsContribution } from './obligations';
import type { Benefit, Deduction, PaySettings, RetirementElection, TaxSettings } from './payroll';
import type { BudgetSettings } from './settings';

export interface BudgetData {
  id: string;
  name: string;
  year: number;
  paySettings: PaySettings;
  preTaxDeductions: Deduction[];
  benefits: Benefit[];
  retirement: RetirementElection[];
  taxSettings: TaxSettings;
  accounts: Account[];
  bills: Bill[];
  loans: Loan[];
  savingsContributions?: SavingsContribution[];
  metadata?: BudgetMetadata;
  settings: BudgetSettings;
  createdAt: string;
  updatedAt: string;
}