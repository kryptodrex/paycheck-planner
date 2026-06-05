import type { BudgetData as CoreBudgetData } from '@paycheck-planner/core/budget';
import type { BudgetSettings } from './settings';

export type BudgetData = CoreBudgetData<BudgetSettings>;
