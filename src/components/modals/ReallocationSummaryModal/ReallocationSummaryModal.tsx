import React from 'react';
import { Button, CheckboxGroup, Modal, PillBadge } from '../../_shared';

export interface ReallocationSummaryItem {
  id: string;
  label: string;
  sourceTypeLabel: string;
  actionLabel: string;
  beforeLabel: string;
  afterLabel: string;
  deltaLabel: string;
}

interface ReallocationSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ReallocationSummaryItem[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  onUndoSelected: () => void;
  onUndoAll: () => void;
}

const ReallocationSummaryModal: React.FC<ReallocationSummaryModalProps> = ({
  isOpen,
  onClose,
  items,
  selectedIds,
  onSelectedIdsChange,
  onUndoSelected,
  onUndoAll,
}) => {
  const options = items.map((item) => ({
    value: item.id,
    label: (
      <div className="reallocation-option-label">
        <div className="reallocation-option-heading">
          <span className="reallocation-proposal-title">{item.label}</span>
          <div className="reallocation-proposal-badges">
            <PillBadge variant="info">{item.sourceTypeLabel}</PillBadge>
            <PillBadge variant="outline">{item.actionLabel}</PillBadge>
          </div>
        </div>
        <span className="reallocation-proposal-freed">{item.deltaLabel}</span>
      </div>
    ),
    description: `${item.beforeLabel} -> ${item.afterLabel}`,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      contentClassName="reallocation-modal"
      header="Reallocation Summary"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="secondary"
            onClick={onUndoSelected}
            disabled={selectedIds.length === 0}
          >
            Undo Selected
          </Button>
          <Button
            variant="danger"
            onClick={onUndoAll}
            disabled={items.length === 0}
          >
            Undo All
          </Button>
        </>
      }
    >
      <div className="reallocation-modal-body">
        <p className="reallocation-alert-note">
          Review what changed. Select any rows you want to roll back.
        </p>

        <div className="reallocation-proposal-list">
          <CheckboxGroup
            selectedValues={selectedIds}
            onChange={onSelectedIdsChange}
            options={options}
            layout="column"
            className="reallocation-checkbox-group"
          />
        </div>
      </div>
    </Modal>
  );
};

export default ReallocationSummaryModal;
