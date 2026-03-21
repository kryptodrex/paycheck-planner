import React, { useMemo, useState } from 'react';
import type { AuditEntry, AuditHistoryTarget } from '../../../types/audit';
import Button from '../../_shared/controls/Button';
import FormGroup from '../../_shared/controls/FormGroup';
import PillBadge from '../../_shared/controls/PillBadge';
import {
  extractFieldDiffs,
  formatDiffValueForField,
  formatFieldName,
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
  onClose: () => void;
  onDeleteEntry: (entryId: string) => void;
}

const PlanHistoryOverlay: React.FC<PlanHistoryOverlayProps> = ({
  isOpen,
  target,
  auditHistory,
  entityNames = {},
  onClose,
  onDeleteEntry,
}) => {
  const resolveValue = (key: string, value: unknown): string => {
    if (ID_FIELD_KEYS.has(key) && typeof value === 'string' && value in entityNames) {
      return entityNames[value];
    }
    return formatDiffValueForField(key, value);
  };
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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

        <div className="plan-history-filters-row">
          <FormGroup label="From">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </FormGroup>
          <FormGroup label="To">
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </FormGroup>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="plan-history-empty-state">No history entries match the selected filters.</div>
        ) : (
          <div className="plan-history-timeline-list">
            {filteredEntries.map((entry, idx) => {
              const isCardType = CARD_ENTITY_TYPES.has(entry.entityType);
              const prevEntry = idx + 1 < filteredEntries.length ? filteredEntries[idx + 1] : null;

              const fallbackPrevEntry =
                !prevEntry && entry.changeType === 'update'
                  ? auditHistory
                      .filter((candidate) => {
                        if (candidate.entityType !== entry.entityType) return false;

                        if (
                          candidate.entityType === 'allocation-item' &&
                          target.entityType === 'allocation-item' &&
                          candidate.entityId.startsWith(`${target.entityId}:`)
                        ) {
                          // include all allocation categories under this account
                        } else if (candidate.entityId !== entry.entityId) {
                          return false;
                        }

                        return new Date(candidate.timestamp).getTime() < new Date(entry.timestamp).getTime();
                      })
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] ?? null
                  : null;

              const baselineEntry = prevEntry ?? fallbackPrevEntry;
              const diffs =
                entry.changeType === 'update'
                  ? extractFieldDiffs(baselineEntry?.snapshot ?? {}, entry.snapshot)
                  : [];

              // For allocation items within an account view, extract category ID from entityId
              const displayId =
                entry.entityType === 'allocation-item' && entry.entityId.includes(':')
                  ? entry.entityId.split(':')[1]
                  : null;

              const changeBadgeVariant =
                entry.changeType === 'create'
                  ? 'success'
                  : entry.changeType === 'delete'
                    ? 'warning'
                    : 'info';

              const changeLabel =
                entry.changeType === 'create'
                  ? 'Created'
                  : entry.changeType === 'update'
                    ? 'Updated'
                    : 'Deleted';

              return (
                <div key={entry.id} className="plan-history-timeline-item">
                  <div className="plan-history-entry-meta">
                    <div className="plan-history-entry-meta-left">
                      <PillBadge variant={changeBadgeVariant}>{changeLabel}</PillBadge>
                      <span className="plan-history-entry-timestamp">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                      <span className="plan-history-entry-source">• {entry.sourceAction}</span>
                      {displayId && (
                        <span className="plan-history-entry-source">• Allocation: {displayId}</span>
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

                  {isCardType ? (
                    <>
                      <HistorySnapshotCard
                        entityType={entry.entityType}
                        snapshot={entry.snapshot}
                        entityNames={entityNames}
                      />
                      {diffs.length > 0 && (
                        <div className="plan-history-changed-fields">
                          <span className="plan-history-changed-label">Changed:</span>
                          {diffs.map((d) => (
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
                      {entry.changeType === 'update' && diffs.length > 0 && (
                        <div className="plan-history-entry-diffs">
                          {diffs.map((diff) => (
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

                      {entry.changeType === 'update' && diffs.length === 0 && (
                        <div className="plan-history-entry-no-diff">No field changes recorded.</div>
                      )}

                      {(entry.changeType === 'create' || entry.changeType === 'delete') && (
                        <div className="plan-history-entry-summary">
                          <span className="plan-history-summary-label">
                            {entry.changeType === 'create' ? 'New entry' : 'Removed entry'}
                          </span>
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
