import { describe, expect, it } from 'vitest';
import { billsSearchModule } from './billsSearchModule';
import type { BudgetData } from '../../types/budget';
import type { SearchActionContext } from '../searchRegistry';
import type { SearchResultAction } from '../planSearch';

// ─── Minimal budget fixture for Bills testing ──────────────────────────────

const createMockBudgetWithBills = (): BudgetData => ({
  id: 'test-plan-bills',
  name: 'Test Plan',
  year: 2026,
  paySettings: {
    payType: 'salary',
    annualSalary: 75000,
    payFrequency: 'bi-weekly',
  },
  preTaxDeductions: [],
  benefits: [
    {
      id: 'ben1',
      name: 'Health Insurance',
      amount: 150,
      isTaxable: false,
      enabled: true,
    },
    {
      id: 'ben2',
      name: 'Dental Coverage',
      amount: 25,
      isTaxable: false,
      enabled: false, // paused
    },
  ],
  bills: [
    {
      id: 'bill1',
      name: 'Rent',
      amount: 1500,
      frequency: 'monthly',
      category: 'Housing',
      accountId: 'account-1',
      enabled: true,
      discretionary: false,
    },
    {
      id: 'bill2',
      name: 'Netflix',
      amount: 15,
      frequency: 'monthly',
      category: 'Entertainment',
      accountId: 'account-1',
      enabled: true,
      discretionary: true,
    },
    {
      id: 'bill3',
      name: 'Electric',
      amount: 120,
      frequency: 'monthly',
      category: 'Utilities',
      accountId: 'account-1',
      enabled: false, // paused
      discretionary: false,
    },
  ],
  retirement: [],
  taxSettings: { taxLines: [], additionalWithholding: 0 },
  savingsContributions: [],
  loans: [],
  accounts: [],
  settings: {
    currency: 'USD',
    locale: 'en-US',
  } as BudgetData['settings'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

// ─── Tests ────────────────────────────────────────────────────────────────

describe('billsSearchModule', () => {
  describe('buildResults', () => {
    it('includes all bills in results', () => {
      const budget = createMockBudgetWithBills();
      const results = billsSearchModule.buildResults(budget);
      const billResults = results.filter((r) => r.id.startsWith('bill-'));

      expect(billResults).toHaveLength(3);
      expect(billResults.map((r) => r.id)).toContain('bill-bill1');
      expect(billResults.map((r) => r.id)).toContain('bill-bill2');
      expect(billResults.map((r) => r.id)).toContain('bill-bill3');
    });

    it('includes all benefits in results', () => {
      const budget = createMockBudgetWithBills();
      const results = billsSearchModule.buildResults(budget);
      const benefitResults = results.filter((r) => r.id.startsWith('benefit-'));

      expect(benefitResults).toHaveLength(2);
      expect(benefitResults.map((r) => r.id)).toContain('benefit-ben1');
      expect(benefitResults.map((r) => r.id)).toContain('benefit-ben2');
    });

    it('marks paused bills with badge', () => {
      const budget = createMockBudgetWithBills();
      const results = billsSearchModule.buildResults(budget);
      const pausedBill = results.find((r) => r.id === 'bill-bill3');

      expect(pausedBill).toBeDefined();
      expect(pausedBill?.badge).toBe('Paused');
    });

    it('marks discretionary bills with badge', () => {
      const budget = createMockBudgetWithBills();
      const results = billsSearchModule.buildResults(budget);
      const discretionaryBill = results.find((r) => r.id === 'bill-bill2');

      expect(discretionaryBill).toBeDefined();
      expect(discretionaryBill?.badge).toBe('Discretionary');
    });

    it('marks active benefits with resume action', () => {
      const budget = createMockBudgetWithBills();
      const results = billsSearchModule.buildResults(budget);
      const activeBenefit = results.find((r) => r.id === 'benefit-ben1');

      expect(activeBenefit?.inlineActions).toBeDefined();
      const pauseAction = activeBenefit?.inlineActions?.find((a) => a.id.includes('toggle'));
      expect(pauseAction?.label).toBe('Pause');
    });

    it('marks paused benefits with pause action', () => {
      const budget = createMockBudgetWithBills();
      const results = billsSearchModule.buildResults(budget);
      const pausedBenefit = results.find((r) => r.id === 'benefit-ben2');

      expect(pausedBenefit?.inlineActions).toBeDefined();
      const resumeAction = pausedBenefit?.inlineActions?.find((a) => a.id.includes('toggle'));
      expect(resumeAction?.label).toBe('Resume');
    });

    it('includes inline pause/edit/delete actions on bill results', () => {
      const budget = createMockBudgetWithBills();
      const results = billsSearchModule.buildResults(budget);
      const bill = results.find((r) => r.id === 'bill-bill1');

      expect(bill?.inlineActions).toHaveLength(3);
      const actions = bill?.inlineActions?.map((a) => a.id) ?? [];
      expect(actions).toContain('toggle-bill-bill1');
      expect(actions).toContain('edit-bill-bill1');
      expect(actions).toContain('delete-bill-bill1');
    });

    it('marks delete action as danger variant', () => {
      const budget = createMockBudgetWithBills();
      const results = billsSearchModule.buildResults(budget);
      const bill = results.find((r) => r.id === 'bill-bill1');

      const deleteAction = bill?.inlineActions?.find((a) => a.id.includes('delete'));
      expect(deleteAction?.variant).toBe('danger');
    });

    it('returns empty when no bills or benefits', () => {
      const budget = createMockBudgetWithBills();
      budget.bills = [];
      budget.benefits = [];

      const results = billsSearchModule.buildResults(budget);
      expect(results).toHaveLength(0);
    });
  });

  describe('action handlers', () => {
    it('has open-bills-action handler', () => {
      expect(billsSearchModule.actionHandlers['open-bills-action']).toBeDefined();
    });

    it('calls context methods when handling bill toggle action', () => {
      const mockContext: SearchActionContext = {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        setPendingBillsSearchAction: (_action) => {
          // Mock implementation
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        setPendingBillsSearchTargetId: (_id) => {
          // Mock implementation
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        setScrollToAccountId: (_scrollId) => {
          // Mock implementation
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        setBillsSearchRequestKey: (_key) => {
          // Mock implementation
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        selectTab: (_tab) => {
          // Mock implementation
        },
      };

      let capturedAction = '';
      let capturedTargetId = '';
      let selectedTab = '';

      mockContext.setPendingBillsSearchAction = (actionValue) => {
        if (typeof actionValue === 'string') capturedAction = actionValue;
      };
      mockContext.setPendingBillsSearchTargetId = (idValue) => {
        if (typeof idValue === 'string') capturedTargetId = idValue;
      };
      mockContext.selectTab = (tabValue) => {
        selectedTab = tabValue;
      };

      const handler = billsSearchModule.actionHandlers['open-bills-action'];
      const billAction = {
        type: 'open-bills-action' as const,
        mode: 'edit-bill' as const,
        targetId: 'bill1',
      };

      handler(billAction, mockContext);

      expect(capturedAction).toBe('edit-bill');
      expect(capturedTargetId).toBe('bill1');
      expect(selectedTab).toBe('bills');
    });

    it('ignores action if not open-bills-action type', () => {
      const mockContext: SearchActionContext = {
        setPendingBillsSearchAction: () => {
          throw new Error('Should not be called');
        },
        selectTab: () => {
          throw new Error('Should not be called');
        },
      };

      const handler = billsSearchModule.actionHandlers['open-bills-action'];
      const wrongAction = { type: 'navigate-tab', tabId: 'bills' } as unknown as SearchResultAction;

      // Should not throw
      handler(wrongAction, mockContext);
    });
  });
});
