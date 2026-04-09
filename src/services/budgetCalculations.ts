import type { BudgetData } from '../types/budget';
import type { OtherIncomeWithholdingAmount, PaycheckBreakdown, TaxLineAmount } from '../types/payroll';
import type { ViewMode } from '../types/viewMode';
import { roundToCent, roundUpToCent } from '../utils/money';
import { getDisplayModeOccurrencesPerYear, getPaychecksPerYear } from '../utils/payPeriod';
import { calculateOtherIncomePerPaycheckAmount, calculateOtherIncomePerPaycheckTotals } from '../utils/otherIncome';
import { calculateOtherIncomeAutoWithholdingDetail } from '../utils/otherIncomeWithholding';
import { calculateTaxLineAmount } from '../utils/taxLines';

type BudgetCalculationInput = Pick<
  BudgetData,
  'paySettings' | 'preTaxDeductions' | 'otherIncome' | 'benefits' | 'retirement' | 'taxSettings'
>;

export interface AnnualizedPaySummary {
  annualGross: number;
  annualNet: number;
  annualTaxes: number;
  monthlyGross: number;
  monthlyNet: number;
  monthlyTaxes: number;
}

export interface PayBreakdownSummary extends PaycheckBreakdown {
  postTaxDeductions: number;
}

export function getEmptyPaycheckBreakdown(): PaycheckBreakdown {
  return {
    grossPay: 0,
    otherIncomeGross: 0,
    otherIncomeTaxable: 0,
    otherIncomeNet: 0,
    preTaxDeductions: 0,
    taxableIncome: 0,
    taxLineAmounts: [],
    additionalWithholding: 0,
    totalTaxes: 0,
    netPay: 0,
  };
}

function calculateFixedOrPercentageAmount(baseAmount: number, amount: number, isPercentage?: boolean): number {
  return isPercentage ? (baseAmount * amount) / 100 : amount;
}

function calculateGrossPayPerPaycheck(input: BudgetCalculationInput): number {
  const { paySettings } = input;

  if (paySettings.payType === 'salary' && paySettings.annualSalary) {
    const paychecksPerYear = getPaychecksPerYear(paySettings.payFrequency);
    return paySettings.annualSalary / paychecksPerYear;
  }

  if (paySettings.payType === 'hourly' && paySettings.hourlyRate && paySettings.hoursPerPayPeriod) {
    return paySettings.hourlyRate * paySettings.hoursPerPayPeriod;
  }

  return 0;
}

export function calculatePaycheckBreakdown(input?: BudgetCalculationInput | null): PaycheckBreakdown {
  if (!input) {
    return getEmptyPaycheckBreakdown();
  }

  const baseGrossPay = calculateGrossPayPerPaycheck(input);
  const paychecksPerYear = getPaychecksPerYear(input.paySettings.payFrequency);
  const otherIncomeTotals = calculateOtherIncomePerPaycheckTotals(input.otherIncome, baseGrossPay, paychecksPerYear);
  const grossPay = baseGrossPay + otherIncomeTotals.gross;
  const benefits = input.benefits || [];
  const retirement = input.retirement || [];

  let totalPreTaxDeductions = input.preTaxDeductions.reduce((sum, deduction) => {
    return sum + calculateFixedOrPercentageAmount(grossPay, deduction.amount, deduction.isPercentage);
  }, 0);

  benefits.forEach((benefit) => {
    if (benefit.enabled === false) {
      return;
    }
    if ((benefit.deductionSource || 'paycheck') !== 'paycheck' || benefit.isTaxable) {
      return;
    }

    totalPreTaxDeductions += calculateFixedOrPercentageAmount(grossPay, benefit.amount, benefit.isPercentage);
  });

  retirement.forEach((election) => {
    if (election.enabled === false) return;
    if ((election.deductionSource || 'paycheck') !== 'paycheck') return;
    if (election.isPreTax === false) return;

    totalPreTaxDeductions += calculateFixedOrPercentageAmount(
      grossPay,
      election.employeeContribution,
      election.employeeContributionIsPercentage,
    );
  });

  const preTaxDeductions = roundUpToCent(totalPreTaxDeductions);
  const taxableIncome = roundUpToCent(grossPay - preTaxDeductions + otherIncomeTotals.taxable);

  const taxLineAmounts: TaxLineAmount[] = (input.taxSettings.taxLines || []).map((line) => ({
    id: line.id,
    label: line.label,
    amount: calculateTaxLineAmount(taxableIncome, line, grossPay),
  }));

  const autoWithholdingDetails = (input.otherIncome || []).reduce<OtherIncomeWithholdingAmount[]>((items, entry) => {
    const taxableBase = calculateOtherIncomePerPaycheckAmount(entry, baseGrossPay, paychecksPerYear);
    const detail = calculateOtherIncomeAutoWithholdingDetail(entry, taxableBase);
    if (!detail) {
      return items;
    }

    items.push({
      id: `other-income-auto-${entry.id}`,
      label: `Auto Withholding - ${entry.name} (${detail.rate}%)`,
      amount: detail.amount,
      sourceIncomeId: detail.entryId,
      sourceIncomeName: detail.entryName,
      profileId: detail.profileId,
      profileLabel: detail.profileLabel,
      rate: detail.rate,
      taxableBase: detail.taxableBase,
    });
    return items;
  }, []);

  const otherIncomeAutoWithholding = roundUpToCent(
    autoWithholdingDetails.reduce((sum, item) => sum + item.amount, 0),
  );

  const additionalWithholding = roundUpToCent(input.taxSettings.additionalWithholding || 0);
  const totalTaxes = roundUpToCent(
    taxLineAmounts.reduce((sum, line) => sum + line.amount, 0)
      + additionalWithholding
      + otherIncomeAutoWithholding,
  );

  let netPayBeforePostTax = roundUpToCent(taxableIncome - totalTaxes);

  benefits.forEach((benefit) => {
    if (benefit.enabled === false) {
      return;
    }
    if ((benefit.deductionSource || 'paycheck') !== 'paycheck' || !benefit.isTaxable) {
      return;
    }

    netPayBeforePostTax -= roundUpToCent(
      calculateFixedOrPercentageAmount(grossPay, benefit.amount, benefit.isPercentage),
    );
  });

  retirement.forEach((election) => {
    if (election.enabled === false) return;
    if ((election.deductionSource || 'paycheck') !== 'paycheck') return;
    if (election.isPreTax !== false) return;

    netPayBeforePostTax -= roundUpToCent(
      calculateFixedOrPercentageAmount(
        grossPay,
        election.employeeContribution,
        election.employeeContributionIsPercentage,
      ),
    );
  });

  return {
    grossPay,
    otherIncomeGross: otherIncomeTotals.gross,
    otherIncomeTaxable: otherIncomeTotals.taxable,
    otherIncomeNet: otherIncomeTotals.net,
    ...(otherIncomeAutoWithholding > 0
      ? {
        otherIncomeAutoWithholding,
        otherIncomeAutoWithholdingLineItems: autoWithholdingDetails,
      }
      : {}),
    preTaxDeductions,
    taxableIncome,
    taxLineAmounts,
    additionalWithholding,
    totalTaxes,
    netPay: roundUpToCent(Math.max(0, netPayBeforePostTax + otherIncomeTotals.net)),
  };
}

export function calculateAnnualizedPaySummary(
  breakdown: PaycheckBreakdown,
  paychecksPerYear: number,
): AnnualizedPaySummary {
  const annualGross = roundToCent(breakdown.grossPay * paychecksPerYear);
  const annualNet = roundToCent(breakdown.netPay * paychecksPerYear);
  const annualTaxes = roundToCent(breakdown.totalTaxes * paychecksPerYear);

  return {
    annualGross,
    annualNet,
    annualTaxes,
    monthlyGross: roundToCent(annualGross / 12),
    monthlyNet: roundToCent(annualNet / 12),
    monthlyTaxes: roundToCent(annualTaxes / 12),
  };
}

export function calculateAnnualizedPayBreakdown(
  breakdown: PaycheckBreakdown,
  paychecksPerYear: number,
): PayBreakdownSummary {
  const annualGross = roundToCent(breakdown.grossPay * paychecksPerYear);
  const annualOtherIncomeGross = roundToCent((breakdown.otherIncomeGross || 0) * paychecksPerYear);
  const annualOtherIncomeTaxable = roundToCent((breakdown.otherIncomeTaxable || 0) * paychecksPerYear);
  const annualOtherIncomeNet = roundToCent((breakdown.otherIncomeNet || 0) * paychecksPerYear);
  const annualOtherIncomeAutoWithholding = roundToCent((breakdown.otherIncomeAutoWithholding || 0) * paychecksPerYear);
  const annualOtherIncomeAutoWithholdingLineItems = (breakdown.otherIncomeAutoWithholdingLineItems || []).map((line) => ({
    ...line,
    amount: roundToCent(line.amount * paychecksPerYear),
    taxableBase: roundToCent(line.taxableBase * paychecksPerYear),
  }));
  const annualPreTaxDeductions = roundToCent(breakdown.preTaxDeductions * paychecksPerYear);
  const annualTaxableIncome = roundToCent(breakdown.taxableIncome * paychecksPerYear);
  const annualTaxLineAmounts = breakdown.taxLineAmounts.map((line) => ({
    ...line,
    amount: roundToCent(line.amount * paychecksPerYear),
  }));
  const annualAdditionalWithholding = roundToCent(breakdown.additionalWithholding * paychecksPerYear);
  const annualTotalTaxes = roundToCent(breakdown.totalTaxes * paychecksPerYear);
  const annualNetPay = roundToCent(breakdown.netPay * paychecksPerYear);
  const annualPostTaxDeductions = roundToCent(
    Math.max(0, annualGross - annualPreTaxDeductions - annualTotalTaxes - annualNetPay),
  );

  return {
    grossPay: annualGross,
    otherIncomeGross: annualOtherIncomeGross,
    otherIncomeTaxable: annualOtherIncomeTaxable,
    otherIncomeNet: annualOtherIncomeNet,
    ...(annualOtherIncomeAutoWithholding > 0
      ? {
        otherIncomeAutoWithholding: annualOtherIncomeAutoWithholding,
        otherIncomeAutoWithholdingLineItems: annualOtherIncomeAutoWithholdingLineItems,
      }
      : {}),
    preTaxDeductions: annualPreTaxDeductions,
    taxableIncome: annualTaxableIncome,
    taxLineAmounts: annualTaxLineAmounts,
    additionalWithholding: annualAdditionalWithholding,
    totalTaxes: annualTotalTaxes,
    postTaxDeductions: annualPostTaxDeductions,
    netPay: annualNetPay,
  };
}

/**
 * Scales a per-paycheck breakdown by the number of paychecks in a calendar period
 * (a specific month or quarter). Returns the same `PayBreakdownSummary` shape as
 * `calculateAnnualizedPayBreakdown`, so downstream display code is unaware of
 * which path produced the result.
 *
 * When `paychecksInPeriod` is 0 (e.g. a month that falls before the first paycheck),
 * every field is zero.
 */
export function calculateCalendarPeriodBreakdown(
  perPaycheckBreakdown: PaycheckBreakdown,
  paychecksInPeriod: number,
): PayBreakdownSummary {
  if (paychecksInPeriod <= 0) {
    return { ...getEmptyPaycheckBreakdown(), postTaxDeductions: 0 };
  }
  // The multiplication logic is identical to annualizing — only the multiplier differs.
  return calculateAnnualizedPayBreakdown(perPaycheckBreakdown, paychecksInPeriod);
}

export function calculateDisplayPayBreakdown(
  annualBreakdown: PayBreakdownSummary,
  mode: ViewMode,
  paychecksPerYear: number,
): PayBreakdownSummary {
  const divisor = getDisplayModeOccurrencesPerYear(mode, paychecksPerYear);

  return {
    grossPay: roundToCent(annualBreakdown.grossPay / divisor),
    otherIncomeGross: roundToCent((annualBreakdown.otherIncomeGross || 0) / divisor),
    otherIncomeTaxable: roundToCent((annualBreakdown.otherIncomeTaxable || 0) / divisor),
    otherIncomeNet: roundToCent((annualBreakdown.otherIncomeNet || 0) / divisor),
    ...(annualBreakdown.otherIncomeAutoWithholding && annualBreakdown.otherIncomeAutoWithholding > 0
      ? {
        otherIncomeAutoWithholding: roundToCent(annualBreakdown.otherIncomeAutoWithholding / divisor),
        otherIncomeAutoWithholdingLineItems: (annualBreakdown.otherIncomeAutoWithholdingLineItems || []).map((line) => ({
          ...line,
          amount: roundToCent(line.amount / divisor),
          taxableBase: roundToCent(line.taxableBase / divisor),
        })),
      }
      : {}),
    preTaxDeductions: roundToCent(annualBreakdown.preTaxDeductions / divisor),
    taxableIncome: roundToCent(annualBreakdown.taxableIncome / divisor),
    taxLineAmounts: annualBreakdown.taxLineAmounts.map((line) => ({
      ...line,
      amount: roundToCent(line.amount / divisor),
    })),
    additionalWithholding: roundToCent(annualBreakdown.additionalWithholding / divisor),
    totalTaxes: roundToCent(annualBreakdown.totalTaxes / divisor),
    postTaxDeductions: roundToCent(annualBreakdown.postTaxDeductions / divisor),
    netPay: roundToCent(annualBreakdown.netPay / divisor),
  };
}