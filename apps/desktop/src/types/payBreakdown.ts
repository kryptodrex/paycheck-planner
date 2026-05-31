import type { Account } from './accounts';

/**
 * Runtime representation of a custom (user-defined) allocation category.
 * `kind: 'custom'` is the discriminant — no item count applies.
 */
export type CustomAllocationCategory = {
  id: string;
  name: string;
  amount: number;
  kind: 'custom';
};

/**
 * Runtime representation of an auto-computed allocation category, which
 * rolls up one or more linked items (bills, retirement elections, etc.).
 * `kind` is the discriminant; `itemCount` is the number of contributing items.
 *
 * Note: 'bill' covers both bills and account-sourced benefit deductions
 * when they exist on the same account — they are combined into one row.
 */
export type AutoAllocationCategory = {
  id: string;
  name: string;
  amount: number;
  kind: 'bill' | 'retirement' | 'loan' | 'savings';
  itemCount: number;
};

export type AllocationCategory = CustomAllocationCategory | AutoAllocationCategory;

/**
 * An Account augmented with its runtime-computed allocation categories.
 * The stored `AccountAllocationCategory[]` in `Account.allocationCategories`
 * uses a legacy flags-based shape; `normalizeAccounts` converts to this type.
 */
export type AllocationAccount = Omit<Account, 'allocationCategories'> & {
  allocationCategories: AllocationCategory[];
};

export type AccountFunding = {
  account: AllocationAccount;
  totalAmount: number;
  categories: AllocationCategory[];
};
