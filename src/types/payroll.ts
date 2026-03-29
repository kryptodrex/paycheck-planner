import type { CoreFrequency, PayFrequency } from './frequencies';

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

export type TaxLineCalculationType = 'percentage' | 'fixed';

export interface TaxLine {
  id: string;
  label: string;
  rate: number;
  amount?: number;
  taxableIncome?: number;
  calculationType?: TaxLineCalculationType;
}

export type TaxFilingStatus = 'single' | 'married_filing_jointly';

export interface TaxSettings {
  taxLines: TaxLine[];
  additionalWithholding: number;
  filingStatus?: TaxFilingStatus;
}

export interface Benefit {
  id: string;
  name: string;
  amount: number;
  enabled?: boolean;
  discretionary?: boolean;
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

export type OtherIncomeType =
  | 'bonus'
  | 'commission'
  | 'personal-business'
  | 'rental-income'
  | 'retirement-withdrawal'
  | 'disability'
  | 'reimbursement'
  | 'investment-income'
  | 'other';

export type OtherIncomeAmountMode = 'fixed' | 'percent-of-gross';

export type OtherIncomePayTreatment = 'gross' | 'taxable' | 'net';

export type OtherIncomeWithholdingMode = 'manual' | 'auto' | 'none';

export type OtherIncomeTimingMode = 'average' | 'payout';

export interface OtherIncome {
  id: string;
  name: string;
  incomeType: OtherIncomeType;
  amountMode: OtherIncomeAmountMode;
  amount: number;
  percentOfGross?: number;
  frequency: CoreFrequency;
  enabled?: boolean;
  notes?: string;
  isTaxable: boolean;
  payTreatment: OtherIncomePayTreatment;
  withholdingMode: OtherIncomeWithholdingMode;
  timingMode?: OtherIncomeTimingMode;
  withholdingProfileId?: string;
  activeMonths?: number[];
}

export interface TaxLineAmount {
  id: string;
  label: string;
  amount: number;
}

export interface OtherIncomeWithholdingAmount {
  id: string;
  label: string;
  amount: number;
  sourceIncomeId: string;
  sourceIncomeName: string;
  profileId: string;
  profileLabel: string;
  rate: number;
  taxableBase: number;
}

export interface PaycheckBreakdown {
  grossPay: number;
  otherIncomeGross?: number;
  otherIncomeTaxable?: number;
  otherIncomeNet?: number;
  otherIncomeAutoWithholding?: number;
  otherIncomeAutoWithholdingLineItems?: OtherIncomeWithholdingAmount[];
  preTaxDeductions: number;
  taxableIncome: number;
  taxLineAmounts: TaxLineAmount[];
  additionalWithholding: number;
  totalTaxes: number;
  netPay: number;
}