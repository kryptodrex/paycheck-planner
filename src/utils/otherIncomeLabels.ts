import type {
  OtherIncomeAmountMode,
  OtherIncomePayTreatment,
  OtherIncomeTimingMode,
  OtherIncomeType,
  OtherIncomeWithholdingMode,
} from '../types/payroll';

export const OTHER_INCOME_TYPE_OPTIONS: Array<{ value: OtherIncomeType; label: string }> = [
  { value: 'bonus', label: 'Bonus' },
  { value: 'commission', label: 'Commission' },
  { value: 'personal-business', label: 'Personal Business' },
  { value: 'rental-income', label: 'Rental Income' },
  { value: 'retirement-withdrawal', label: 'Retirement Withdrawal' },
  { value: 'disability', label: 'Disability' },
  { value: 'reimbursement', label: 'Reimbursement' },
  { value: 'investment-income', label: 'Investment Income' },
  { value: 'other', label: 'Other' },
];

export const OTHER_INCOME_AMOUNT_MODE_OPTIONS: Array<{ value: OtherIncomeAmountMode; label: string }> = [
  { value: 'fixed', label: 'Fixed Amount' },
  { value: 'percent-of-gross', label: 'Percent of Gross Pay' },
];

export const OTHER_INCOME_PAY_TREATMENT_OPTIONS: Array<{ value: OtherIncomePayTreatment; label: string }> = [
  { value: 'gross', label: 'Add to Gross Pay' },
  { value: 'taxable', label: 'Taxable Only' },
  { value: 'net', label: 'Add to Net Pay' },
];

export const OTHER_INCOME_WITHHOLDING_MODE_OPTIONS: Array<{ value: OtherIncomeWithholdingMode; label: string }> = [
  { value: 'manual', label: 'Manual' },
  { value: 'auto', label: 'Auto' },
  { value: 'none', label: 'None' },
];

export const OTHER_INCOME_TIMING_MODE_OPTIONS: Array<{ value: OtherIncomeTimingMode; label: string }> = [
  { value: 'average', label: 'Average Across Paychecks' },
  { value: 'payout', label: 'Payout Timing (Do Not Average)' },
];

export function getOtherIncomeTypeLabel(value: OtherIncomeType): string {
  return OTHER_INCOME_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? 'Other';
}

export function getOtherIncomeAmountModeLabel(value: OtherIncomeAmountMode): string {
  return OTHER_INCOME_AMOUNT_MODE_OPTIONS.find((option) => option.value === value)?.label ?? 'Fixed Amount';
}

export function getOtherIncomePayTreatmentLabel(value: OtherIncomePayTreatment): string {
  return OTHER_INCOME_PAY_TREATMENT_OPTIONS.find((option) => option.value === value)?.label ?? 'Add to Gross Pay';
}

export function getOtherIncomeWithholdingModeLabel(value: OtherIncomeWithholdingMode): string {
  return OTHER_INCOME_WITHHOLDING_MODE_OPTIONS.find((option) => option.value === value)?.label ?? 'Manual';
}

export function getOtherIncomeTimingModeLabel(value: OtherIncomeTimingMode | undefined): string {
  return OTHER_INCOME_TIMING_MODE_OPTIONS.find((option) => option.value === value)?.label ?? 'Average Across Paychecks';
}