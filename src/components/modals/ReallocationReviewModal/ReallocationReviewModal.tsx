import React from 'react';
import type { Account } from '../../../types/accounts';
import type { Bill } from '../../../types/obligations';
import type { Benefit } from '../../../types/payroll';
import type { ReallocationProposal } from '../../../services/reallocationPlanner';
import type { ViewMode } from '../../../types/viewMode';
import { formatWithSymbol } from '../../../utils/currency';
import { toDisplayAmount } from '../../../utils/displayAmounts';
import { Alert, Button, CheckboxGroup, Modal, PillBadge } from '../../_shared';

interface ReallocationReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  proposals: ReallocationProposal[];
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  selectedFullyResolved: boolean;
  selectedProjectedRemaining: number;
  selectedFreedPerPaycheck: number;
  leftoverPerPaycheck: number;
  targetLeftoverPerPaycheck: number;
  currency: string;
  paychecksPerYear: number;
  displayMode: ViewMode;
  payFrequencyLabel: string;
  accounts: Account[];
  bills: Bill[];
  benefits: Benefit[];
}

const ReallocationReviewModal: React.FC<ReallocationReviewModalProps> = ({
  isOpen,
  onClose,
  onApply,
  proposals,
  selectedIds,
  onSelectedIdsChange,
  selectedFullyResolved,
  selectedProjectedRemaining,
  selectedFreedPerPaycheck,
  leftoverPerPaycheck,
  targetLeftoverPerPaycheck,
  currency,
  paychecksPerYear,
  displayMode,
  payFrequencyLabel,
  accounts,
  bills,
  benefits,
}) => {
  const getSourceBadge = (sourceType: ReallocationProposal['sourceType']): { label: string; variant: 'accent' | 'info' | 'warning' | 'neutral' } => {
    switch (sourceType) {
      case 'bill':
        return { label: 'Bill', variant: 'neutral' };
      case 'deduction':
        return { label: 'Deduction', variant: 'neutral' };
      case 'custom-allocation':
        return { label: 'Custom Allocation', variant: 'info' };
      case 'savings':
        return { label: 'Savings', variant: 'accent' };
      case 'investment':
        return { label: 'Investment', variant: 'info' };
      case 'retirement':
        return { label: 'Retirement', variant: 'warning' };
      default:
        return { label: 'Source', variant: 'neutral' };
    }
  };

  const getOriginBadgeLabel = (proposal: ReallocationProposal): string | null => {
    if (proposal.sourceType === 'deduction') {
      const benefit = benefits.find((item) => item.id === proposal.sourceId);
      if (!benefit) return null;

      if ((benefit.deductionSource || 'paycheck') === 'paycheck') {
        return 'From Paycheck';
      }

      const accountName = accounts.find((account) => account.id === benefit.sourceAccountId)?.name;
      return accountName ? `From ${accountName}` : 'From Account';
    }

    if (proposal.sourceType === 'bill') {
      const bill = bills.find((item) => item.id === proposal.sourceId);
      if (!bill) return null;

      const accountName = accounts.find((account) => account.id === bill.accountId)?.name;
      return accountName ? `Paid From ${accountName}` : 'Paid From Account';
    }

    if (proposal.sourceType === 'custom-allocation') {
      const accountId = proposal.sourceId.split(':')[0];
      const accountName = accounts.find((account) => account.id === accountId)?.name;
      return accountName ? `From ${accountName}` : 'Custom Item';
    }

    return null;
  };

  const options = proposals.map((proposal) => {
    const sourceBadge = getSourceBadge(proposal.sourceType);
    const originBadge = getOriginBadgeLabel(proposal);

    return {
      value: proposal.sourceId,
      label: (
        <div className="reallocation-option-label">
          <div className="reallocation-option-heading">
            <span className="reallocation-proposal-title">{proposal.label}</span>
            <div className="reallocation-proposal-badges">
              <PillBadge variant={sourceBadge.variant}>{sourceBadge.label}</PillBadge>
              {originBadge && <PillBadge variant="outline">{originBadge}</PillBadge>}
            </div>
          </div>
          <span className="reallocation-proposal-freed">
            +{formatWithSymbol(toDisplayAmount(proposal.freedPerPaycheckAmount, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      ),
      description: proposal.action === 'pause'
        ? `Pause this item (currently ${formatWithSymbol(toDisplayAmount(proposal.currentPerPaycheckAmount, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${payFrequencyLabel.toLowerCase()}).`
        : proposal.action === 'zero'
          ? `Set this item to ${formatWithSymbol(0, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (currently ${formatWithSymbol(toDisplayAmount(proposal.currentPerPaycheckAmount, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${payFrequencyLabel.toLowerCase()}).`
          : `Reduce from ${formatWithSymbol(toDisplayAmount(proposal.currentPerPaycheckAmount, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to ${formatWithSymbol(toDisplayAmount(proposal.proposedPerPaycheckAmount, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${payFrequencyLabel.toLowerCase()}.`,
    };
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      contentClassName="reallocation-modal"
      header="Automated Reallocation Review"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onApply}
            disabled={selectedIds.length === 0}
          >
            Apply Selected Changes
          </Button>
        </>
      }
    >
      <div className="reallocation-modal-body">
        <Alert type={selectedFullyResolved ? 'success' : 'warning'}>
          {selectedFullyResolved
            ? `Selected changes raise remaining for spending to ${formatWithSymbol(toDisplayAmount(selectedProjectedRemaining, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2 })}, meeting your target.`
            : `Selected changes raise remaining for spending to ${formatWithSymbol(toDisplayAmount(selectedProjectedRemaining, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2 })}, which is still below your target.`}
        </Alert>

        <div className="reallocation-summary-grid">
          <div className="reallocation-summary-card">
            <span className="reallocation-summary-label">Current Remaining</span>
            <strong>{formatWithSymbol(toDisplayAmount(leftoverPerPaycheck, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
          <div className="reallocation-summary-card">
            <span className="reallocation-summary-label">Target Remaining</span>
            <strong>{formatWithSymbol(toDisplayAmount(targetLeftoverPerPaycheck, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
          <div className="reallocation-summary-card">
            <span className="reallocation-summary-label">Freed by Selected Changes</span>
            <strong>{formatWithSymbol(toDisplayAmount(selectedFreedPerPaycheck, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
        </div>

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

export default ReallocationReviewModal;
