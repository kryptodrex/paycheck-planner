import type { BillFrequency, LoanPaymentFrequency, SavingsFrequency } from './frequencies';

export interface SavingsContribution {
  id: string;
  name: string;
  amount: number;
  frequency: SavingsFrequency;
  accountId: string;
  type: 'savings' | 'investment';
  enabled?: boolean;
  notes?: string;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  frequency: BillFrequency;
  accountId: string;
  enabled?: boolean;
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
  type: 'mortgage' | 'auto' | 'student' | 'personal' | 'credit-card' | 'other';
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