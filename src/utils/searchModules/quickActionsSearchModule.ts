import { Plus, Settings } from 'lucide-react';
import type { BudgetData } from '../../types/budget';
import type { SearchResult } from '../planSearch';
import type { SearchModule } from '../searchRegistry';

function buildQuickActionsResults(_budgetData: BudgetData): SearchResult[] {
  void _budgetData;

  return [
    {
      id: 'quick-action-add-bill',
      title: 'Add Bill',
      subtitle: 'Open Bills & Expenses and start adding a bill',
      category: 'Quick Actions',
      categoryIcon: Plus,
      action: { type: 'open-bills-action', mode: 'add-bill' },
    },
    {
      id: 'quick-action-add-deduction',
      title: 'Add Deduction',
      subtitle: 'Open Bills & Expenses and start adding a deduction',
      category: 'Quick Actions',
      categoryIcon: Plus,
      action: { type: 'open-bills-action', mode: 'add-deduction' },
    },
    {
      id: 'quick-action-add-loan-payment',
      title: 'Add Loan Payment',
      subtitle: 'Open Loan Payments and start adding a payment',
      category: 'Quick Actions',
      categoryIcon: Plus,
      action: { type: 'open-loans-action', mode: 'add-loan' },
    },
    {
      id: 'quick-action-add-contribution',
      title: 'Add Contribution',
      subtitle: 'Open Savings and start adding a savings/investment contribution',
      category: 'Quick Actions',
      categoryIcon: Plus,
      action: { type: 'open-savings-action', mode: 'add-contribution' },
    },
    {
      id: 'quick-action-add-retirement-plan',
      title: 'Add Retirement Plan',
      subtitle: 'Open Savings and start adding a retirement plan',
      category: 'Quick Actions',
      categoryIcon: Plus,
      action: { type: 'open-savings-action', mode: 'add-retirement' },
    },
    {
      id: 'quick-action-edit-tax-settings',
      title: 'Edit Tax Settings',
      subtitle: 'Open Tax Breakdown and launch the tax settings modal',
      category: 'Quick Actions',
      categoryIcon: Settings,
      action: { type: 'open-taxes-action', mode: 'open-settings' },
    },
  ];
}

export const quickActionsSearchModule: SearchModule = {
  id: 'quick-actions',
  buildResults: buildQuickActionsResults,
  actionHandlers: {},
};
