export type CoreFrequency = 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly' | 'quarterly' | 'yearly';

export type PayFrequency = CoreFrequency;

export type BillFrequency = CoreFrequency | 'quarterly' | 'semi-annual' | 'custom';

export type LoanPaymentFrequency = Exclude<BillFrequency, 'custom'>;

export type SavingsFrequency = CoreFrequency | 'quarterly' | 'semi-annual';