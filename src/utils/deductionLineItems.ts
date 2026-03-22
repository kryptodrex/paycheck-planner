import type { Benefit, RetirementElection } from '../types/payroll';
import type { Deduction } from '../types/payroll';

export type DeductionLineItem = {
  id: string;
  label: string;
  /** Per-paycheck amount (unrounded raw value — mirrors budgetCalculations internals) */
  amount: number;
};

export function getRetirementLabel(election: RetirementElection): string {
  if (election.customLabel) return election.customLabel;
  const labels: Record<string, string> = {
    '401k': '401(k)',
    '403b': '403(b)',
    'roth-ira': 'Roth IRA',
    'traditional-ira': 'Traditional IRA',
    'pension': 'Pension',
    'other': 'Retirement',
  };
  return labels[election.type] ?? 'Retirement';
}

/**
 * Returns individual pre-tax deduction line items (per-paycheck amounts) for
 * display in the Gross-to-Net breakdown. Mirrors the aggregation logic in
 * `calculatePaycheckBreakdown` so displayed items sum to the pre-tax total.
 */
export function buildPreTaxLineItems(
  preTaxDeductions: Deduction[],
  benefits: Benefit[],
  retirement: RetirementElection[],
  grossPayPerPaycheck: number,
): DeductionLineItem[] {
  const items: DeductionLineItem[] = [];

  for (const d of preTaxDeductions) {
    if (d.amount <= 0) continue;
    items.push({
      id: d.id,
      label: d.name,
      amount: d.isPercentage ? (grossPayPerPaycheck * d.amount) / 100 : d.amount,
    });
  }

  for (const b of benefits) {
    if (b.enabled === false) continue;
    if (b.isTaxable) continue;
    if ((b.deductionSource ?? 'paycheck') !== 'paycheck') continue;
    if (b.amount <= 0) continue;
    items.push({
      id: b.id,
      label: b.name,
      amount: b.isPercentage ? (grossPayPerPaycheck * b.amount) / 100 : b.amount,
    });
  }

  for (const r of retirement) {
    if (r.enabled === false) continue;
    if (r.isPreTax === false) continue;
    if ((r.deductionSource ?? 'paycheck') !== 'paycheck') continue;
    if (r.employeeContribution <= 0) continue;
    items.push({
      id: r.id,
      label: getRetirementLabel(r),
      amount: r.employeeContributionIsPercentage
        ? (grossPayPerPaycheck * r.employeeContribution) / 100
        : r.employeeContribution,
    });
  }

  return items;
}

/**
 * Returns individual post-tax deduction line items (per-paycheck amounts) for
 * display in the Gross-to-Net breakdown.
 */
export function buildPostTaxLineItems(
  benefits: Benefit[],
  retirement: RetirementElection[],
  grossPayPerPaycheck: number,
): DeductionLineItem[] {
  const items: DeductionLineItem[] = [];

  for (const b of benefits) {
    if (b.enabled === false) continue;
    if (!b.isTaxable) continue;
    if ((b.deductionSource ?? 'paycheck') !== 'paycheck') continue;
    if (b.amount <= 0) continue;
    items.push({
      id: b.id,
      label: b.name,
      amount: b.isPercentage ? (grossPayPerPaycheck * b.amount) / 100 : b.amount,
    });
  }

  for (const r of retirement) {
    if (r.enabled === false) continue;
    if (r.isPreTax !== false) continue;
    if ((r.deductionSource ?? 'paycheck') !== 'paycheck') continue;
    if (r.employeeContribution <= 0) continue;
    items.push({
      id: r.id,
      label: getRetirementLabel(r),
      amount: r.employeeContributionIsPercentage
        ? (grossPayPerPaycheck * r.employeeContribution) / 100
        : r.employeeContribution,
    });
  }

  return items;
}
