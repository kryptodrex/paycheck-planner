import type { BillFrequency } from '../types/frequencies';
import { FREQUENCIES } from '../constants/frequencies';
import { roundUpToCent } from './money';
import { getBillFrequencyOccurrencesPerYear } from './frequency';

export function convertBillToYearly(amount: number, frequency: BillFrequency): number {
  // 'custom' bills represent a monthly amount entered by the user
  if (frequency === 'custom') return amount * 12;
  return amount * getBillFrequencyOccurrencesPerYear(frequency);
}

export function convertBillToMonthly(amount: number, frequency: BillFrequency): number {
  if (frequency === 'monthly' || frequency === 'custom') {
    return amount;
  }

  return roundUpToCent(convertBillToYearly(amount, frequency) / 12);
}

const BILL_FREQUENCY_DISPLAY_LABELS: Partial<Record<BillFrequency, string>> = {
  [FREQUENCIES.biWeekly]: 'Bi-weekly',
  [FREQUENCIES.semiAnnual]: 'Semi-annual',
};

export function formatBillFrequency(frequency: BillFrequency): string {
  return BILL_FREQUENCY_DISPLAY_LABELS[frequency] ?? (frequency.charAt(0).toUpperCase() + frequency.slice(1));
}