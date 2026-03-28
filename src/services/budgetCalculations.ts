import type { BudgetData } from '../types/budget';
import type { PaycheckBreakdown, TaxLineAmount } from '../types/payroll';
import type { ViewMode } from '../types/viewMode';
import { roundUpToCent } from '../utils/money';
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
  const annualGross = roundUpToCent(breakdown.grossPay * paychecksPerYear);
  const annualNet = roundUpToCent(breakdown.netPay * paychecksPerYear);
  const annualTaxes = roundUpToCent(breakdown.totalTaxes * paychecksPerYear);

  return {
    annualGross,
    annualNet,
    annualTaxes,
    monthlyGross: roundUpToCent(annualGross / 12),
    monthlyNet: roundUpToCent(annualNet / 12),
    monthlyTaxes: roundUpToCent(annualTaxes / 12),
  };
}

export function calculateAnnualizedPayBreakdown(
  breakdown: PaycheckBreakdown,
  paychecksPerYear: number,
): PayBreakdownSummary {
  const annualGross = roundUpToCent(breakdown.grossPay * paychecksPerYear);
  const annualOtherIncomeGross = roundUpToCent((breakdown.otherIncomeGross || 0) * paychecksPerYear);
  const annualOtherIncomeTaxable = roundUpToCent((breakdown.otherIncomeTaxable || 0) * paychecksPerYear);
  const annualOtherIncomeNet = roundUpToCent((breakdown.otherIncomeNet || 0) * paychecksPerYear);
  const annualPreTaxDeductions = roundUpToCent(breakdown.preTaxDeductions * paychecksPerYear);
  const annualTaxableIncome = roundUpToCent(breakdown.taxableIncome * paychecksPerYear);
  const annualTaxLineAmounts = breakdown.taxLineAmounts.map((line) => ({
    ...line,
    amount: roundUpToCent(line.amount * paychecksPerYear),
  }));
  const annualAdditionalWithholding = roundUpToCent(breakdown.additionalWithholding * paychecksPerYear);
  const annualTotalTaxes = roundUpToCent(breakdown.totalTaxes * paychecksPerYear);
  const annualNetPay = roundUpToCent(breakdown.netPay * paychecksPerYear);
  const annualPostTaxDeductions = roundUpToCent(
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
    grossPay: roundUpToCent(annualBreakdown.grossPay / divisor),
    otherIncomeGross: roundUpToCent((annualBreakdown.otherIncomeGross || 0) / divisor),
    otherIncomeTaxable: roundUpToCent((annualBreakdown.otherIncomeTaxable || 0) / divisor),
    otherIncomeNet: roundUpToCent((annualBreakdown.otherIncomeNet || 0) / divisor),
    preTaxDeductions: roundUpToCent(annualBreakdown.preTaxDeductions / divisor),
    taxableIncome: roundUpToCent(annualBreakdown.taxableIncome / divisor),
    taxLineAmounts: annualBreakdown.taxLineAmounts.map((line) => ({
      ...line,
      amount: roundUpToCent(line.amount / divisor),
    })),
    additionalWithholding: roundUpToCent(annualBreakdown.additionalWithholding / divisor),
    totalTaxes: roundUpToCent(annualBreakdown.totalTaxes / divisor),
    postTaxDeductions: roundUpToCent(annualBreakdown.postTaxDeductions / divisor),
    netPay: roundUpToCent(annualBreakdown.netPay / divisor),
  };
}