import { describe, expect, it } from 'vitest';
import { FileStorageService } from '../services/fileStorage';
import { buildAuditEntries } from './auditHistory';

describe('buildAuditEntries', () => {
  it('creates a bill audit entry when a bill is added', () => {
    const prev = FileStorageService.createEmptyBudget(2026);
    const accountId = prev.accounts[0].id;

    const next = {
      ...prev,
      bills: [
        {
          id: 'bill-1',
          name: 'Electric',
          amount: 100,
          frequency: 'monthly' as const,
          accountId,
          enabled: true,
        },
      ],
    };

    const entries = buildAuditEntries({
      prev,
      next,
      sourceAction: 'Add bill',
    });

    expect(entries.some((entry) => entry.entityType === 'bill' && entry.changeType === 'create' && entry.entityId === 'bill-1')).toBe(true);
  });

  it('creates update and delete entries for changed entities', () => {
    const base = FileStorageService.createEmptyBudget(2026);
    const accountId = base.accounts[0].id;

    const prev = {
      ...base,
      bills: [
        {
          id: 'bill-1',
          name: 'Internet',
          amount: 60,
          frequency: 'monthly' as const,
          accountId,
          enabled: true,
        },
      ],
      savingsContributions: [
        {
          id: 'save-1',
          name: 'Emergency',
          amount: 150,
          frequency: 'monthly' as const,
          accountId,
          type: 'savings' as const,
          enabled: true,
        },
      ],
    };

    const next = {
      ...prev,
      bills: [
        {
          ...prev.bills[0],
          amount: 80,
        },
      ],
      savingsContributions: [],
    };

    const entries = buildAuditEntries({
      prev,
      next,
      sourceAction: 'Edit objects',
    });

    expect(entries.some((entry) => entry.entityType === 'bill' && entry.changeType === 'update' && entry.entityId === 'bill-1')).toBe(true);
    expect(entries.some((entry) => entry.entityType === 'savings-contribution' && entry.changeType === 'delete' && entry.entityId === 'save-1')).toBe(true);
  });

  it('captures allocation-item history from account allocationCategories', () => {
    const prev = FileStorageService.createEmptyBudget(2026);
    const accountId = prev.accounts[0].id;

    const next = {
      ...prev,
      accounts: [
        {
          ...prev.accounts[0],
          allocationCategories: [
            {
              id: 'alloc-1',
              name: 'Food',
              amount: 200,
            },
          ],
        },
      ],
    };

    const entries = buildAuditEntries({
      prev,
      next,
      sourceAction: 'Update allocations',
    });

    expect(
      entries.some(
        (entry) =>
          entry.entityType === 'allocation-item' &&
          entry.changeType === 'create' &&
          entry.entityId === `${accountId}:alloc-1`,
      ),
    ).toBe(true);
  });

  it('removes sensitive fields from settings snapshots', () => {
    const prev = FileStorageService.createEmptyBudget(2026);
    const next = {
      ...prev,
      settings: {
        ...prev.settings,
        locale: 'en-CA',
        encryptionKey: 'secret-should-not-be-captured',
      },
    };

    const entries = buildAuditEntries({
      prev,
      next,
      sourceAction: 'Update settings',
    });

    const settingsEntry = entries.find((entry) => entry.entityType === 'budget-settings');
    expect(settingsEntry).toBeTruthy();
    expect(JSON.stringify(settingsEntry?.snapshot)).not.toContain('secret-should-not-be-captured');
    expect(JSON.stringify(settingsEntry?.snapshot)).not.toContain('encryptionKey');
  });
});
