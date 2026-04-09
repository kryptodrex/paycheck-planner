import type { OtherIncome } from '../types/payroll';
import { getPayFrequencyOccurrencesPerYear } from './frequency';

export interface OtherIncomePerPaycheckTotals {
  gross: number;
  taxable: number;
  net: number;
}

export function getOtherIncomeOccurrencesPerYear(frequency: OtherIncome['frequency'] | string): number {
  return getPayFrequencyOccurrencesPerYear(frequency);
}

export function getOtherIncomeScheduledOccurrencesPerYear(entry: OtherIncome): number {
  // Active-month scheduling is intentionally disabled for now.
  // We keep the field for backward compatibility but ignore it in calculations.
  return getOtherIncomeOccurrencesPerYear(entry.frequency);
}

export function calculateOtherIncomeAnnualAmount(
  entry: OtherIncome,
  baseGrossPayPerPaycheck: number,
  paychecksPerYear: number,
): number {
  if (entry.enabled === false) {
    return 0;
  }

  const defaultOccurrences = getOtherIncomeOccurrencesPerYear(entry.frequency);
  const scheduledOccurrences = getOtherIncomeScheduledOccurrencesPerYear(entry);
  const scheduleScale = defaultOccurrences > 0 ? scheduledOccurrences / defaultOccurrences : 1;

  if (entry.amountMode === 'percent-of-gross') {
    const annualBaseGross = Math.max(0, baseGrossPayPerPaycheck) * Math.max(0, paychecksPerYear);
    return ((annualBaseGross * Math.max(0, entry.percentOfGross || 0)) / 100) * scheduleScale;
  }

  return Math.max(0, entry.amount || 0) * scheduledOccurrences;
}

export function calculateOtherIncomePerPaycheckAmount(
  entry: OtherIncome,
  baseGrossPayPerPaycheck: number,
  paychecksPerYear: number,
): number {
  if (!Number.isFinite(paychecksPerYear) || paychecksPerYear <= 0) {
    return 0;
  }

  return calculateOtherIncomeAnnualAmount(entry, baseGrossPayPerPaycheck, paychecksPerYear) / paychecksPerYear;
}

export function calculateOtherIncomePerPaycheckTotals(
  entries: OtherIncome[] | undefined,
  baseGrossPayPerPaycheck: number,
  paychecksPerYear: number,
): OtherIncomePerPaycheckTotals {
  const totals = (entries || []).reduce<OtherIncomePerPaycheckTotals>((sum, entry) => {
    const amount = calculateOtherIncomePerPaycheckAmount(entry, baseGrossPayPerPaycheck, paychecksPerYear);

    if (entry.payTreatment === 'taxable') {
      sum.taxable += amount;
      return sum;
    }

    if (entry.payTreatment === 'net') {
      sum.net += amount;
      return sum;
    }

    sum.gross += amount;
    return sum;
  }, { gross: 0, taxable: 0, net: 0 });

  return totals;
}