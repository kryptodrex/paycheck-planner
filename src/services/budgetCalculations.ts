import type { BudgetData } from '../types/budget';
import type { PaycheckBreakdown, TaxLineAmount } from '../types/payroll';
import type { ViewMode } from '../types/viewMode';
import { roundToCent, roundUpToCent } from '../utils/money';
import { getDisplayModeOccurrencesPerYear, getPaychecksPerYear } from '../utils/payPeriod';
import { calculateOtherIncomePerPaycheckTotals } from '../utils/otherIncome';
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

  const additionalWithholding = roundUpToCent(input.taxSettings.additionalWithholding || 0);
  const totalTaxes = roundUpToCent(
    taxLineAmounts.reduce((sum, line) => sum + line.amount, 0) + additionalWithholding,
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
    preTaxDeductions: annualPreTaxDeductions,
    taxableIncome: annualTaxableIncome,
    taxLineAmounts: annualTaxLineAmounts,
    additionalWithholding: annualAdditionalWithholding,
    totalTaxes: annualTotalTaxes,
    postTaxDeductions: annualPostTaxDeductions,
    netPay: annualNetPay,
  };
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