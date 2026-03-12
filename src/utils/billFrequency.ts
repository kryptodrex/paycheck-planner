import type { BillFrequency } from '../types/auth';
import { roundUpToCent } from './money';
import { getBillFrequencyOccurrencesPerYear } from './frequency';

export function convertBillToYearly(amount: number, frequency: BillFrequency): number {
  return amount * getBillFrequencyOccurrencesPerYear(frequency);
}

export function convertBillToMonthly(amount: number, frequency: BillFrequency): number {
  if (frequency === 'monthly' || frequency === 'custom') {
    return amount;
  }

  return roundUpToCent(convertBillToYearly(amount, frequency) / 12);
}

export function formatBillFrequency(frequency: BillFrequency): string {
  switch (frequency) {
    case 'bi-weekly':
      return 'Bi-weekly';
    case 'semi-annual':
      return 'Semi-annual';
    default:
      return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  }
}