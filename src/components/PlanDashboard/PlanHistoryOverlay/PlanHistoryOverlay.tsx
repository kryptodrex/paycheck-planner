import React, { useMemo, useState } from 'react';
import type { AuditEntry, AuditHistoryTarget } from '../../../types/audit';
import Button from '../../_shared/controls/Button';
import PillBadge from '../../_shared/controls/PillBadge';
import {
  ALLOCATION_NOISE_FIELDS,
  extractFieldDiffs,
  formatDiffValueForField,
  formatFieldName,
  getSummaryFields,
  ID_FIELD_KEYS,
} from '../../../utils/historyDiff';
import HistorySnapshotCard, { CARD_ENTITY_TYPES } from './HistorySnapshotCard';
import './PlanHistoryOverlay.css';

interface PlanHistoryOverlayProps {
  isOpen: boolean;
  target: AuditHistoryTarget | null;
  auditHistory: AuditEntry[];
  /** Map of entity ID → display name, used to resolve raw IDs in diffs */
  entityNames?: Record<string, string>;
  onRestoreEntries: (entryIds: string[]) => void;
  onClose: () => void;
  onDeleteEntry: (entryId: string) => void;
}

interface TimelineEntryView {
  entry: AuditEntry;
  isCardType: boolean;
  diffs: ReturnType<typeof extractFieldDiffs>;
  cardDiffs: ReturnType<typeof extractFieldDiffs>;
  summary: string[];
  displayId: string | null;
  allocationName: string | null;
  changeBadgeVariant: 'success' | 'warning' | 'info' | 'accent';
  changeLabel: 'Created' | 'Updated' | 'Deleted' | 'Restored';
}

const PlanHistoryOverlay: React.FC<PlanHistoryOverlayProps> = ({
  isOpen,
  target,
  auditHistory,
  entityNames = {},
  onRestoreEntries,
  onClose,
  onDeleteEntry,
}) => {
  const resolveValue = (key: string, value: unknown): string => {
    if (ID_FIELD_KEYS.has(key) && typeof value === 'string' && value in entityNames) {
      return entityNames[value];
    }
    return formatDiffValueForField(key, value);
  };
  const [dateFrom] = useState('');
  const [dateTo] = useState('');

  // The most recent audit timestamp for this target entity (across all history, pre-filter).
  // Used to hide the action button on the entry that represents the current state.
  const latestAuditTimestamp = useMemo(() => {
    if (!target) return null;
    const relevant = auditHistory.filter((e) => {
      if (e.entityType !== target.entityType) return false;
      if (e.entityType === 'allocation-item') return e.entityId.startsWith(`${target.entityId}:`);
      return e.entityId === target.entityId;
    });
    if (relevant.length === 0) return null;
    return relevant.reduce(
      (latest, e) => (new Date(e.timestamp).getTime() > new Date(latest).getTime() ? e.timestamp : latest),
      relevant[0].timestamp,
    );
  }, [auditHistory, target]);

  const filteredEntries = useMemo(() => {
    if (!target) return [];

    return auditHistory
      .filter((entry) => {
        // Skip budget-settings entries (app-level settings, not business data)
        if (entry.entityType === 'budget-settings') {
          return false;
        }

        if (entry.entityType !== target.entityType) {
          return false;
        }

        // For allocation-item with account ID, match entries that start with accountId:
        if (entry.entityType === 'allocation-item' && entry.entityId.startsWith(`${target.entityId}:`)) {
          // This matches all allocations for this account
        } else if (entry.entityId !== target.entityId) {
          // For other types, require exact ID match
          return false;
        }

        const entryDate = new Date(entry.timestamp);
        if (Number.isNaN(entryDate.getTime())) return false;

        if (dateFrom) {
          const from = new Date(`${dateFrom}T00:00:00`);
          if (entryDate < from) return false;
        }

        if (dateTo) {
          const to = new Date(`${dateTo}T23:59:59.999`);
          if (entryDate > to) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [auditHistory, dateFrom, dateTo, target]);

  const isSameAllocationBatch = (a: AuditEntry, b: AuditEntry): boolean => {
    if (a.entityType !== 'allocation-item' || b.entityType !== 'allocation-item') return false;
    return (
      a.changeType === b.changeType
      && a.sourceAction === b.sourceAction
      && a.timestamp.slice(0, 19) === b.timestamp.slice(0, 19)
    );
  };

  const toAllocationSummaryText = (snapshot: unknown): string => {
    if (!snapshot || typeof snapshot !== 'object') return 'Allocation item';
    const s = snapshot as Record<string, unknown>;
    const name = typeof s.name === 'string' && s.name.length > 0 ? s.name : 'Allocation item';
    const amount = typeof s.amount === 'number'
      ? `$${s.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : null;
    return amount ? `${name} • ${amount}` : name;
  };

  const buildEntryView = (entry: AuditEntry, idx: number): TimelineEntryView | null => {
    const isCardType = CARD_ENTITY_TYPES.has(entry.entityType);
    const sameEntityInFiltered = filteredEntries
      .slice(idx + 1)
      .find((candidate) => candidate.entityId === entry.entityId) ?? null;

    const fallbackPrevEntry =
      !sameEntityInFiltered && (entry.changeType === 'update' || entry.changeType === 'restore')
        ? auditHistory
            .filter((candidate) => {
              if (candidate.entityType !== entry.entityType) return false;
              if (candidate.entityId !== entry.entityId) return false;
              return new Date(candidate.timestamp).getTime() < new Date(entry.timestamp).getTime();
            })
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] ?? null
        : null;

    const baselineEntry = sameEntityInFiltered ?? fallbackPrevEntry;
    const allDiffs =
      (entry.changeType === 'update' || entry.changeType === 'restore')
        ? extractFieldDiffs(baselineEntry?.snapshot ?? {}, entry.snapshot)
        : [];
    const diffs =
      entry.entityType === 'allocation-item'
        ? allDiffs.filter((diff) => !ALLOCATION_NOISE_FIELDS.has(diff.key))
        : allDiffs;

    // Do not render no-op update rows.
    if ((entry.changeType === 'update' || entry.changeType === 'restore') && diffs.length === 0) {
      return null;
    }

    const cardDiffs =
      isCardType && entry.entityType === 'loan'
        ? diffs.filter((diff) => diff.key !== 'paymentBreakdown')
        : diffs;
    const summary = getSummaryFields(entry.snapshot, 8);
    const displayId =
      entry.entityType === 'allocation-item' && entry.entityId.includes(':')
        ? entry.entityId.split(':')[1]
        : null;
    const allocationName =
      entry.entityType === 'allocation-item'
      && entry.snapshot
      && typeof entry.snapshot === 'object'
      && typeof (entry.snapshot as Record<string, unknown>).name === 'string'
        ? (entry.snapshot as Record<string, unknown>).name as string
        : null;

    const changeBadgeVariant =
      entry.changeType === 'create'
        ? 'success'
        : entry.changeType === 'restore'
          ? 'accent'
        : entry.changeType === 'delete'
          ? 'warning'
          : 'info';

    const changeLabel =
      entry.changeType === 'create'
        ? 'Created'
        : entry.changeType === 'restore'
          ? 'Restored'
        : entry.changeType === 'update'
          ? 'Updated'
          : 'Deleted';

    return {
      entry,
      isCardType,
      diffs,
      cardDiffs,
      summary,
      displayId,
      allocationName,
      changeBadgeVariant,
      changeLabel,
    };
  };

  if (!isOpen || !target) return null;

  return (
    <div
      className="plan-history-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Object history"
      onClick={onClose}
    >
      <div className="plan-history-panel" onClick={(e) => e.stopPropagation()}>
        <div className="plan-history-header">
          <h2>{target.title} History</h2>
          <Button variant="utility" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Disabled until we get better styling for it. But not sure it's needed either, as audit history likely won't be too long. */}
        {/* <div className="plan-history-filters-row">
          <FormGroup label="From">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </FormGroup>
          <FormGroup label="To">
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </FormGroup>
        </div> */}

        {filteredEntries.length === 0 ? (
          <div className="plan-history-empty-state">No history entries match the selected filters.</div>
        ) : (
          <div className="plan-history-timeline-list">
            {filteredEntries.map((entry, idx) => {
              // For allocation batches, only render the first entry as the group container.
              if (entry.entityType === 'allocation-item' && idx > 0 && isSameAllocationBatch(filteredEntries[idx - 1], entry)) {
                return null;
              }

              const view = buildEntryView(entry, idx);
              if (!view) return null;

              if (entry.entityType === 'allocation-item') {
                const batchViews: TimelineEntryView[] = [];
                for (let i = idx; i < filteredEntries.length; i += 1) {
                  const candidate = filteredEntries[i];
                  if (!isSameAllocationBatch(entry, candidate)) break;
                  const candidateView = buildEntryView(candidate, i);
                  if (candidateView) batchViews.push(candidateView);
                }

                if (batchViews.length === 0) return null;
                const first = batchViews[0];

                return (
                  <div key={`${entry.id}-allocation-batch`} className="plan-history-timeline-item">
                    <div className="plan-history-entry-meta">
                      <div className="plan-history-entry-meta-left">
                        <PillBadge variant={first.changeBadgeVariant}>{first.changeLabel}</PillBadge>
                        <span className="plan-history-entry-timestamp">
                          {new Date(first.entry.timestamp).toLocaleString()}
                        </span>
                        <span className="plan-history-entry-source">• {first.entry.sourceAction}</span>
                        {!['create', 'restore'].includes(first.entry.changeType) && first.entry.timestamp.slice(0, 19) !== latestAuditTimestamp?.slice(0, 19) && (
                          <Button
                            variant="utility"
                            className="plan-history-entry-restore"
                            onClick={() => onRestoreEntries(batchViews.map((v) => v.entry.id))}
                          >
                            {first.entry.changeType === 'delete' ? 'Restore' : 'Rewind'}
                          </Button>
                        )}
                      </div>
                      <Button
                        variant="utility"
                        className="plan-history-entry-delete"
                        onClick={() => onDeleteEntry(first.entry.id)}
                      >
                        Delete
                      </Button>
                    </div>

                    <div className="plan-history-allocation-batch-count">
                      {batchViews.length} allocation item{batchViews.length === 1 ? '' : 's'} {first.entry.changeType === 'restore' ? 'restored' : first.entry.changeType === 'create' ? 'created' : first.entry.changeType === 'delete' ? 'removed' : 'updated'}
                    </div>
                    <div className="plan-history-allocation-batch-list">
                      {batchViews.map((allocationView) => (
                        <div key={allocationView.entry.id} className="plan-history-allocation-batch-row">
                          <div className="plan-history-allocation-batch-title">
                            {allocationView.allocationName || allocationView.displayId || 'Allocation'}
                          </div>

                          {(allocationView.entry.changeType === 'update' || allocationView.entry.changeType === 'restore') ? (
                            <div className="plan-history-changed-fields">
                              {allocationView.diffs.map((diff) => (
                                <span key={diff.key} className="plan-history-changed-field">
                                  <span className="plan-history-changed-field-name">{formatFieldName(diff.key)}:</span>
                                  <span className="plan-history-changed-old">{resolveValue(diff.key, diff.oldValue)}</span>
                                  <span className="plan-history-changed-arrow">→</span>
                                  <span className="plan-history-changed-new">{resolveValue(diff.key, diff.newValue)}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="plan-history-allocation-batch-summary">
                              {toAllocationSummaryText(allocationView.entry.snapshot)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div key={entry.id} className="plan-history-timeline-item">
                  <div className="plan-history-entry-meta">
                    <div className="plan-history-entry-meta-left">
                      <PillBadge variant={view.changeBadgeVariant}>{view.changeLabel}</PillBadge>
                      <span className="plan-history-entry-timestamp">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                      <span className="plan-history-entry-source">• {entry.sourceAction}</span>
                      {(view.allocationName || view.displayId) && (
                        <span className="plan-history-entry-source">
                          • Allocation: {view.allocationName || view.displayId}
                        </span>
                      )}
                      {entry.changeType !== 'restore' && entry.timestamp.slice(0, 19) !== latestAuditTimestamp?.slice(0, 19) && (
                        <Button
                          variant="utility"
                          className="plan-history-entry-restore"
                          onClick={() => onRestoreEntries([entry.id])}
                        >
                          {entry.changeType === 'delete' ? 'Restore' : 'Rewind'}
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="utility"
                      className="plan-history-entry-delete"
                      onClick={() => onDeleteEntry(entry.id)}
                    >
                      Delete
                    </Button>
                  </div>

                  {view.isCardType ? (
                    <>
                      <HistorySnapshotCard
                        entityType={entry.entityType}
                        snapshot={entry.snapshot}
                        entityNames={entityNames}
                      />
                      {view.cardDiffs.length > 0 && (
                        <div className="plan-history-changed-fields">
                          <span className="plan-history-changed-label">Changed:</span>
                          {view.cardDiffs.map((d) => (
                            <span key={d.key} className="plan-history-changed-field">
                              <span className="plan-history-changed-field-name">{formatFieldName(d.key)}:</span>
                              <span className="plan-history-changed-old">{resolveValue(d.key, d.oldValue)}</span>
                              <span className="plan-history-changed-arrow">→</span>
                              <span className="plan-history-changed-new">{resolveValue(d.key, d.newValue)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {(entry.changeType === 'update' || entry.changeType === 'restore') && view.diffs.length > 0 && (
                        <div className="plan-history-entry-diffs">
                          {view.diffs.map((diff) => (
                            <div key={diff.key} className="plan-history-diff-field">
                              <div className="plan-history-diff-key">{formatFieldName(diff.key)}</div>
                              <div className="plan-history-diff-values">
                                <div className="plan-history-diff-old">
                                  <span className="plan-history-diff-label">Old</span>
                                  <span className="plan-history-diff-value">
                                    {resolveValue(diff.key, diff.oldValue)}
                                  </span>
                                </div>
                                <div className="plan-history-diff-arrow">→</div>
                                <div className="plan-history-diff-new">
                                  <span className="plan-history-diff-label">New</span>
                                  <span className="plan-history-diff-value">
                                    {resolveValue(diff.key, diff.newValue)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {(entry.changeType === 'create' || entry.changeType === 'delete') && (
                        <div className="plan-history-entry-summary">
                          <span className="plan-history-summary-label">
                            {entry.changeType === 'create' ? 'New entry' : 'Removed entry'}
                          </span>
                          {view.summary.length > 0 && (
                            <div className="plan-history-summary-fields">
                              {view.summary.map((line, i) => (
                                <div key={`${entry.id}-summary-${i}`} className="plan-history-summary-field">
                                  {line}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanHistoryOverlay;
