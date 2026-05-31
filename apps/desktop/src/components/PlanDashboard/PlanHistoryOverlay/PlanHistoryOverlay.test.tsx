import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { AuditEntry } from '../../../types/audit';
import PlanHistoryOverlay from './PlanHistoryOverlay';

describe('PlanHistoryOverlay delete behavior', () => {
  it('deletes the clicked legacy "Initial tracked state" entry, not the item above it', () => {
    const newerEntry: AuditEntry = {
      id: 'legacy-duplicate-id',
      timestamp: '2026-02-01T12:00:00.000Z',
      entityType: 'bill',
      entityId: 'bill-1',
      changeType: 'update',
      sourceAction: 'Edit bill',
      snapshot: {
        id: 'bill-1',
        name: 'Internet',
        amount: 85,
        enabled: true,
      },
    };

    const legacyInitialTrackedEntry: AuditEntry = {
      id: 'legacy-duplicate-id',
      timestamp: '2026-01-01T12:00:00.000Z',
      entityType: 'bill',
      entityId: 'bill-1',
      changeType: 'update',
      sourceAction: 'Edit bill',
      snapshot: {
        id: 'bill-1',
        name: 'Internet',
        amount: 80,
        enabled: true,
      },
    };

    const onDeleteEntry = vi.fn();

    render(
      <PlanHistoryOverlay
        isOpen
        target={{ entityType: 'bill', entityId: 'bill-1', title: 'Internet Bill' }}
        auditHistory={[newerEntry, legacyInitialTrackedEntry]}
        onRestoreEntries={vi.fn()}
        onClose={vi.fn()}
        onDeleteEntry={onDeleteEntry}
      />,
    );

    const initialTrackedStateLabel = screen.getByText('Initial tracked state');
    const initialTrackedStateRow = initialTrackedStateLabel.closest('.plan-history-timeline-item');

    expect(initialTrackedStateRow).not.toBeNull();

    const deleteButton = within(initialTrackedStateRow as HTMLElement).getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButton);

    expect(onDeleteEntry).toHaveBeenCalledTimes(1);
    expect(onDeleteEntry).toHaveBeenCalledWith(legacyInitialTrackedEntry, 1);
  });
});
