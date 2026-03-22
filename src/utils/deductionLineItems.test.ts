import { describe, expect, it } from 'vitest';
import {
  buildPostTaxLineItems,
  buildPreTaxLineItems,
  getRetirementLabel,
} from './deductionLineItems';
import type { Benefit, RetirementElection } from '../types/payroll';
import type { Deduction } from '../types/payroll';

const grossPay = 5000;

describe('getRetirementLabel', () => {
  it('returns customLabel when set', () => {
    const election = { type: '401k', customLabel: 'My 401k' } as RetirementElection;
    expect(getRetirementLabel(election)).toBe('My 401k');
  });

  it('returns friendly labels for known types', () => {
    const cases: [RetirementElection['type'], string][] = [
      ['401k', '401(k)'],
      ['403b', '403(b)'],
      ['roth-ira', 'Roth IRA'],
      ['traditional-ira', 'Traditional IRA'],
      ['pension', 'Pension'],
      ['other', 'Retirement'],
    ];
    for (const [type, expected] of cases) {
      expect(getRetirementLabel({ type } as RetirementElection)).toBe(expected);
    }
  });
});

describe('buildPreTaxLineItems', () => {
  it('includes a fixed-amount generic deduction', () => {
    const deductions: Deduction[] = [{ id: 'd1', name: 'HSA', amount: 100, isPercentage: false }];
    const items = buildPreTaxLineItems(deductions, [], [], grossPay);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ id: 'd1', label: 'HSA', amount: 100 });
  });

  it('computes percentage-based generic deduction against gross pay', () => {
    const deductions: Deduction[] = [{ id: 'd2', name: 'FSA', amount: 2, isPercentage: true }];
    const items = buildPreTaxLineItems(deductions, [], [], grossPay);
    expect(items[0].amount).toBe(100); // 2% of 5000
  });

  it('includes a non-taxable paycheck-sourced benefit as pre-tax', () => {
    const benefits: Benefit[] = [
      { id: 'b1', name: 'Dental', amount: 25, isTaxable: false, deductionSource: 'paycheck' },
    ];
    const items = buildPreTaxLineItems([], benefits, [], grossPay);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ id: 'b1', label: 'Dental', amount: 25 });
  });

  it('excludes a taxable benefit from pre-tax items', () => {
    const benefits: Benefit[] = [
      { id: 'b2', name: 'Life Insurance', amount: 10, isTaxable: true, deductionSource: 'paycheck' },
    ];
    expect(buildPreTaxLineItems([], benefits, [], grossPay)).toHaveLength(0);
  });

  it('excludes an account-sourced benefit from pre-tax items', () => {
    const benefits: Benefit[] = [
      { id: 'b3', name: 'Vision', amount: 8, isTaxable: false, deductionSource: 'account', sourceAccountId: 'acc1' },
    ];
    expect(buildPreTaxLineItems([], benefits, [], grossPay)).toHaveLength(0);
  });

  it('includes a paycheck-sourced pre-tax retirement election', () => {
    const retirement: RetirementElection[] = [
      {
        id: 'r1', type: '401k', employeeContribution: 5, employeeContributionIsPercentage: true,
        isPreTax: true, deductionSource: 'paycheck', hasEmployerMatch: false,
        employerMatchCap: 0, employerMatchCapIsPercentage: false,
      },
    ];
    const items = buildPreTaxLineItems([], [], retirement, grossPay);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ id: 'r1', label: '401(k)', amount: 250 }); // 5% of 5000
  });

  it('excludes a post-tax retirement election from pre-tax items', () => {
    const retirement: RetirementElection[] = [
      {
        id: 'r2', type: 'roth-ira', employeeContribution: 100, employeeContributionIsPercentage: false,
        isPreTax: false, deductionSource: 'paycheck', hasEmployerMatch: false,
        employerMatchCap: 0, employerMatchCapIsPercentage: false,
      },
    ];
    expect(buildPreTaxLineItems([], [], retirement, grossPay)).toHaveLength(0);
  });

  it('excludes disabled benefits and elections', () => {
    const benefits: Benefit[] = [
      { id: 'b4', name: 'Dental', amount: 25, isTaxable: false, deductionSource: 'paycheck', enabled: false },
    ];
    const retirement: RetirementElection[] = [
      {
        id: 'r3', type: '401k', employeeContribution: 100, employeeContributionIsPercentage: false,
        isPreTax: true, deductionSource: 'paycheck', enabled: false,
        hasEmployerMatch: false, employerMatchCap: 0, employerMatchCapIsPercentage: false,
      },
    ];
    expect(buildPreTaxLineItems([], benefits, retirement, grossPay)).toHaveLength(0);
  });

  it('excludes items with zero amount', () => {
    const deductions: Deduction[] = [{ id: 'd3', name: 'Empty', amount: 0, isPercentage: false }];
    expect(buildPreTaxLineItems(deductions, [], [], grossPay)).toHaveLength(0);
  });

  it('correctly separates pre-tax and post-tax in a mixed dataset', () => {
    const benefits: Benefit[] = [
      { id: 'b5', name: 'Medical', amount: 50, isTaxable: false, deductionSource: 'paycheck' },
      { id: 'b6', name: 'Life Insurance', amount: 15, isTaxable: true, deductionSource: 'paycheck' },
    ];
    const items = buildPreTaxLineItems([], benefits, [], grossPay);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('b5');
  });
});

describe('buildPostTaxLineItems', () => {
  it('includes a taxable paycheck-sourced benefit as post-tax', () => {
    const benefits: Benefit[] = [
      { id: 'b7', name: 'Life Insurance', amount: 15, isTaxable: true, deductionSource: 'paycheck' },
    ];
    const items = buildPostTaxLineItems(benefits, [], grossPay);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ id: 'b7', label: 'Life Insurance', amount: 15 });
  });

  it('excludes a non-taxable benefit from post-tax items', () => {
    const benefits: Benefit[] = [
      { id: 'b8', name: 'Medical', amount: 50, isTaxable: false, deductionSource: 'paycheck' },
    ];
    expect(buildPostTaxLineItems(benefits, [], grossPay)).toHaveLength(0);
  });

  it('includes a paycheck-sourced post-tax (Roth) retirement election', () => {
    const retirement: RetirementElection[] = [
      {
        id: 'r4', type: 'roth-ira', employeeContribution: 200, employeeContributionIsPercentage: false,
        isPreTax: false, deductionSource: 'paycheck', hasEmployerMatch: false,
        employerMatchCap: 0, employerMatchCapIsPercentage: false,
      },
    ];
    const items = buildPostTaxLineItems([], retirement, grossPay);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ id: 'r4', label: 'Roth IRA', amount: 200 });
  });

  it('excludes a pre-tax retirement election from post-tax items', () => {
    const retirement: RetirementElection[] = [
      {
        id: 'r5', type: '401k', employeeContribution: 250, employeeContributionIsPercentage: false,
        isPreTax: true, deductionSource: 'paycheck', hasEmployerMatch: false,
        employerMatchCap: 0, employerMatchCapIsPercentage: false,
      },
    ];
    expect(buildPostTaxLineItems([], retirement, grossPay)).toHaveLength(0);
  });

  it('computes percentage-based post-tax benefit against gross pay', () => {
    const benefits: Benefit[] = [
      { id: 'b9', name: 'Supplemental', amount: 1, isTaxable: true, isPercentage: true, deductionSource: 'paycheck' },
    ];
    const items = buildPostTaxLineItems(benefits, [], grossPay);
    expect(items[0].amount).toBe(50); // 1% of 5000
  });
});
