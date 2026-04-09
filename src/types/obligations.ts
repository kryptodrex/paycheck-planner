import type { BillFrequency, LoanPaymentFrequency, SavingsFrequency } from './frequencies';
import type { LoanType } from '../constants/loanTypes';

export interface SavingsContribution {
  id: string;
  name: string;
  amount: number;
  frequency: SavingsFrequency;
  accountId: string;
  type: 'savings' | 'investment';
  enabled?: boolean;
  notes?: string;
  reallocationProtected?: boolean;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  frequency: BillFrequency;
  accountId: string;
  enabled?: boolean;
  discretionary?: boolean;
  dueDay?: number;
  customFrequencyDays?: number;
  category?: string;
  notes?: string;
}

export interface LoanPaymentLine {
  id: string;
  label: string;
  amount: number;
  frequency: LoanPaymentFrequency;
}

export interface Loan {
  id: string;
  name: string;
  type: LoanType;
  principal: number;
  currentBalance: number;
  interestRate: number;
  propertyTaxRate?: number;
  propertyValue?: number;
  monthlyPayment: number;
  paymentFrequency?: Exclude<BillFrequency, 'custom'>;
  accountId: string;
  startDate: string;
  termMonths?: number;
  insurancePayment?: number;
  insuranceEndBalance?: number;
  insuranceEndBalancePercent?: number;
  paymentBreakdown?: LoanPaymentLine[];
  enabled?: boolean;
  notes?: string;
}