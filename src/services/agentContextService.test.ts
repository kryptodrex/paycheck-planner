import { describe, expect, it } from 'vitest';
import { buildAgentContext, buildSystemPrompt } from './agentContextService';
import type { BudgetData } from '../types/budget';
import type { PaycheckBreakdown } from '../types/payroll';

// ── Minimal fixtures ──────────────────────────────────────────────────────────

const minimalBudget: BudgetData = {
  id: 'test-1',
  name: 'Test Plan',
  year: 2025,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  paySettings: {
    payType: 'salary',
    annualSalary: 60000,
    payFrequency: 'bi-weekly',
    minLeftover: 0,
  },
  preTaxDeductions: [],
  benefits: [],
  retirement: [],
  taxSettings: {
    taxLines: [],
    additionalWithholding: 0,
  },
  accounts: [],
  bills: [],
  loans: [],
  savingsContributions: [],
  settings: {
    currency: 'USD',
    locale: 'en-US',
  },
};

const minimalBreakdown: PaycheckBreakdown = {
  grossPay: 2307.69,
  preTaxDeductions: 0,
  taxableIncome: 2307.69,
  taxLineAmounts: [],
  additionalWithholding: 0,
  totalTaxes: 0,
  netPay: 2307.69,
};

// ── buildAgentContext ─────────────────────────────────────────────────────────

describe('buildAgentContext', () => {
  it('includes plan name and year in the header', () => {
    const context = buildAgentContext(minimalBudget, minimalBreakdown);
    expect(context).toContain('Test Plan (2025)');
  });

  it('includes pay frequency and gross/net pay', () => {
    const context = buildAgentContext(minimalBudget, minimalBreakdown);
    expect(context).toContain('bi-weekly');
    expect(context).toContain('26 paychecks/year');
    expect(context).toContain('Gross pay per paycheck');
    expect(context).toContain('Net pay per paycheck');
  });

  it('formats currency values using the plan locale and currency', () => {
    const context = buildAgentContext(minimalBudget, minimalBreakdown);
    // Should include a USD-formatted figure
    expect(context).toMatch(/\$[\d,]+/);
  });

  it('omits empty sections when there are no benefits, bills, loans, or savings', () => {
    const context = buildAgentContext(minimalBudget, minimalBreakdown);
    expect(context).not.toContain('Benefits/deductions');
    expect(context).not.toContain('Recurring bills');
    expect(context).not.toContain('Loans / debt');
    expect(context).not.toContain('Savings contributions');
  });

  it('includes tax withholdings when taxLineAmounts is non-empty', () => {
    const breakdown: PaycheckBreakdown = {
      ...minimalBreakdown,
      taxLineAmounts: [{ id: 'fed', label: 'Federal', amount: 350 }],
      totalTaxes: 350,
    };
    const context = buildAgentContext(minimalBudget, breakdown);
    expect(context).toContain('Federal');
    expect(context).toContain('Tax withholdings per paycheck');
    expect(context).toContain('Total taxes');
  });

  it('includes additional withholding when set', () => {
    const breakdown: PaycheckBreakdown = {
      ...minimalBreakdown,
      additionalWithholding: 50,
      totalTaxes: 50,
    };
    const context = buildAgentContext(minimalBudget, breakdown);
    expect(context).toContain('Additional withholding');
  });

  it('includes pre-tax deductions when non-zero', () => {
    const breakdown: PaycheckBreakdown = {
      ...minimalBreakdown,
      preTaxDeductions: 200,
    };
    const context = buildAgentContext(minimalBudget, breakdown);
    expect(context).toContain('Pre-tax deductions per paycheck');
  });

  it('includes enabled benefits and omits disabled ones', () => {
    const budget: BudgetData = {
      ...minimalBudget,
      benefits: [
        { id: 'b1', name: 'Health', amount: 100, isTaxable: false, isPercentage: false, deductionSource: 'paycheck' },
        { id: 'b2', name: 'Dental', amount: 20, isTaxable: false, isPercentage: false, deductionSource: 'paycheck', enabled: false },
      ],
    };
    const context = buildAgentContext(budget, minimalBreakdown);
    expect(context).toContain('Health');
    expect(context).not.toContain('Dental');
  });

  it('includes enabled retirement contributions and omits disabled ones', () => {
    const budget: BudgetData = {
      ...minimalBudget,
      retirement: [
        {
          id: 'r1',
          type: '401k',
          employeeContribution: 6,
          employeeContributionIsPercentage: true,
          hasEmployerMatch: true,
          employerMatchCap: 3,
          employerMatchCapIsPercentage: true,
          yearlyLimit: 23000,
        },
        {
          id: 'r2',
          type: 'roth-ira',
          employeeContribution: 100,
          employeeContributionIsPercentage: false,
          hasEmployerMatch: false,
          employerMatchCap: 0,
          employerMatchCapIsPercentage: false,
          enabled: false,
        },
      ],
    };
    const context = buildAgentContext(budget, minimalBreakdown);
    expect(context).toContain('401k');
    expect(context).toContain('employer match');
    expect(context).toContain('Annual limit');
    expect(context).not.toContain('roth-ira');
  });

  it('includes enabled bills with monthly estimate and per-paycheck total', () => {
    const budget: BudgetData = {
      ...minimalBudget,
      bills: [
        { id: 'bill-1', name: 'Rent', amount: 1500, frequency: 'monthly', accountId: '', discretionary: false },
        { id: 'bill-2', name: 'Gym', amount: 50, frequency: 'monthly', accountId: '', discretionary: true, enabled: false },
      ],
    };
    const context = buildAgentContext(budget, minimalBreakdown);
    expect(context).toContain('Rent');
    expect(context).toContain('/month');
    expect(context).toContain('Total bills per paycheck');
    expect(context).not.toContain('Gym');
  });

  it('marks discretionary bills correctly', () => {
    const budget: BudgetData = {
      ...minimalBudget,
      bills: [
        { id: 'bill-1', name: 'Netflix', amount: 18, frequency: 'monthly', accountId: '', discretionary: true },
      ],
    };
    const context = buildAgentContext(budget, minimalBreakdown);
    expect(context).toContain('discretionary');
  });

  it('includes enabled loans with balance, rate, and per-paycheck equivalent', () => {
    const budget: BudgetData = {
      ...minimalBudget,
      loans: [
        { id: 'l1', name: 'Car Loan', type: 'auto', principal: 15000, monthlyPayment: 400, interestRate: 5.9, currentBalance: 12000, accountId: '', startDate: '2023-01-01' },
        { id: 'l2', name: 'Card', type: 'credit-card', principal: 5000, monthlyPayment: 200, interestRate: 22, currentBalance: 3000, accountId: '', startDate: '2022-06-01', enabled: false },
      ],
    };
    const context = buildAgentContext(budget, minimalBreakdown);
    expect(context).toContain('Car Loan');
    expect(context).toContain('5.9% APR');
    expect(context).toContain('balance');
    expect(context).toContain('/paycheck');
    expect(context).toContain('Total loan payments per paycheck');
    expect(context).not.toContain('Card');
  });

  it('includes savings contributions with per-paycheck equivalent', () => {
    const budget: BudgetData = {
      ...minimalBudget,
      savingsContributions: [
        { id: 's1', name: 'Emergency Fund', amount: 200, frequency: 'monthly', accountId: '', type: 'savings' },
      ],
    };
    const context = buildAgentContext(budget, minimalBreakdown);
    expect(context).toContain('Emergency Fund');
    expect(context).toContain('Savings contributions');
    expect(context).toContain('/paycheck');
    expect(context).toContain('Total savings per paycheck');
  });

  it('uses non-USD currency and custom locale when configured', () => {
    const budget: BudgetData = {
      ...minimalBudget,
      settings: { currency: 'EUR', locale: 'de-DE' },
    };
    const context = buildAgentContext(budget, minimalBreakdown);
    // Euro symbol or "EUR" should appear somewhere
    expect(context).toMatch(/€|EUR/);
  });

  it('handles benefit amounts expressed as percentages of gross pay', () => {
    const budget: BudgetData = {
      ...minimalBudget,
      benefits: [
        { id: 'b1', name: 'FSA', amount: 2, isTaxable: false, isPercentage: true, deductionSource: 'paycheck' },
      ],
    };
    const breakdown: PaycheckBreakdown = { ...minimalBreakdown, grossPay: 3000 };
    const context = buildAgentContext(budget, breakdown);
    // 2% of 3000 = 60 — should show $60.00
    expect(context).toContain('60.00');
  });

  it('always includes the per-paycheck spending summary with remaining figure', () => {
    const budget: BudgetData = {
      ...minimalBudget,
      bills: [
        { id: 'bill-1', name: 'Rent', amount: 1500, frequency: 'monthly', accountId: '', discretionary: false },
      ],
      loans: [
        { id: 'l1', name: 'Car', type: 'auto', principal: 10000, monthlyPayment: 300, interestRate: 5, currentBalance: 8000, accountId: '', startDate: '2023-01-01' },
      ],
    };
    // bi-weekly: 26 paychecks/year
    // bills per paycheck: 1500 * 12 / 26 ≈ 692.31
    // loans per paycheck: 300 * 12 / 26 ≈ 138.46
    // remaining: 2307.69 - 692.31 - 138.46 ≈ 1476.92
    const context = buildAgentContext(budget, minimalBreakdown);
    expect(context).toContain('Per-paycheck spending summary');
    expect(context).toContain('Net pay');
    expect(context).toContain('Bills');
    expect(context).toContain('Loan payments');
    expect(context).toContain('Total obligations');
    expect(context).toContain('Remaining for spending');
  });
});

// ── buildSystemPrompt ─────────────────────────────────────────────────────────

describe('buildSystemPrompt', () => {
  it('wraps the context in plan delimiters', () => {
    const prompt = buildSystemPrompt('some context');
    expect(prompt).toContain('--- CURRENT PLAN ---');
    expect(prompt).toContain('--- END PLAN ---');
    expect(prompt).toContain('some context');
  });

  it('includes the assistant persona description', () => {
    const prompt = buildSystemPrompt('');
    expect(prompt).toContain('financial planning assistant');
    expect(prompt).toContain('Paycheck Planner');
  });

  it('includes the do-not-invent-figures guideline', () => {
    const prompt = buildSystemPrompt('');
    expect(prompt).toContain('Do not invent figures');
  });

  it('returns a non-empty string even when context is empty', () => {
    const prompt = buildSystemPrompt('');
    expect(prompt.length).toBeGreaterThan(0);
  });
});
