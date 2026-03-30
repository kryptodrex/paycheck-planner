import { describe, expect, it } from 'vitest';
import {
  calculateAnnualizedPayBreakdown,
  calculateAnnualizedPaySummary,
  calculateCalendarPeriodBreakdown,
  calculateDisplayPayBreakdown,
  calculatePaycheckBreakdown,
  getEmptyPaycheckBreakdown,
} from './budgetCalculations';
import { getPaychecksInMonth } from '../utils/payCalendar';

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
      monthlyGross: 10833.33,
      monthlyNet: 8290.21,
      monthlyTaxes: 1622.29,
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
      grossPay: 10833.33,
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
      totalTaxes: 1622.29,
      postTaxDeductions: 541.67,
      netPay: 8290.21,
    });
  });

  it('keeps annual gross and gross other income exact for percent-of-gross entries', () => {
    const paychecksPerYear = 26;
    const breakdown = calculatePaycheckBreakdown({
      paySettings: {
        payType: 'salary',
        annualSalary: 90000,
        payFrequency: 'bi-weekly',
      },
      preTaxDeductions: [],
      otherIncome: [
        {
          id: 'bonus-percent',
          name: 'Annual Bonus',
          incomeType: 'bonus',
          amountMode: 'percent-of-gross',
          amount: 0,
          percentOfGross: 9,
          frequency: 'yearly',
          isTaxable: true,
          payTreatment: 'gross',
          withholdingMode: 'manual',
        },
      ],
      benefits: [],
      retirement: [],
      taxSettings: {
        taxLines: [],
        additionalWithholding: 0,
      },
    });

    const annualized = calculateAnnualizedPayBreakdown(breakdown, paychecksPerYear);

    expect(annualized.otherIncomeGross).toBe(8100);
    expect(annualized.grossPay).toBe(98100);
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
    expect(breakdown.otherIncomeAutoWithholding).toBe(26.4);
    expect(breakdown.otherIncomeAutoWithholdingLineItems).toEqual([
      {
        id: 'other-income-auto-gross-income',
        label: 'Auto Withholding - Commission (22%)',
        amount: 26.4,
        sourceIncomeId: 'gross-income',
        sourceIncomeName: 'Commission',
        profileId: 'general-supplemental',
        profileLabel: 'General Supplemental Income',
        rate: 22,
        taxableBase: 120,
      },
    ]);
    expect(breakdown.taxLineAmounts).toEqual([
      { id: 'tax-fed', label: 'Federal Tax', amount: 218 },
    ]);
    expect(breakdown.totalTaxes).toBe(244.4);
    expect(breakdown.netPay).toBe(1959.6);
  });

  it('adds auto-withholding deltas without mutating manual tax lines or manual withholding', () => {
    const breakdown = calculatePaycheckBreakdown({
      paySettings: {
        payType: 'salary',
        annualSalary: 52000,
        payFrequency: 'bi-weekly',
      },
      preTaxDeductions: [],
      otherIncome: [
        {
          id: 'auto-bonus',
          name: 'Annual Bonus',
          incomeType: 'bonus',
          amountMode: 'fixed',
          amount: 2600,
          frequency: 'yearly',
          isTaxable: true,
          payTreatment: 'gross',
          withholdingMode: 'auto',
        },
        {
          id: 'manual-income',
          name: 'Manual Income',
          incomeType: 'other',
          amountMode: 'fixed',
          amount: 130,
          frequency: 'monthly',
          isTaxable: true,
          payTreatment: 'taxable',
          withholdingMode: 'manual',
        },
      ],
      benefits: [],
      retirement: [],
      taxSettings: {
        taxLines: [
          { id: 'tax-fed', label: 'Federal Tax', rate: 10, calculationType: 'percentage' },
          { id: 'tax-state', label: 'State Tax', rate: 5, calculationType: 'percentage' },
        ],
        additionalWithholding: 20,
      },
    });

    expect(breakdown.taxLineAmounts).toEqual([
      { id: 'tax-fed', label: 'Federal Tax', amount: 216 },
      { id: 'tax-state', label: 'State Tax', amount: 108 },
    ]);
    expect(breakdown.additionalWithholding).toBe(20);
    expect(breakdown.otherIncomeAutoWithholding).toBe(22);
    expect(breakdown.totalTaxes).toBe(366);
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

describe('calculateCalendarPeriodBreakdown', () => {
  // Simple fixture where gross - preTaxDeductions - totalTaxes - netPay = 0,
  // so postTaxDeductions is 0 in all cases and assertions stay clean.
  const perPaycheck = {
    grossPay: 5000,
    preTaxDeductions: 200,
    taxableIncome: 4800,
    taxLineAmounts: [
      { id: 'fed', label: 'Federal Tax', amount: 480 },
      { id: 'state', label: 'State Tax', amount: 240 },
    ],
    additionalWithholding: 0,
    totalTaxes: 720,
    netPay: 4080,
  };

  it('scales all fields by 2 for a 2-paycheck period', () => {
    const result = calculateCalendarPeriodBreakdown(perPaycheck, 2);
    expect(result.grossPay).toBe(10000);
    expect(result.otherIncomeGross).toBe(0);
    expect(result.otherIncomeTaxable).toBe(0);
    expect(result.otherIncomeNet).toBe(0);
    expect(result.preTaxDeductions).toBe(400);
    expect(result.taxableIncome).toBe(9600);
    expect(result.taxLineAmounts).toEqual([
      { id: 'fed', label: 'Federal Tax', amount: 960 },
      { id: 'state', label: 'State Tax', amount: 480 },
    ]);
    expect(result.additionalWithholding).toBe(0);
    expect(result.totalTaxes).toBe(1440);
    expect(result.postTaxDeductions).toBe(0);
    expect(result.netPay).toBe(8160);
  });

  it('scales all fields by 3 for a 3-paycheck period', () => {
    const result = calculateCalendarPeriodBreakdown(perPaycheck, 3);
    expect(result.grossPay).toBe(15000);
    expect(result.preTaxDeductions).toBe(600);
    expect(result.taxableIncome).toBe(14400);
    expect(result.taxLineAmounts).toEqual([
      { id: 'fed', label: 'Federal Tax', amount: 1440 },
      { id: 'state', label: 'State Tax', amount: 720 },
    ]);
    expect(result.totalTaxes).toBe(2160);
    expect(result.postTaxDeductions).toBe(0);
    expect(result.netPay).toBe(12240);
  });

  it('returns all-zero breakdown when paychecksInPeriod is 0', () => {
    const result = calculateCalendarPeriodBreakdown(perPaycheck, 0);
    expect(result).toEqual({ ...getEmptyPaycheckBreakdown(), postTaxDeductions: 0 });
  });

  it('returns all-zero breakdown when paychecksInPeriod is negative', () => {
    const result = calculateCalendarPeriodBreakdown(perPaycheck, -1);
    expect(result).toEqual({ ...getEmptyPaycheckBreakdown(), postTaxDeductions: 0 });
  });

  it('scales otherIncomeAutoWithholding and its line items', () => {
    const withAutoWithholding = {
      ...perPaycheck,
      otherIncomeAutoWithholding: 26.4,
      otherIncomeAutoWithholdingLineItems: [
        {
          id: 'oi-auto-1',
          label: 'Auto Withholding - Commission (22%)',
          amount: 26.4,
          sourceIncomeId: 'inc-1',
          sourceIncomeName: 'Commission',
          profileId: 'general-supplemental',
          profileLabel: 'General Supplemental Income',
          rate: 22,
          taxableBase: 120,
        },
      ],
    };

    const result = calculateCalendarPeriodBreakdown(withAutoWithholding, 2);
    expect(result.otherIncomeAutoWithholding).toBe(52.8);
    expect(result.otherIncomeAutoWithholdingLineItems).toEqual([
      {
        id: 'oi-auto-1',
        label: 'Auto Withholding - Commission (22%)',
        amount: 52.8,
        sourceIncomeId: 'inc-1',
        sourceIncomeName: 'Commission',
        profileId: 'general-supplemental',
        profileLabel: 'General Supplemental Income',
        rate: 22,
        taxableBase: 240,
      },
    ]);
  });

  it('annual parity: summing all 12 monthly calendar breakdowns ≈ perPaycheck × 26 for bi-weekly', () => {
    // Use a non-round salary so rounding accumulates and the tolerance check is meaningful.
    // $100,000 / 26 = $3,846.153846... per paycheck.
    const salaryBreakdown = calculatePaycheckBreakdown({
      paySettings: { payType: 'salary', annualSalary: 100000, payFrequency: 'bi-weekly' },
      preTaxDeductions: [],
      benefits: [],
      retirement: [],
      taxSettings: { taxLines: [], additionalWithholding: 0 },
    });

    let grossSum = 0;
    let netSum = 0;

    // Anchor 2026-01-02: summing all 12 monthly paycheck counts gives exactly 26.
    for (let month = 1; month <= 12; month++) {
      const count = getPaychecksInMonth('2026-01-02', 'bi-weekly', 2026, month);
      const periodBreakdown = calculateCalendarPeriodBreakdown(salaryBreakdown, count);
      grossSum += periodBreakdown.grossPay;
      netSum += periodBreakdown.netPay;
    }

    // Rounding across 12 months should deviate by less than $0.10
    expect(Math.abs(grossSum - salaryBreakdown.grossPay * 26)).toBeLessThan(0.10);
    expect(Math.abs(netSum - salaryBreakdown.netPay * 26)).toBeLessThan(0.10);
  });
});