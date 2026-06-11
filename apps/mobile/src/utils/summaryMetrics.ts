import {
  buildKeyMetricsSegments,
  calculateAnnualizedPayBreakdown,
  calculateAnnualizedPaySummary,
  calculatePaycheckBreakdown,
  convertBillToYearly,
  getBillFrequencyOccurrencesPerYear,
  getPaychecksPerYear,
  getSavingsFrequencyOccurrencesPerYear,
  roundToCent,
  roundUpToCent,
  type BudgetData,
  type KeyMetricsSegment,
  type KeyMetricsSummaryRow,
  type PaycheckBreakdown,
  type RetirementElection,
} from '@paycheck-planner/core';

// Ported from the desktop KeyMetrics tab so both platforms render identical
// numbers (apps/desktop/src/components/tabViews/KeyMetrics/KeyMetrics.tsx).

const AUTO_ALLOCATION_PREFIXES = ['__bills_', '__benefits_', '__retirement_', '__loans_', '__savings_'];

const isAutoAllocationCategoryId = (categoryId: string): boolean =>
  AUTO_ALLOCATION_PREFIXES.some((prefix) => categoryId.startsWith(prefix));

const calculateBillPerPaycheck = (
  amount: number,
  frequency: string,
  paychecksPerYear: number,
): number => {
  const billsPerYear = getBillFrequencyOccurrencesPerYear(frequency);
  return roundUpToCent((amount * billsPerYear) / paychecksPerYear);
};

function retirementEmployeePerPaycheck(election: RetirementElection, grossPay: number): number {
  if (election.enabled === false || grossPay === 0) return 0;
  return election.employeeContributionIsPercentage
    ? roundToCent((grossPay * election.employeeContribution) / 100)
    : roundToCent(election.employeeContribution);
}

function calculateRemainingForSpendingPerPaycheck(
  plan: BudgetData,
  grossPayPerPaycheck: number,
  netPayPerPaycheck: number,
  paychecksPerYear: number,
): number {
  const totalAllocated = plan.accounts.reduce((accountSum, account) => {
    const userCategories = (account.allocationCategories || []).filter(
      (category) => !isAutoAllocationCategoryId(category.id),
    );
    const userTotal = userCategories.reduce((sum, category) => sum + Math.max(0, category.amount || 0), 0);

    const accountBills = plan.bills.filter(
      (bill) => bill.enabled !== false && bill.accountId === account.id,
    );
    const accountBenefits = plan.benefits.filter(
      (benefit) =>
        benefit.enabled !== false &&
        benefit.deductionSource === 'account' &&
        benefit.sourceAccountId === account.id,
    );
    const accountRetirement = plan.retirement.filter(
      (election) =>
        election.enabled !== false &&
        election.deductionSource === 'account' &&
        election.sourceAccountId === account.id,
    );
    const accountLoans = (plan.loans || []).filter(
      (loan) => loan.enabled !== false && loan.accountId === account.id,
    );
    const accountSavings = (plan.savingsContributions || []).filter(
      (item) => item.enabled !== false && item.accountId === account.id,
    );

    const billsPerPaycheck = accountBills.reduce(
      (sum, bill) => sum + calculateBillPerPaycheck(bill.amount, bill.frequency, paychecksPerYear),
      0,
    );

    const accountDeductionsPerPaycheck = accountBenefits.reduce((sum, benefit) => {
      const amountPerPaycheck = benefit.isPercentage
        ? roundUpToCent((grossPayPerPaycheck * benefit.amount) / 100)
        : roundUpToCent(benefit.amount);
      return sum + amountPerPaycheck;
    }, 0);

    const accountRetirementPerPaycheck = accountRetirement.reduce((sum, election) => {
      const employeePerPaycheck = election.employeeContributionIsPercentage
        ? roundToCent((grossPayPerPaycheck * election.employeeContribution) / 100)
        : roundToCent(election.employeeContribution);
      return sum + employeePerPaycheck;
    }, 0);

    const accountLoansPerPaycheck = accountLoans.reduce(
      (sum, loan) => sum + (loan.monthlyPayment * 12) / paychecksPerYear,
      0,
    );

    const accountSavingsPerPaycheck = accountSavings.reduce((sum, item) => {
      const occurrencesPerYear = getSavingsFrequencyOccurrencesPerYear(item.frequency);
      const perPaycheck =
        occurrencesPerYear === paychecksPerYear
          ? roundUpToCent(item.amount)
          : roundUpToCent((item.amount * occurrencesPerYear) / paychecksPerYear);
      return sum + perPaycheck;
    }, 0);

    const autoBillsAndDeductions =
      accountBills.length > 0 || accountBenefits.length > 0
        ? roundUpToCent(billsPerPaycheck + accountDeductionsPerPaycheck)
        : 0;
    const autoRetirement = accountRetirement.length > 0 ? roundUpToCent(accountRetirementPerPaycheck) : 0;
    const autoLoans = accountLoans.length > 0 ? roundUpToCent(accountLoansPerPaycheck) : 0;
    const autoSavings = accountSavings.length > 0 ? roundUpToCent(accountSavingsPerPaycheck) : 0;

    return accountSum + userTotal + autoBillsAndDeductions + autoRetirement + autoLoans + autoSavings;
  }, 0);

  return netPayPerPaycheck - totalAllocated;
}

export interface SummaryMetrics {
  breakdown: PaycheckBreakdown;
  paychecksPerYear: number;
  annualGross: number;
  annualNet: number;
  annualTaxes: number;
  monthlyNet: number;
  annualBills: number;
  annualSavings: number;
  savingsRate: number;
  effectiveTaxRate: number;
  annualRecurringExpenses: number;
  monthlyRecurringExpenses: number;
  recurringExpenseCount: number;
  remainingPerPaycheck: number;
  annualRemainingForSpending: number;
  barSegments: KeyMetricsSegment[];
  flowRows: KeyMetricsSummaryRow[];
}

export function computeSummaryMetrics(plan: BudgetData): SummaryMetrics {
  const breakdown = calculatePaycheckBreakdown(plan);
  const paychecksPerYear = getPaychecksPerYear(plan.paySettings.payFrequency);
  const { annualGross, annualNet, annualTaxes, monthlyNet } = calculateAnnualizedPaySummary(
    breakdown,
    paychecksPerYear,
  );
  const annualizedBreakdown = calculateAnnualizedPayBreakdown(breakdown, paychecksPerYear);

  const annualBills = roundUpToCent(
    plan.bills
      .filter((bill) => bill.enabled !== false)
      .reduce((sum, bill) => sum + convertBillToYearly(bill.amount, bill.frequency), 0),
  );

  const annualRecurringDeductions = roundUpToCent(
    (plan.benefits || []).reduce((sum, benefit) => {
      if (benefit.enabled === false) return sum;
      const perPaycheck = benefit.isPercentage
        ? roundToCent((breakdown.grossPay * benefit.amount) / 100)
        : roundToCent(benefit.amount);
      return sum + perPaycheck * paychecksPerYear;
    }, 0),
  );

  const annualLoanPayments = roundUpToCent(
    (plan.loans || []).reduce((sum, loan) => {
      if (loan.enabled === false) return sum;
      return sum + loan.monthlyPayment * 12;
    }, 0),
  );

  const customAllocationItems = (plan.accounts || []).flatMap((account) =>
    (account.allocationCategories || []).filter((category) => !isAutoAllocationCategoryId(category.id)),
  );

  const annualCustomAllocationItems = roundUpToCent(
    customAllocationItems.reduce(
      (sum, category) => sum + Math.max(0, category.amount || 0) * paychecksPerYear,
      0,
    ),
  );

  const annualRecurringExpenses = roundUpToCent(
    annualBills + annualRecurringDeductions + annualLoanPayments + annualCustomAllocationItems,
  );
  const monthlyRecurringExpenses = roundUpToCent(annualRecurringExpenses / 12);
  const recurringExpenseCount =
    plan.bills.length +
    plan.benefits.length +
    (plan.loans || []).length +
    customAllocationItems.length;

  const annualRemainingBeforeSavings = roundUpToCent(annualNet - annualBills);

  const remainingPerPaycheck = calculateRemainingForSpendingPerPaycheck(
    plan,
    breakdown.grossPay,
    breakdown.netPay,
    paychecksPerYear,
  );
  const annualRemainingForSpending = roundUpToCent(remainingPerPaycheck * paychecksPerYear);

  const savingsAccounts = plan.accounts.filter((account) => account.type === 'savings');
  const annualSavingsFromAccounts = roundUpToCent(
    savingsAccounts.reduce((sum, account) => {
      const categories = account.allocationCategories || [];
      const accountTotal = categories.reduce((catSum, cat) => catSum + cat.amount, 0);
      return sum + accountTotal * paychecksPerYear;
    }, 0),
  );

  const annualSavingsFromContributions = roundUpToCent(
    (plan.savingsContributions || []).reduce((sum, contribution) => {
      if (contribution.enabled === false) return sum;
      return sum + contribution.amount * getSavingsFrequencyOccurrencesPerYear(contribution.frequency);
    }, 0),
  );

  const annualPaycheckRetirementPreTax = roundUpToCent(
    (plan.retirement || []).reduce((sum, election) => {
      if (election.enabled === false) return sum;
      if ((election.deductionSource || 'paycheck') !== 'paycheck') return sum;
      if (election.isPreTax === false) return sum;
      return sum + retirementEmployeePerPaycheck(election, breakdown.grossPay) * paychecksPerYear;
    }, 0),
  );

  const annualPaycheckRetirementPostTax = roundUpToCent(
    (plan.retirement || []).reduce((sum, election) => {
      if (election.enabled === false) return sum;
      if ((election.deductionSource || 'paycheck') !== 'paycheck') return sum;
      if (election.isPreTax !== false) return sum;
      return sum + retirementEmployeePerPaycheck(election, breakdown.grossPay) * paychecksPerYear;
    }, 0),
  );

  const annualAccountRetirementSavings = roundUpToCent(
    (plan.retirement || []).reduce((sum, election) => {
      if (election.enabled === false) return sum;
      if ((election.deductionSource || 'paycheck') !== 'account') return sum;
      return sum + retirementEmployeePerPaycheck(election, breakdown.grossPay) * paychecksPerYear;
    }, 0),
  );

  const annualSavings = roundUpToCent(
    annualSavingsFromAccounts +
      annualSavingsFromContributions +
      annualPaycheckRetirementPreTax +
      annualPaycheckRetirementPostTax +
      annualAccountRetirementSavings,
  );

  const savingsRate = annualGross > 0 ? (annualSavings / annualGross) * 100 : 0;
  const effectiveTaxRate = annualGross > 0 ? (annualTaxes / annualGross) * 100 : 0;
  const annualPreTaxDeductions = roundUpToCent(
    Math.max(annualizedBreakdown.preTaxDeductions - annualPaycheckRetirementPreTax, 0),
  );
  const annualPostTaxDeductions = roundUpToCent(
    Math.max(annualizedBreakdown.postTaxDeductions - annualPaycheckRetirementPostTax, 0),
  );

  const annualBillsCoveredByNet = roundUpToCent(
    Math.min(Math.max(annualBills, 0), Math.max(annualNet, 0)),
  );
  const annualRemainingPositive = roundUpToCent(Math.max(annualRemainingBeforeSavings, 0));
  const annualShortfall = roundUpToCent(Math.max(-annualRemainingBeforeSavings, 0));
  const annualSavingsInBar = roundUpToCent(Math.min(annualSavings, annualRemainingPositive));
  const annualFlexibleRemaining = roundUpToCent(
    Math.max(annualRemainingPositive - annualSavingsInBar, 0),
  );

  const { barSegments, flowRows } = buildKeyMetricsSegments({
    annualGross,
    annualTaxes,
    annualPreTaxDeductions,
    annualPostTaxDeductions,
    annualBillsCoveredByNet,
    annualSavingsInBar,
    annualFlexibleRemaining,
    annualShortfall,
  });

  return {
    breakdown,
    paychecksPerYear,
    annualGross,
    annualNet,
    annualTaxes,
    monthlyNet,
    annualBills,
    annualSavings,
    savingsRate,
    effectiveTaxRate,
    annualRecurringExpenses,
    monthlyRecurringExpenses,
    recurringExpenseCount,
    remainingPerPaycheck,
    annualRemainingForSpending,
    barSegments,
    flowRows,
  };
}
