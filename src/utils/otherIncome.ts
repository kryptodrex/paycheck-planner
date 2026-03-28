import type { OtherIncome } from '../types/payroll';
import { roundToCent } from './money';
import { getPayFrequencyOccurrencesPerYear } from './frequency';

export interface OtherIncomePerPaycheckTotals {
  gross: number;
  taxable: number;
  net: number;
}

export function getOtherIncomeOccurrencesPerYear(frequency: OtherIncome['frequency'] | string): number {
  return getPayFrequencyOccurrencesPerYear(frequency);
}

export function calculateOtherIncomeAnnualAmount(
  entry: OtherIncome,
  baseGrossPayPerPaycheck: number,
  paychecksPerYear: number,
): number {
  if (entry.enabled === false) {
    return 0;
  }

  if (entry.amountMode === 'percent-of-gross') {
    const annualBaseGross = Math.max(0, baseGrossPayPerPaycheck) * Math.max(0, paychecksPerYear);
    return (annualBaseGross * Math.max(0, entry.percentOfGross || 0)) / 100;
  }

  return Math.max(0, entry.amount || 0) * getOtherIncomeOccurrencesPerYear(entry.frequency);
}

export function calculateOtherIncomePerPaycheckAmount(
  entry: OtherIncome,
  baseGrossPayPerPaycheck: number,
  paychecksPerYear: number,
): number {
  if (!Number.isFinite(paychecksPerYear) || paychecksPerYear <= 0) {
    return 0;
  }

  return roundToCent(
    calculateOtherIncomeAnnualAmount(entry, baseGrossPayPerPaycheck, paychecksPerYear) / paychecksPerYear,
  );
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

  return {
    gross: roundToCent(totals.gross),
    taxable: roundToCent(totals.taxable),
    net: roundToCent(totals.net),
  };
}