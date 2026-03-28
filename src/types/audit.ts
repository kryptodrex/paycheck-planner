export type AuditEntityType =
  | 'bill'
  | 'deduction'
  | 'savings-contribution'
  | 'retirement-election'
  | 'loan'
  | 'benefit'
  | 'other-income'
  | 'account'
  | 'allocation-item'
  | 'pay-settings'
  | 'tax-settings'
  | 'budget-settings';

export type AuditChangeType = 'create' | 'update' | 'delete' | 'restore';

export interface AuditEntry {
  id: string;
  timestamp: string;
  entityType: AuditEntityType;
  entityId: string;
  changeType: AuditChangeType;
  sourceAction: string;
  snapshot: unknown;
  note?: string;
}

export interface BudgetMetadata {
  auditHistory: AuditEntry[];
}

export interface AuditHistoryTarget {
  entityType: AuditEntityType;
  entityId: string;
  title: string;
}
