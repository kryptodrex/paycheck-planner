import { describe, expect, it, beforeAll } from 'vitest';
import { buildSearchIndex, searchPlan } from './planSearch';
import { initializeSearchModules } from './searchModules';
import type { BudgetData } from '../types/budget';

// ─── Minimal budget fixture ──────────────────────────────────────────────────

const MOCK_BUDGET: BudgetData = {
  id: 'test-plan-1',
  name: 'Test Plan',
  year: 2026,
  paySettings: {
    payType: 'salary',
    annualSalary: 75000,
    payFrequency: 'bi-weekly',
  },
  preTaxDeductions: [
    { id: 'd1', name: 'Health Insurance', amount: 200, isPercentage: false },
  ],
  benefits: [
    {
      id: 'ben1',
      name: 'Dental Coverage',
      amount: 15,
      isTaxable: false,
      enabled: true,
    },
    {
      id: 'ben2',
      name: 'Life Insurance',
      amount: 5,
      isTaxable: false,
      enabled: false,
    },
  ],
  retirement: [
    {
      id: 'ret1',
      type: '401k',
      employeeContribution: 6,
      employeeContributionIsPercentage: true,
      hasEmployerMatch: true,
      employerMatchCap: 3,
      employerMatchCapIsPercentage: true,
      enabled: true,
    },
  ],
  taxSettings: {
    taxLines: [
      { id: 'tx1', label: 'Federal Income Tax', rate: 22, calculationType: 'percentage' },
      { id: 'tx2', label: 'State Income Tax', rate: 5, calculationType: 'percentage' },
    ],
    additionalWithholding: 0,
  },
  accounts: [
    { id: 'acc1', name: 'Chase Checking', type: 'checking', color: '#667eea', icon: 'CreditCard' },
    { id: 'acc2', name: 'Savings Account', type: 'savings', color: '#10b981', icon: 'PiggyBank' },
  ],
  bills: [
    {
      id: 'bill1',
      name: 'Netflix',
      amount: 15.99,
      frequency: 'monthly',
      accountId: 'acc1',
      enabled: true,
      category: 'Entertainment',
    },
    {
      id: 'bill2',
      name: 'Rent',
      amount: 1800,
      frequency: 'monthly',
      accountId: 'acc1',
      enabled: true,
      category: 'Housing',
    },
    {
      id: 'bill3',
      name: 'Gym Membership',
      amount: 50,
      frequency: 'monthly',
      accountId: 'acc1',
      enabled: false,
    },
  ],
  loans: [
    {
      id: 'loan1',
      name: 'Car Loan',
      type: 'auto',
      principal: 20000,
      currentBalance: 14500,
      interestRate: 4.5,
      monthlyPayment: 350,
      accountId: 'acc1',
      startDate: '2023-01-01',
    },
  ],
  savingsContributions: [
    {
      id: 'sav1',
      name: 'Emergency Fund',
      amount: 200,
      frequency: 'monthly',
      accountId: 'acc2',
      type: 'savings',
    },
  ],
  settings: {
    currency: 'USD',
    locale: 'en-US',
  } as BudgetData['settings'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// ─── buildSearchIndex ─────────────────────────────────────────────────────────

describe('buildSearchIndex', () => {
  beforeAll(() => {
    // Initialize search modules before tests run
    initializeSearchModules();
  });
  it('includes bills in the index', () => {
    const index = buildSearchIndex(MOCK_BUDGET);
    const bill = index.find((r) => r.id === 'bill-bill1');
    expect(bill).toBeDefined();
    expect(bill?.title).toBe('Netflix');
    expect(bill?.category).toBe('Bills');
    expect(bill?.action).toMatchObject({ type: 'navigate-tab', tabId: 'bills' });
  });

  it('includes loans in the index', () => {
    const index = buildSearchIndex(MOCK_BUDGET);
    const loan = index.find((r) => r.id === 'loan-loan1');
    expect(loan).toBeDefined();
    expect(loan?.title).toBe('Car Loan');
    expect(loan?.category).toBe('Loans');
    expect(loan?.action).toMatchObject({ type: 'navigate-tab', tabId: 'loans' });
  });

  it('includes savings contributions in the index', () => {
    const index = buildSearchIndex(MOCK_BUDGET);
    const sav = index.find((r) => r.id === 'savings-sav1');
    expect(sav).toBeDefined();
    expect(sav?.title).toBe('Emergency Fund');
    expect(sav?.category).toBe('Savings');
  });

  it('includes retirement elections in the index', () => {
    const index = buildSearchIndex(MOCK_BUDGET);
    const ret = index.find((r) => r.id === 'retirement-ret1');
    expect(ret).toBeDefined();
    expect(ret?.category).toBe('Retirement');
    expect(ret?.action).toMatchObject({ type: 'navigate-tab', tabId: 'savings', elementId: 'retirement-ret1' });
  });

  it('includes tax lines in the index', () => {
    const index = buildSearchIndex(MOCK_BUDGET);
    const tax = index.find((r) => r.id === 'tax-tx1');
    expect(tax).toBeDefined();
    expect(tax?.title).toBe('Federal Income Tax');
    expect(tax?.action).toMatchObject({ type: 'navigate-tab', tabId: 'taxes' });
  });

  it('includes accounts with open-accounts action', () => {
    const index = buildSearchIndex(MOCK_BUDGET);
    const account = index.find((r) => r.id === 'account-acc1');
    expect(account).toBeDefined();
    expect(account?.title).toBe('Chase Checking');
    expect(account?.action).toMatchObject({ type: 'open-accounts', scrollToAccountId: 'acc1' });
  });

  it('includes pay settings fields', () => {
    const index = buildSearchIndex(MOCK_BUDGET);
    const annualPay = index.find((r) => r.id === 'pay-settings-annual-pay');
    expect(annualPay).toBeDefined();
    expect(annualPay?.action).toMatchObject({ type: 'open-pay-settings' });
  });

  it('includes quick action entries for add bill and add deduction', () => {
    const index = buildSearchIndex(MOCK_BUDGET);

    const addBill = index.find((r) => r.id === 'quick-action-add-bill');
    expect(addBill).toBeDefined();
    expect(addBill?.action).toMatchObject({ type: 'open-bills-action', mode: 'add-bill' });

    const addDeduction = index.find((r) => r.id === 'quick-action-add-deduction');
    expect(addDeduction).toBeDefined();
    expect(addDeduction?.action).toMatchObject({ type: 'open-bills-action', mode: 'add-deduction' });

    const addLoan = index.find((r) => r.id === 'quick-action-add-loan-payment');
    expect(addLoan).toBeDefined();
    expect(addLoan?.action).toMatchObject({ type: 'open-loans-action', mode: 'add-loan' });

    const addContribution = index.find((r) => r.id === 'quick-action-add-contribution');
    expect(addContribution).toBeDefined();
    expect(addContribution?.action).toMatchObject({ type: 'open-savings-action', mode: 'add-contribution' });

    const addRetirement = index.find((r) => r.id === 'quick-action-add-retirement-plan');
    expect(addRetirement).toBeDefined();
    expect(addRetirement?.action).toMatchObject({ type: 'open-savings-action', mode: 'add-retirement' });

    const editTaxSettings = index.find((r) => r.id === 'quick-action-edit-tax-settings');
    expect(editTaxSettings).toBeDefined();
    expect(editTaxSettings?.action).toMatchObject({ type: 'open-taxes-action', mode: 'open-settings' });
  });

  it('adds inline pause/edit/delete actions on item results instead of separate rows', () => {
    const index = buildSearchIndex(MOCK_BUDGET);

    const bill = index.find((r) => r.id === 'bill-bill1');
    expect(bill?.inlineActions).toEqual([
      {
        id: 'toggle-bill-bill1',
        label: 'Pause',
        action: { type: 'open-bills-action', mode: 'toggle-bill', targetId: 'bill1' },
      },
      {
        id: 'edit-bill-bill1',
        label: 'Edit',
        action: { type: 'open-bills-action', mode: 'edit-bill', targetId: 'bill1' },
      },
      {
        id: 'delete-bill-bill1',
        label: 'Delete',
        action: { type: 'open-bills-action', mode: 'delete-bill', targetId: 'bill1' },
        variant: 'danger',
      },
    ]);

    expect(index.some((r) => r.id === 'quick-action-bill-edit-bill1')).toBe(false);
    expect(index.some((r) => r.id === 'quick-action-bill-toggle-bill1')).toBe(false);
    expect(index.some((r) => r.id === 'quick-action-bill-delete-bill1')).toBe(false);
  });

  it('includes key metrics entries with metrics tab anchors', () => {
    const index = buildSearchIndex(MOCK_BUDGET);
    const takeHome = index.find((r) => r.id === 'key-metrics-take-home-pay');
    expect(takeHome).toBeDefined();
    expect(takeHome?.action).toMatchObject({
      type: 'navigate-tab',
      tabId: 'metrics',
      elementId: 'key-metrics-net-pay-card',
    });

    const bills = index.find((r) => r.id === 'key-metrics-total-bills');
    expect(bills?.action).toMatchObject({
      type: 'navigate-tab',
      tabId: 'metrics',
      elementId: 'key-metrics-bills-card',
    });

    const savingsRate = index.find((r) => r.id === 'key-metrics-savings-rate');
    expect(savingsRate?.action).toMatchObject({
      type: 'navigate-tab',
      tabId: 'metrics',
      elementId: 'key-metrics-savings-rate-card',
    });

    const yearlyBreakdown = index.find((r) => r.id === 'key-metrics-yearly-pay-breakdown');
    expect(yearlyBreakdown?.action).toMatchObject({
      type: 'navigate-tab',
      tabId: 'metrics',
      elementId: 'key-metrics-yearly-breakdown',
    });
  });

  it('includes pay breakdown entries with section anchors', () => {
    const index = buildSearchIndex(MOCK_BUDGET);
    const netPay = index.find((r) => r.id === 'pay-breakdown-net-pay');
    expect(netPay).toBeDefined();
    expect(netPay?.action).toMatchObject({
      type: 'navigate-tab',
      tabId: 'breakdown',
      elementId: 'pay-breakdown-net-pay',
    });

    const taxableIncome = index.find((r) => r.id === 'pay-breakdown-taxable-income');
    expect(taxableIncome?.action).toMatchObject({
      type: 'navigate-tab',
      tabId: 'breakdown',
      elementId: 'pay-breakdown-taxable-income',
    });

    const allocations = index.find((r) => r.id === 'pay-breakdown-after-tax-allocations');
    expect(allocations?.action).toMatchObject({
      type: 'navigate-tab',
      tabId: 'breakdown',
      elementId: 'pay-breakdown-after-tax-allocations',
    });
  });

  it('omits post-tax deduction search entry when no post-tax deductions are rendered', () => {
    const index = buildSearchIndex(MOCK_BUDGET);
    expect(index.some((r) => r.id === 'pay-breakdown-post-tax-deductions')).toBe(false);
  });

  it('omits after-tax allocations search entry when no accounts are present', () => {
    const budgetWithoutAccounts: BudgetData = {
      ...MOCK_BUDGET,
      accounts: [],
    };

    const index = buildSearchIndex(budgetWithoutAccounts);
    expect(index.some((r) => r.id === 'pay-breakdown-after-tax-allocations')).toBe(false);
  });

  it('marks paused/disabled items with a badge', () => {
    const index = buildSearchIndex(MOCK_BUDGET);
    const pausedBill = index.find((r) => r.id === 'bill-bill3');
    expect(pausedBill?.badge).toBe('Paused');

    const pausedBenefit = index.find((r) => r.id === 'benefit-ben2');
    expect(pausedBenefit?.badge).toBe('Paused');
  });

  it('includes element IDs that map to DOM section anchors', () => {
    const index = buildSearchIndex(MOCK_BUDGET);
    const bill = index.find((r) => r.id === 'bill-bill1');
    expect((bill?.action as { elementId?: string }).elementId).toBe('bill-bill1');

    const ret = index.find((r) => r.id === 'retirement-ret1');
    expect((ret?.action as { elementId?: string }).elementId).toBe('retirement-ret1');
  });

  it('includes settings entries with open-settings action and sectionId', () => {
    const index = buildSearchIndex(MOCK_BUDGET);

    const themeEntry = index.find((r) => r.id === 'settings-theme');
    expect(themeEntry).toBeDefined();
    expect(themeEntry?.action).toMatchObject({ type: 'open-settings', sectionId: 'appearance' });

    const fontEntry = index.find((r) => r.id === 'settings-font-scale');
    expect(fontEntry).toBeDefined();
    expect(fontEntry?.action).toMatchObject({ type: 'open-settings', sectionId: 'accessibility' });

    const glossaryEntry = index.find((r) => r.id === 'settings-glossary');
    expect(glossaryEntry).toBeDefined();
    expect(glossaryEntry?.action).toMatchObject({ type: 'open-settings', sectionId: 'glossary' });

    const viewModeEntry = index.find((r) => r.id === 'settings-view-mode');
    expect(viewModeEntry).toBeDefined();
    expect(viewModeEntry?.action).toMatchObject({ type: 'open-view-mode-settings' });
  });
});

// ─── searchPlan ───────────────────────────────────────────────────────────────

describe('searchPlan', () => {
  it('returns empty array for empty query', () => {
    expect(searchPlan('', MOCK_BUDGET)).toHaveLength(0);
  });

  it('returns empty array for whitespace-only query', () => {
    expect(searchPlan('   ', MOCK_BUDGET)).toHaveLength(0);
  });

  it('matches bill by name (case-insensitive)', () => {
    const results = searchPlan('netflix', MOCK_BUDGET);
    expect(results.some((r) => r.id === 'bill-bill1')).toBe(true);
  });

  it('matches bill by category', () => {
    const results = searchPlan('Entertainment', MOCK_BUDGET);
    expect(results.some((r) => r.id === 'bill-bill1')).toBe(true);
  });

  it('matches tax line by label', () => {
    const results = searchPlan('federal', MOCK_BUDGET);
    expect(results.some((r) => r.id === 'tax-tx1')).toBe(true);
  });

  it('matches loan by name', () => {
    const results = searchPlan('car loan', MOCK_BUDGET);
    expect(results.some((r) => r.id === 'loan-loan1')).toBe(true);
  });

  it('matches savings contribution by name', () => {
    const results = searchPlan('emergency', MOCK_BUDGET);
    expect(results.some((r) => r.id === 'savings-sav1')).toBe(true);
  });

  it('matches account by name', () => {
    const results = searchPlan('chase', MOCK_BUDGET);
    expect(results.some((r) => r.id === 'account-acc1')).toBe(true);
  });

  it('multi-token search finds item matching all tokens', () => {
    const results = searchPlan('car auto', MOCK_BUDGET);
    expect(results.some((r) => r.id === 'loan-loan1')).toBe(true);
  });

  it('returns no results for unrelated query', () => {
    const results = searchPlan('xyzzy_not_found', MOCK_BUDGET);
    expect(results).toHaveLength(0);
  });

  it('matches pay settings field', () => {
    const results = searchPlan('annual pay', MOCK_BUDGET);
    expect(results.some((r) => r.id === 'pay-settings-annual-pay')).toBe(true);
  });

  it('matches quick action by button label', () => {
    const results = searchPlan('add bill', MOCK_BUDGET);
    expect(results.some((r) => r.id === 'quick-action-add-bill')).toBe(true);
  });

  it('matches item rows by inline action labels', () => {
    const results = searchPlan('edit netflix', MOCK_BUDGET);
    expect(results.some((r) => r.id === 'bill-bill1')).toBe(true);
  });

  it('respects maxResults limit', () => {
    const results = searchPlan('a', MOCK_BUDGET, 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('amount query >1000 returns rent but not netflix', () => {
    const results = searchPlan('>1000', MOCK_BUDGET);
    const ids = results.map((r) => r.id);
    expect(ids).toContain('bill-bill2'); // Rent $1800
    expect(ids).not.toContain('bill-bill1'); // Netflix $15.99
  });

  it('amount query <100 returns netflix and gym but not rent', () => {
    const results = searchPlan('<100', MOCK_BUDGET);
    const ids = results.map((r) => r.id);
    expect(ids).toContain('bill-bill1'); // Netflix $15.99
    expect(ids).not.toContain('bill-bill2'); // Rent $1800
  });

  it('matches settings by keyword (theme, dark, contrast, glossary, view mode)', () => {
    expect(searchPlan('theme', MOCK_BUDGET).some((r) => r.category === 'Settings')).toBe(true);
    expect(searchPlan('dark mode', MOCK_BUDGET).some((r) => r.id === 'settings-theme-dark')).toBe(true);
    expect(searchPlan('high contrast', MOCK_BUDGET).some((r) => r.id === 'settings-high-contrast')).toBe(true);
    expect(searchPlan('glossary', MOCK_BUDGET).some((r) => r.id === 'settings-glossary')).toBe(true);
    expect(searchPlan('view mode', MOCK_BUDGET).some((r) => r.id === 'settings-view-mode')).toBe(true);
    expect(searchPlan('font scale', MOCK_BUDGET).some((r) => r.id === 'settings-font-scale')).toBe(true);
    expect(searchPlan('backup', MOCK_BUDGET).some((r) => r.id === 'settings-backup')).toBe(true);
    expect(searchPlan('reset', MOCK_BUDGET).some((r) => r.id === 'settings-reset')).toBe(true);
  });
});
