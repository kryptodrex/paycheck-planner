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

  it('keeps annual gross aligned to annual salary for non-even paycheck splits', () => {
    const annualSalary = 123456;
    const paychecksPerYear = 26;
    const breakdown = calculatePaycheckBreakdown({
      paySettings: {
        payType: 'salary',
        annualSalary,
        payFrequency: 'bi-weekly',
      },
      preTaxDeductions: [],
      benefits: [],
      retirement: [],
      taxSettings: {
        taxLines: [],
        additionalWithholding: 0,
      },
    });

    const annualized = calculateAnnualizedPaySummary(breakdown, paychecksPerYear);
    expect(annualized.annualGross).toBe(annualSalary);
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
      otherIncomeGross: 0,
      otherIncomeTaxable: 0,
      otherIncomeNet: 0,
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
      otherIncomeGross: 0,
      otherIncomeTaxable: 0,
      otherIncomeNet: 0,
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

  it('uses fixed tax line amounts when a tax line is configured as fixed', () => {
    const breakdown = calculatePaycheckBreakdown({
      paySettings: {
        payType: 'salary',
        annualSalary: 52000,
        payFrequency: 'bi-weekly',
      },
      preTaxDeductions: [],
      benefits: [],
      retirement: [],
      taxSettings: {
        taxLines: [
          { id: 'tax-fixed', label: 'Local Tax', rate: 0, amount: 75, calculationType: 'fixed' },
          { id: 'tax-percent', label: 'Federal Tax', rate: 10, amount: 0, calculationType: 'percentage' },
        ],
        additionalWithholding: 0,
      },
    });

    expect(breakdown.grossPay).toBe(2000);
    expect(breakdown.taxableIncome).toBe(2000);
    expect(breakdown.taxLineAmounts).toEqual([
      { id: 'tax-fixed', label: 'Local Tax', amount: 75 },
      { id: 'tax-percent', label: 'Federal Tax', amount: 200 },
    ]);
    expect(breakdown.totalTaxes).toBe(275);
    expect(breakdown.netPay).toBe(1725);
  });

  it('applies per-line taxable income when tax lines target different taxable bases', () => {
    const breakdown = calculatePaycheckBreakdown({
      paySettings: {
        payType: 'salary',
        annualSalary: 52000,
        payFrequency: 'bi-weekly',
      },
      preTaxDeductions: [],
      benefits: [],
      retirement: [],
      taxSettings: {
        taxLines: [
          { id: 'tax-federal', label: 'Federal Tax', rate: 10, taxableIncome: 1800, calculationType: 'percentage' },
          { id: 'tax-state', label: 'State Tax', rate: 5, taxableIncome: 1200, calculationType: 'percentage' },
          { id: 'tax-local-fixed', label: 'Local Fixed Tax', rate: 0, amount: 50, taxableIncome: 900, calculationType: 'fixed' },
        ],
        additionalWithholding: 0,
      },
    });

    expect(breakdown.grossPay).toBe(2000);
    expect(breakdown.taxableIncome).toBe(2000);
    expect(breakdown.taxLineAmounts).toEqual([
      { id: 'tax-federal', label: 'Federal Tax', amount: 180 },
      { id: 'tax-state', label: 'State Tax', amount: 60 },
      { id: 'tax-local-fixed', label: 'Local Fixed Tax', amount: 50 },
    ]);
    expect(breakdown.totalTaxes).toBe(290);
    expect(breakdown.netPay).toBe(1710);
  });

  it('dynamically rebases federal and state lines after pre-tax deductions while keeping FICA on gross wages', () => {
    const breakdown = calculatePaycheckBreakdown({
      paySettings: {
        payType: 'salary',
        annualSalary: 52000,
        payFrequency: 'bi-weekly',
      },
      preTaxDeductions: [
        {
          id: 'deduction-1',
          name: 'Traditional 401k',
          amount: 100,
          isPercentage: false,
        },
      ],
      benefits: [],
      retirement: [],
      taxSettings: {
        taxLines: [
          { id: 'tax-federal', label: 'Federal Withholding', rate: 10, taxableIncome: 2000, calculationType: 'percentage' },
          { id: 'tax-state', label: 'State Withholding', rate: 5, taxableIncome: 2000, calculationType: 'percentage' },
          { id: 'tax-ss', label: 'OASDI (USA)', rate: 6.2, taxableIncome: 2000, calculationType: 'percentage' },
          { id: 'tax-medicare', label: 'Medicare (USA)', rate: 1.45, taxableIncome: 2000, calculationType: 'percentage' },
        ],
        additionalWithholding: 0,
      },
    });

    expect(breakdown.grossPay).toBe(2000);
    expect(breakdown.preTaxDeductions).toBe(100);
    expect(breakdown.taxableIncome).toBe(1900);
    expect(breakdown.taxLineAmounts).toEqual([
      { id: 'tax-federal', label: 'Federal Withholding', amount: 190 },
      { id: 'tax-state', label: 'State Withholding', amount: 95 },
      { id: 'tax-ss', label: 'OASDI (USA)', amount: 124 },
      { id: 'tax-medicare', label: 'Medicare (USA)', amount: 29 },
    ]);
    expect(breakdown.totalTaxes).toBe(438);
    expect(breakdown.netPay).toBe(1462);
  });

  it('applies gross, taxable-only, and net-only other income treatments separately', () => {
    const breakdown = calculatePaycheckBreakdown({
      paySettings: {
        payType: 'salary',
        annualSalary: 52000,
        payFrequency: 'bi-weekly',
      },
      preTaxDeductions: [],
      otherIncome: [
        {
          id: 'gross-income',
          name: 'Commission',
          incomeType: 'commission',
          amountMode: 'fixed',
          amount: 260,
          frequency: 'monthly',
          isTaxable: true,
          payTreatment: 'gross',
          withholdingMode: 'auto',
        },
        {
          id: 'taxable-income',
          name: 'Supplemental Taxable',
          incomeType: 'other',
          amountMode: 'fixed',
          amount: 130,
          frequency: 'monthly',
          isTaxable: true,
          payTreatment: 'taxable',
          withholdingMode: 'manual',
        },
        {
          id: 'net-income',
          name: 'Reimbursement',
          incomeType: 'reimbursement',
          amountMode: 'fixed',
          amount: 52,
          frequency: 'monthly',
          isTaxable: false,
          payTreatment: 'net',
          withholdingMode: 'none',
        },
      ],
      benefits: [],
      retirement: [],
      taxSettings: {
        taxLines: [
          { id: 'tax-fed', label: 'Federal Tax', rate: 10, calculationType: 'percentage' },
        ],
        additionalWithholding: 0,
      },
    });

    expect(breakdown.grossPay).toBe(2120);
    expect(breakdown.otherIncomeGross).toBe(120);
    expect(breakdown.otherIncomeTaxable).toBe(60);
    expect(breakdown.otherIncomeNet).toBe(24);
    expect(breakdown.taxableIncome).toBe(2180);
    expect(breakdown.taxLineAmounts).toEqual([
      { id: 'tax-fed', label: 'Federal Tax', amount: 218 },
    ]);
    expect(breakdown.totalTaxes).toBe(218);
    expect(breakdown.netPay).toBe(1986);
  });

  it('annualizes and redisplays other income treatment totals consistently', () => {
    const annualBreakdown = calculateAnnualizedPayBreakdown(
      {
        grossPay: 2120,
        otherIncomeGross: 120,
        otherIncomeTaxable: 60,
        otherIncomeNet: 24,
        preTaxDeductions: 0,
        taxableIncome: 2180,
        taxLineAmounts: [],
        additionalWithholding: 0,
        totalTaxes: 218,
        netPay: 1986,
      },
      26,
    );

    expect(annualBreakdown.otherIncomeGross).toBe(3120);
    expect(annualBreakdown.otherIncomeTaxable).toBe(1560);
    expect(annualBreakdown.otherIncomeNet).toBe(624);

    const monthlyBreakdown = calculateDisplayPayBreakdown(annualBreakdown, 'monthly', 26);
    expect(monthlyBreakdown.otherIncomeGross).toBe(260);
    expect(monthlyBreakdown.otherIncomeTaxable).toBe(130);
    expect(monthlyBreakdown.otherIncomeNet).toBe(52);
  });
});