import {
  formatBillFrequency,
  LOAN_TYPE_METADATA,
  RETIREMENT_PLAN_METADATA,
  type Account,
  type BillFrequency,
  type SavingsFrequency,
  type OtherIncomeAmountMode,
  type OtherIncomePayTreatment,
  type OtherIncomeType,
} from '@paycheck-planner/core';
import type { PickerOption } from '../components/OptionPicker';

const BILL_FREQUENCIES: BillFrequency[] = [
  'weekly',
  'bi-weekly',
  'semi-monthly',
  'monthly',
  'quarterly',
  'semi-annual',
  'yearly',
];

export const BILL_FREQUENCY_OPTIONS: PickerOption<BillFrequency>[] = BILL_FREQUENCIES.map(
  (frequency) => ({ value: frequency, label: formatBillFrequency(frequency) }),
);

export const SAVINGS_FREQUENCY_OPTIONS: PickerOption<SavingsFrequency>[] =
  BILL_FREQUENCY_OPTIONS as PickerOption<SavingsFrequency>[];

export const LOAN_TYPE_OPTIONS = LOAN_TYPE_METADATA.map((meta) => ({
  value: meta.value,
  label: meta.label,
}));

export const RETIREMENT_TYPE_OPTIONS = RETIREMENT_PLAN_METADATA.map((meta) => ({
  value: meta.value,
  label: meta.label,
}));

export const OTHER_INCOME_TYPE_OPTIONS: PickerOption<OtherIncomeType>[] = [
  { value: 'bonus', label: 'Bonus' },
  { value: 'commission', label: 'Commission' },
  { value: 'personal-business', label: 'Personal Business' },
  { value: 'rental-income', label: 'Rental Property' },
  { value: 'retirement-withdrawal', label: 'Retirement Withdrawal' },
  { value: 'disability', label: 'Disability' },
  { value: 'reimbursement', label: 'Reimbursement' },
  { value: 'investment-income', label: 'Investment Income' },
  { value: 'other', label: 'Other' },
];

export const OTHER_INCOME_AMOUNT_MODE_OPTIONS: PickerOption<OtherIncomeAmountMode>[] = [
  { value: 'fixed', label: 'Fixed Amount' },
  { value: 'percent-of-gross', label: '% of Gross' },
];

export const OTHER_INCOME_PAY_TREATMENT_OPTIONS: PickerOption<OtherIncomePayTreatment>[] = [
  { value: 'gross', label: 'Add to Gross' },
  { value: 'taxable', label: 'Taxable Only' },
  { value: 'net', label: 'Add to Net' },
];

export function accountOptions(accounts: Account[]): PickerOption<string>[] {
  return accounts.map((account) => ({ value: account.id, label: account.name }));
}
