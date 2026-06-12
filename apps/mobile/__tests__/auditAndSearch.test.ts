import { describe, it, expect } from 'vitest';
import {
  buildAuditEntries,
  generateDemoBudgetData,
  generateId,
  type BudgetData,
} from '@paycheck-planner/core';
import { searchPlan } from '../src/utils/planSearch';

const basePlan = (): BudgetData => generateDemoBudgetData(2026);

describe('buildAuditEntries', () => {
  it('returns no entries when nothing changed', () => {
    const plan = basePlan();
    expect(buildAuditEntries({ prev: plan, next: plan, sourceAction: 'noop' })).toHaveLength(0);
  });

  it('records bill creation with a snapshot', () => {
    const prev = basePlan();
    const newBill = {
      id: generateId(),
      name: 'Internet',
      amount: 80,
      frequency: 'monthly' as const,
      accountId: prev.accounts[0].id,
    };
    const next = { ...prev, bills: [...prev.bills, newBill] };

    const entries = buildAuditEntries({ prev, next, sourceAction: 'Add bill' });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      entityType: 'bill',
      entityId: newBill.id,
      changeType: 'create',
      sourceAction: 'Add bill',
    });
    expect((entries[0].snapshot as { name: string }).name).toBe('Internet');
  });

  it('records updates and deletes', () => {
    const prev = basePlan();
    const [first, ...rest] = prev.bills;
    const next = {
      ...prev,
      bills: [{ ...first, amount: first.amount + 10 }, ...rest.slice(1)],
    };

    const entries = buildAuditEntries({ prev, next, sourceAction: 'Edit bills' });
    const changeTypes = entries.map((entry) => entry.changeType).sort();
    expect(changeTypes).toEqual(['delete', 'update']);
  });

  it('records pay settings changes as a singleton update', () => {
    const prev = basePlan();
    const next = {
      ...prev,
      paySettings: { ...prev.paySettings, minLeftover: 123 },
    };

    const entries = buildAuditEntries({ prev, next, sourceAction: 'Edit pay settings' });
    expect(entries).toHaveLength(1);
    expect(entries[0].entityType).toBe('pay-settings');
  });
});

describe('searchPlan', () => {
  const plan = basePlan();

  it('returns nothing for short queries', () => {
    expect(searchPlan(plan, 'a')).toHaveLength(0);
  });

  it('finds bills by name', () => {
    const bill = plan.bills[0];
    const results = searchPlan(plan, bill.name.slice(0, 4));
    expect(results.some((result) => result.id === `bill-${bill.id}`)).toBe(true);
  });

  it('finds accounts and routes them to the accounts tab', () => {
    const account = plan.accounts[0];
    const results = searchPlan(plan, account.name.slice(0, 4).toLowerCase());
    const match = results.find((result) => result.id === `account-${account.id}`);
    expect(match?.destination.route).toBe('/(tabs)/accounts');
  });

  it('surfaces quick actions for tax queries', () => {
    const results = searchPlan(plan, 'tax');
    expect(results.some((result) => result.id === 'qa-taxes')).toBe(true);
  });
});
