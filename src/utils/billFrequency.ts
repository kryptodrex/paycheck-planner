import type { BillFrequency } from '../types/auth';
import { roundUpToCent } from './money';

export function convertBillToYearly(amount: number, frequency: BillFrequency): number {
  switch (frequency) {
    case 'weekly':
      return amount * 52;
    case 'bi-weekly':
      return amount * 26;
    case 'monthly':
      return amount * 12;
    case 'quarterly':
      return amount * 4;
    case 'semi-annual':
      return amount * 2;
    case 'yearly':
      return amount;
    case 'custom':
      return amount * 12;
    default:
      return amount * 12;
  }
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