import type { PayFrequency } from './frequencies';

export type PayType = 'salary' | 'hourly';

export interface PaySettings {
  payType: PayType;
  annualSalary?: number;
  hourlyRate?: number;
  hoursPerPayPeriod?: number;
  payFrequency: PayFrequency;
  firstPaycheckDate?: string;
  semiMonthlyFirstDay?: number;
  semiMonthlySecondDay?: number;
  minLeftover?: number;
}

export interface Deduction {
  id: string;
  name: string;
  amount: number;
  isPercentage: boolean;
}

export interface TaxLine {
  id: string;
  label: string;
  rate: number;
}

export interface TaxSettings {
  taxLines: TaxLine[];
  additionalWithholding: number;
}

export interface Benefit {
  id: string;
  name: string;
  amount: number;
  isTaxable: boolean;
  isPercentage?: boolean;
  deductionSource?: 'paycheck' | 'account';
  sourceAccountId?: string;
}

export interface RetirementElection {
  id: string;
  type: '401k' | '403b' | 'roth-ira' | 'traditional-ira' | 'pension' | 'other';
  customLabel?: string;
  employeeContribution: number;
  employeeContributionIsPercentage: boolean;
  enabled?: boolean;
  isPreTax?: boolean;
  deductionSource?: 'paycheck' | 'account';
  sourceAccountId?: string;
  hasEmployerMatch: boolean;
  employerMatchCap: number;
  employerMatchCapIsPercentage: boolean;
  yearlyLimit?: number;
}

export interface TaxLineAmount {
  id: string;
  label: string;
  amount: number;
}

export interface PaycheckBreakdown {
  grossPay: number;
  preTaxDeductions: number;
  taxableIncome: number;
  taxLineAmounts: TaxLineAmount[];
  additionalWithholding: number;
  totalTaxes: number;
  netPay: number;
}