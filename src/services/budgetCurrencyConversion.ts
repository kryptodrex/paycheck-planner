import type { BudgetData } from '../types/budget';

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function convertCurrencyValue(value: number | undefined, exchangeRate: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return value;
  }

  return roundCurrency(value * exchangeRate);
}

export function convertBudgetAmounts(data: BudgetData, exchangeRate: number): BudgetData {
  return {
    ...data,
    paySettings: {
      ...data.paySettings,
      annualSalary: convertCurrencyValue(data.paySettings.annualSalary, exchangeRate),
      hourlyRate: convertCurrencyValue(data.paySettings.hourlyRate, exchangeRate),
      minLeftover: convertCurrencyValue(data.paySettings.minLeftover, exchangeRate),
    },
    preTaxDeductions: data.preTaxDeductions.map((deduction) => ({
      ...deduction,
      amount: deduction.isPercentage ? deduction.amount : convertCurrencyValue(deduction.amount, exchangeRate) || 0,
    })),
    benefits: data.benefits.map((benefit) => ({
      ...benefit,
      amount: benefit.isPercentage ? benefit.amount : convertCurrencyValue(benefit.amount, exchangeRate) || 0,
    })),
    retirement: data.retirement.map((election) => ({
      ...election,
      employeeContribution: election.employeeContributionIsPercentage
        ? election.employeeContribution
        : convertCurrencyValue(election.employeeContribution, exchangeRate) || 0,
      employerMatchCap: election.employerMatchCapIsPercentage
        ? election.employerMatchCap
        : convertCurrencyValue(election.employerMatchCap, exchangeRate) || 0,
      yearlyLimit: convertCurrencyValue(election.yearlyLimit, exchangeRate),
    })),
    taxSettings: {
      ...data.taxSettings,
      additionalWithholding: convertCurrencyValue(data.taxSettings.additionalWithholding, exchangeRate) || 0,
    },
    accounts: data.accounts.map((account) => ({
      ...account,
      allocation: convertCurrencyValue(account.allocation, exchangeRate),
      allocationCategories: (account.allocationCategories || []).map((category) => ({
        ...category,
        amount: convertCurrencyValue(category.amount, exchangeRate) || 0,
      })),
    })),
    bills: data.bills.map((bill) => ({
      ...bill,
      amount: convertCurrencyValue(bill.amount, exchangeRate) || 0,
    })),
    loans: data.loans.map((loan) => ({
      ...loan,
      principal: convertCurrencyValue(loan.principal, exchangeRate) || 0,
      currentBalance: convertCurrencyValue(loan.currentBalance, exchangeRate) || 0,
      monthlyPayment: convertCurrencyValue(loan.monthlyPayment, exchangeRate) || 0,
      propertyValue: convertCurrencyValue(loan.propertyValue, exchangeRate),
      insurancePayment: convertCurrencyValue(loan.insurancePayment, exchangeRate),
      insuranceEndBalance: convertCurrencyValue(loan.insuranceEndBalance, exchangeRate),
      paymentBreakdown: loan.paymentBreakdown?.map((line) => ({
        ...line,
        amount: convertCurrencyValue(line.amount, exchangeRate) || 0,
      })),
    })),
    savingsContributions: (data.savingsContributions || []).map((contribution) => ({
      ...contribution,
      amount: convertCurrencyValue(contribution.amount, exchangeRate) || 0,
    })),
  };
}