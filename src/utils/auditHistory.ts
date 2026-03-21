import type { Account, AccountAllocationCategory } from '../types/accounts';
import type { BudgetData } from '../types/budget';
import type { Benefit, Deduction, RetirementElection } from '../types/payroll';
import type { Bill, Loan, SavingsContribution } from '../types/obligations';
import type { AuditEntry, AuditEntityType } from '../types/audit';

const SENSITIVE_KEYS = new Set(['encryptionKey']);

const safeClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const stripSensitiveKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => stripSensitiveKeys(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const next: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key)) {
      continue;
    }
    next[key] = stripSensitiveKeys(nested);
  }

  return next;
};

const serialize = (value: unknown): string => JSON.stringify(value);

const changed = (a: unknown, b: unknown): boolean => serialize(a) !== serialize(b);

type EntityWithId = { id: string };

const indexById = <T extends EntityWithId>(items: T[]): Map<string, T> => {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return map;
};

const createEntry = (
  entityType: AuditEntityType,
  entityId: string,
  changeType: AuditEntry['changeType'],
  snapshot: unknown,
  sourceAction: string,
  note?: string,
): AuditEntry => ({
  id: crypto.randomUUID(),
  timestamp: new Date().toISOString(),
  entityType,
  entityId,
  changeType,
  sourceAction,
  snapshot,
  note,
});

const buildCollectionEntries = <T extends EntityWithId>(params: {
  entityType: AuditEntityType;
  prev: T[];
  next: T[];
  sourceAction: string;
  note?: string;
}): AuditEntry[] => {
  const entries: AuditEntry[] = [];
  const prevMap = indexById(params.prev);
  const nextMap = indexById(params.next);

  for (const [id, nextValue] of nextMap.entries()) {
    const prevValue = prevMap.get(id);
    if (!prevValue) {
      entries.push(
        createEntry(
          params.entityType,
          id,
          'create',
          stripSensitiveKeys(safeClone(nextValue)),
          params.sourceAction,
          params.note,
        ),
      );
      continue;
    }

    const prevSanitized = stripSensitiveKeys(prevValue);
    const nextSanitized = stripSensitiveKeys(nextValue);
    if (changed(prevSanitized, nextSanitized)) {
      entries.push(
        createEntry(
          params.entityType,
          id,
          'update',
          safeClone(nextSanitized),
          params.sourceAction,
          params.note,
        ),
      );
    }
  }

  for (const [id, prevValue] of prevMap.entries()) {
    if (!nextMap.has(id)) {
      entries.push(
        createEntry(
          params.entityType,
          id,
          'delete',
          stripSensitiveKeys(safeClone(prevValue)),
          params.sourceAction,
          params.note,
        ),
      );
    }
  }

  return entries;
};

type AllocationSnapshot = AccountAllocationCategory & { accountId: string };

const flattenAllocationItems = (accounts: Account[]): AllocationSnapshot[] => {
  const flattened: AllocationSnapshot[] = [];

  for (const account of accounts) {
    for (const category of account.allocationCategories || []) {
      flattened.push({
        ...category,
        id: `${account.id}:${category.id}`,
        accountId: account.id,
      });
    }
  }

  return flattened;
};

const buildSingletonEntry = (
  entityType: AuditEntityType,
  entityId: string,
  prevValue: unknown,
  nextValue: unknown,
  sourceAction: string,
  note?: string,
): AuditEntry[] => {
  const prevSanitized = stripSensitiveKeys(prevValue);
  const nextSanitized = stripSensitiveKeys(nextValue);

  if (!changed(prevSanitized, nextSanitized)) {
    return [];
  }

  return [
    createEntry(entityType, entityId, 'update', safeClone(nextSanitized), sourceAction, note),
  ];
};

export const buildAuditEntries = (params: {
  prev: BudgetData;
  next: BudgetData;
  sourceAction: string;
  note?: string;
}): AuditEntry[] => {
  const { prev, next, sourceAction, note } = params;

  const entries: AuditEntry[] = [];

  entries.push(
    ...buildCollectionEntries<Bill>({
      entityType: 'bill',
      prev: prev.bills || [],
      next: next.bills || [],
      sourceAction,
      note,
    }),
  );

  entries.push(
    ...buildCollectionEntries<Deduction>({
      entityType: 'deduction',
      prev: prev.preTaxDeductions || [],
      next: next.preTaxDeductions || [],
      sourceAction,
      note,
    }),
  );

  entries.push(
    ...buildCollectionEntries<SavingsContribution>({
      entityType: 'savings-contribution',
      prev: prev.savingsContributions || [],
      next: next.savingsContributions || [],
      sourceAction,
      note,
    }),
  );

  entries.push(
    ...buildCollectionEntries<RetirementElection>({
      entityType: 'retirement-election',
      prev: prev.retirement || [],
      next: next.retirement || [],
      sourceAction,
      note,
    }),
  );

  entries.push(
    ...buildCollectionEntries<Loan>({
      entityType: 'loan',
      prev: prev.loans || [],
      next: next.loans || [],
      sourceAction,
      note,
    }),
  );

  entries.push(
    ...buildCollectionEntries<Benefit>({
      entityType: 'benefit',
      prev: prev.benefits || [],
      next: next.benefits || [],
      sourceAction,
      note,
    }),
  );

  entries.push(
    ...buildCollectionEntries<Account>({
      entityType: 'account',
      prev: prev.accounts || [],
      next: next.accounts || [],
      sourceAction,
      note,
    }),
  );

  entries.push(
    ...buildCollectionEntries<AllocationSnapshot>({
      entityType: 'allocation-item',
      prev: flattenAllocationItems(prev.accounts || []),
      next: flattenAllocationItems(next.accounts || []),
      sourceAction,
      note,
    }),
  );

  entries.push(
    ...buildSingletonEntry(
      'pay-settings',
      'pay-settings',
      prev.paySettings,
      next.paySettings,
      sourceAction,
      note,
    ),
  );

  entries.push(
    ...buildSingletonEntry(
      'tax-settings',
      'tax-settings',
      prev.taxSettings,
      next.taxSettings,
      sourceAction,
      note,
    ),
  );

  entries.push(
    ...buildSingletonEntry(
      'budget-settings',
      'budget-settings',
      prev.settings,
      next.settings,
      sourceAction,
      note,
    ),
  );

  return entries;
};
