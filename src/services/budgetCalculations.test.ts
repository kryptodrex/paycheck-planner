import { describe, expect, it } from 'vitest';
import {
  calculateAnnualizedPayBreakdown,
  calculateAnnualizedPaySummary,
  calculateDisplayPayBreakdown,
  calculatePaycheckBreakdown,
  getEmptyPaycheckBreakdown,
} from './budgetCalculations';

describe('budgetCalculations', () => {
  it('returns an empty breakdown when no data is provided', () => {
    expect(calculatePaycheckBreakdown(null)).toEqual(getEmptyPaycheckBreakdown());
  });

  it('calculates paycheck breakdown using pre-tax and post-tax rules consistently', () => {
    const breakdown = calculatePaycheckBreakdown({
      paySettings: {
        payType: 'salary',
        annualSalary: 130000,
        payFrequency: 'bi-weekly',
        minLeftover: 100,
      },
      preTaxDeductions: [
        {
          id: 'deduction-1',
          name: 'HSA',
          amount: 100,
          isPercentage: false,
        },
      ],
      benefits: [
        {
          id: 'benefit-1',
          name: 'Health Insurance',
          amount: 75,
          isTaxable: false,
          isPercentage: false,
          deductionSource: 'paycheck',
        },
      ],
      retirement: [
        {
          id: 'ret-1',
          type: 'roth-ira',
          employeeContribution: 5,
          employeeContributionIsPercentage: true,
          hasEmployerMatch: false,
          employerMatchCap: 0,
          employerMatchCapIsPercentage: false,
          isPreTax: false,
          deductionSource: 'paycheck',
        },
      ],
      taxSettings: {
        taxLines: [
          { id: 'tax-1', label: 'Federal Tax', rate: 10 },
          { id: 'tax-2', label: 'State Tax', rate: 5 },
        ],
        additionalWithholding: 25,
      },
    });

    expect(breakdown.grossPay).toBe(5000);
    expect(breakdown.preTaxDeductions).toBe(175);
    expect(breakdown.taxableIncome).toBe(4825);
    expect(breakdown.taxLineAmounts).toEqual([
      { id: 'tax-1', label: 'Federal Tax', amount: 482.5 },
      { id: 'tax-2', label: 'State Tax', amount: 241.25 },
    ]);
    expect(breakdown.additionalWithholding).toBe(25);
    expect(breakdown.totalTaxes).toBe(748.75);
    expect(breakdown.netPay).toBe(3826.25);
  });

  it('annualizes gross, net, and tax values from a paycheck breakdown', () => {
    const summary = calculateAnnualizedPaySummary(
      {
        grossPay: 5000,
        preTaxDeductions: 175,
        taxableIncome: 4825,
        taxLineAmounts: [],
        additionalWithholding: 25,
        totalTaxes: 748.75,
        netPay: 3826.25,
      },
      26,
    );

    expect(summary).toEqual({
      annualGross: 130000,
      annualNet: 99482.5,
      annualTaxes: 19467.5,
      monthlyGross: 10833.34,
      monthlyNet: 8290.21,
      monthlyTaxes: 1622.3,
    });
  });

  it('builds annual and display pay breakdowns that stay aligned with the paycheck breakdown', () => {
    const paycheckBreakdown = {
      grossPay: 5000,
      preTaxDeductions: 175,
      taxableIncome: 4825,
      taxLineAmounts: [
        { id: 'tax-1', label: 'Federal Tax', amount: 482.5 },
        { id: 'tax-2', label: 'State Tax', amount: 241.25 },
      ],
      additionalWithholding: 25,
      totalTaxes: 748.75,
      netPay: 3826.25,
    };

    const annualBreakdown = calculateAnnualizedPayBreakdown(paycheckBreakdown, 26);
    const monthlyBreakdown = calculateDisplayPayBreakdown(annualBreakdown, 'monthly', 26);

    expect(annualBreakdown).toEqual({
      grossPay: 130000,
      preTaxDeductions: 4550,
      taxableIncome: 125450,
      taxLineAmounts: [
        { id: 'tax-1', label: 'Federal Tax', amount: 12545 },
        { id: 'tax-2', label: 'State Tax', amount: 6272.5 },
      ],
      additionalWithholding: 650,
      totalTaxes: 19467.5,
      postTaxDeductions: 6500,
      netPay: 99482.5,
    });

    expect(monthlyBreakdown).toEqual({
      grossPay: 10833.34,
      preTaxDeductions: 379.17,
      taxableIncome: 10454.17,
      taxLineAmounts: [
        { id: 'tax-1', label: 'Federal Tax', amount: 1045.42 },
        { id: 'tax-2', label: 'State Tax', amount: 522.71 },
      ],
      additionalWithholding: 54.17,
      totalTaxes: 1622.3,
      postTaxDeductions: 541.67,
      netPay: 8290.21,
    });
  });
});