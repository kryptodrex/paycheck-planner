import React, { useCallback, useMemo, useState } from 'react';
import type { Account } from '../../../types/accounts';
import type { Bill } from '../../../types/obligations';
import type { Benefit } from '../../../types/payroll';
import type {
  ReallocationPlan,
  ReallocationProposal,
  ReallocationProposalSourceType,
} from '../../../services/reallocationPlanner';
import { buildOverriddenPlan } from '../../../services/reallocationPlanner';
import type { ViewMode } from '../../../types/viewMode';
import { formatWithSymbol } from '../../../utils/currency';
import { toDisplayAmount } from '../../../utils/displayAmounts';
import { getDisplayModeLabel } from '../../../utils/payPeriod';
import { Alert, Button, Modal, PillBadge, ProgressBar, Slider, Toggle } from '../../_shared';
import './ReallocationReviewModal.css';

const PAUSE_ONLY_TYPES: ReadonlySet<ReallocationProposalSourceType> = new Set(['bill', 'deduction']);
const ADJUSTABLE_TYPES: ReadonlySet<ReallocationProposalSourceType> = new Set([
  'custom-allocation',
  'savings',
  'investment',
  'retirement',
]);

const SECTION_ORDER: ReadonlyArray<{
  type: ReallocationProposalSourceType;
  label: string;
  isPauseOnly: boolean;
}> = [
  { type: 'bill', label: 'Bills', isPauseOnly: true },
  { type: 'deduction', label: 'Deductions', isPauseOnly: true },
  { type: 'custom-allocation', label: 'Custom Allocations', isPauseOnly: false },
  { type: 'savings', label: 'Savings', isPauseOnly: false },
  { type: 'investment', label: 'Investments', isPauseOnly: false },
  { type: 'retirement', label: 'Retirement', isPauseOnly: false },
];

function roundToCent(value: number): number {
  return Math.round(value * 100) / 100;
}

function applyAutoBalance(
  currentOverrides: Map<string, number>,
  changedSourceId: string,
  proposals: ReallocationProposal[],
  shortfall: number,
): Map<string, number> {
  const newOverrides = new Map(currentOverrides);
  const totalFreed = proposals.reduce((sum, p) => sum + (newOverrides.get(p.sourceId) ?? 0), 0);
  const delta = roundToCent(totalFreed - shortfall);

  if (Math.abs(delta) < 0.005) return newOverrides;

  const adjustable = proposals.filter(
    (p) => p.sourceId !== changedSourceId && ADJUSTABLE_TYPES.has(p.sourceType),
  );

  if (adjustable.length === 0) return newOverrides;

  if (delta > 0) {
    // Over-freed: reduce others proportionally
    const totalOtherFreed = adjustable.reduce(
      (sum, p) => sum + (newOverrides.get(p.sourceId) ?? 0),
      0,
    );
    if (totalOtherFreed < 0.005) return newOverrides;
    for (const p of adjustable) {
      const freed = newOverrides.get(p.sourceId) ?? 0;
      if (freed <= 0) continue;
      const reduction = roundToCent(delta * (freed / totalOtherFreed));
      newOverrides.set(p.sourceId, Math.max(0, roundToCent(freed - reduction)));
    }
  } else {
    // Under-freed: fill gap from adjustable items in order
    let gap = -delta;
    for (const p of adjustable) {
      if (gap < 0.005) break;
      const freed = newOverrides.get(p.sourceId) ?? 0;
      const available = p.currentPerPaycheckAmount - freed;
      if (available <= 0) continue;
      const increase = roundToCent(Math.min(available, gap));
      newOverrides.set(p.sourceId, roundToCent(freed + increase));
      gap -= increase;
    }
  }

  return newOverrides;
}

interface ReallocationReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (plan: ReallocationPlan) => void;
  plan: ReallocationPlan;
  leftoverPerPaycheck: number;
  targetLeftoverPerPaycheck: number;
  currency: string;
  paychecksPerYear: number;
  displayMode: ViewMode;
  accounts: Account[];
  bills: Bill[];
  benefits: Benefit[];
}

const ReallocationReviewModal: React.FC<ReallocationReviewModalProps> = ({
  isOpen,
  onClose,
  onApply,
  plan,
  leftoverPerPaycheck,
  targetLeftoverPerPaycheck,
  currency,
  paychecksPerYear,
  displayMode,
  accounts,
  bills,
  benefits,
}) => {
  const displayModeLabel = getDisplayModeLabel(displayMode);

  const [overrides, setOverrides] = useState<Map<string, number>>(
    () => new Map(plan.proposals.map((p) => [p.sourceId, p.freedPerPaycheckAmount])),
  );
  const [autoBalance, setAutoBalance] = useState(false);

  const totalFreed = useMemo(
    () =>
      roundToCent(
        plan.proposals.reduce((sum, p) => sum + (overrides.get(p.sourceId) ?? 0), 0),
      ),
    [overrides, plan.proposals],
  );

  const projectedRemaining = useMemo(
    () => roundToCent(plan.currentRemainingPerPaycheck + totalFreed),
    [plan.currentRemainingPerPaycheck, totalFreed],
  );

  const progressPercentage =
    plan.shortfallPerPaycheck > 0.005
      ? Math.min(100, (totalFreed / plan.shortfallPerPaycheck) * 100)
      : 100;

  const progressVariant =
    progressPercentage >= 100 ? 'success' : progressPercentage >= 50 ? 'warning' : 'danger';

  const fullyResolved = projectedRemaining >= plan.targetRemainingPerPaycheck - 0.01;

  const fmt = useCallback(
    (amountPerPaycheck: number) =>
      formatWithSymbol(
        toDisplayAmount(amountPerPaycheck, paychecksPerYear, displayMode),
        currency,
        { minimumFractionDigits: 2, maximumFractionDigits: 2 },
      ),
    [currency, displayMode, paychecksPerYear],
  );

  const handleSliderChange = useCallback(
    (sourceId: string, newFreed: number) => {
      const clamped = roundToCent(Math.max(0, newFreed));
      setOverrides((prev) => {
        const next = new Map(prev);
        next.set(sourceId, clamped);
        return autoBalance
          ? applyAutoBalance(next, sourceId, plan.proposals, plan.shortfallPerPaycheck)
          : next;
      });
    },
    [autoBalance, plan.proposals, plan.shortfallPerPaycheck],
  );

  const handleToggleChange = useCallback(
    (sourceId: string, checked: boolean, maxAmount: number) => {
      setOverrides((prev) => {
        const next = new Map(prev);
        next.set(sourceId, checked ? maxAmount : 0);
        return autoBalance
          ? applyAutoBalance(next, sourceId, plan.proposals, plan.shortfallPerPaycheck)
          : next;
      });
    },
    [autoBalance, plan.proposals, plan.shortfallPerPaycheck],
  );

  const handleResetAll = useCallback(() => {
    setOverrides(new Map(plan.proposals.map((p) => [p.sourceId, p.freedPerPaycheckAmount])));
  }, [plan.proposals]);

  const handleResetSection = useCallback(
    (type: ReallocationProposalSourceType) => {
      setOverrides((prev) => {
        const next = new Map(prev);
        plan.proposals
          .filter((p) => p.sourceType === type)
          .forEach((p) => next.set(p.sourceId, p.freedPerPaycheckAmount));
        return next;
      });
    },
    [plan.proposals],
  );

  const handlePauseAllSection = useCallback(
    (type: ReallocationProposalSourceType) => {
      setOverrides((prev) => {
        const next = new Map(prev);
        plan.proposals
          .filter((p) => p.sourceType === type)
          .forEach((p) => next.set(p.sourceId, p.currentPerPaycheckAmount));
        return next;
      });
    },
    [plan.proposals],
  );

  const handleClearSection = useCallback(
    (type: ReallocationProposalSourceType) => {
      setOverrides((prev) => {
        const next = new Map(prev);
        plan.proposals
          .filter((p) => p.sourceType === type)
          .forEach((p) => next.set(p.sourceId, 0));
        return next;
      });
    },
    [plan.proposals],
  );

  const handleApply = useCallback(() => {
    onApply(buildOverriddenPlan(plan, overrides));
  }, [onApply, plan, overrides]);

  const getSourceBadge = useCallback(
    (
      sourceType: ReallocationProposalSourceType,
    ): { label: string; variant: 'accent' | 'info' | 'warning' | 'neutral' } => {
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
    },
    [],
  );

  const getOriginLabel = useCallback(
    (proposal: ReallocationProposal): string | null => {
      if (proposal.sourceType === 'deduction') {
        const benefit = benefits.find((item) => item.id === proposal.sourceId);
        if (!benefit) return null;
        if ((benefit.deductionSource ?? 'paycheck') === 'paycheck') return 'From Paycheck';
        const acctName = accounts.find((a) => a.id === benefit.sourceAccountId)?.name;
        return acctName ? `From ${acctName}` : 'From Account';
      }
      if (proposal.sourceType === 'bill') {
        const bill = bills.find((item) => item.id === proposal.sourceId);
        if (!bill) return null;
        const acctName = accounts.find((a) => a.id === bill.accountId)?.name;
        return acctName ? `Paid From ${acctName}` : 'Paid From Account';
      }
      if (proposal.sourceType === 'custom-allocation') {
        const accountId = proposal.sourceId.split(':')[0];
        const acctName = accounts.find((a) => a.id === accountId)?.name;
        return acctName ? `From ${acctName}` : 'Custom Item';
      }
      return null;
    },
    [accounts, benefits, bills],
  );

  const proposalsByType = useMemo(() => {
    const map = new Map<ReallocationProposalSourceType, ReallocationProposal[]>();
    for (const p of plan.proposals) {
      if (!map.has(p.sourceType)) map.set(p.sourceType, []);
      map.get(p.sourceType)!.push(p);
    }
    return map;
  }, [plan.proposals]);

  const progressLabel = fullyResolved
    ? `Goal met — ${fmt(projectedRemaining)} projected remaining`
    : `${fmt(totalFreed)} freed of ${fmt(plan.shortfallPerPaycheck)} needed`;

  if (!isOpen) return null;

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
          <Button variant="primary" onClick={handleApply} disabled={totalFreed < 0.005}>
            Apply Changes
          </Button>
        </>
      }
    >
      <div className="reallocation-modal-body">
        <Alert type={fullyResolved ? 'success' : 'warning'}>
          {fullyResolved
            ? `These changes raise your remaining to ${fmt(projectedRemaining)}, meeting your target.`
            : `These changes raise your remaining to ${fmt(projectedRemaining)}, still below your target of ${fmt(plan.targetRemainingPerPaycheck)}.`}
        </Alert>

        <div className="reallocation-summary-grid">
          <div className="reallocation-summary-card">
            <span className="reallocation-summary-label">Current Remaining</span>
            <strong>{fmt(leftoverPerPaycheck)}</strong>
          </div>
          <div className="reallocation-summary-card">
            <span className="reallocation-summary-label">Target Remaining</span>
            <strong>{fmt(targetLeftoverPerPaycheck)}</strong>
          </div>
          <div className="reallocation-summary-card reallocation-summary-card--projected">
            <span className="reallocation-summary-label">Projected Remaining</span>
            <strong>{fmt(projectedRemaining)}</strong>
          </div>
        </div>

        <div
          className={`reallocation-progress-section reallocation-progress-section--${progressVariant}`}
        >
          <ProgressBar
            percentage={progressPercentage}
            label={
              <span className="reallocation-progress-label-text">{progressLabel}</span>
            }
          />
        </div>

        <div className="reallocation-controls-row">
          <Toggle checked={autoBalance} onChange={setAutoBalance} label="Auto-balance mode" />
          <Button variant="secondary" onClick={handleResetAll}>
            Reset to suggestions
          </Button>
        </div>

        <div className="reallocation-proposal-list">
          {SECTION_ORDER.map(({ type, label, isPauseOnly }) => {
            const sectionProposals = proposalsByType.get(type);
            if (!sectionProposals || sectionProposals.length === 0) return null;

            return (
              <div key={type} className="reallocation-section">
                <div className="reallocation-section-header">
                  <div className="reallocation-section-title-row">
                    <span className="reallocation-section-title">{label}</span>
                    <PillBadge variant="neutral">
                      {sectionProposals.length} item
                      {sectionProposals.length !== 1 ? 's' : ''}
                    </PillBadge>
                  </div>
                  <div className="reallocation-section-actions">
                    {isPauseOnly ? (
                      <>
                        <button
                          type="button"
                          className="reallocation-section-btn"
                          onClick={() => handlePauseAllSection(type)}
                        >
                          Pause all
                        </button>
                        <button
                          type="button"
                          className="reallocation-section-btn"
                          onClick={() => handleClearSection(type)}
                        >
                          Clear all
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="reallocation-section-btn"
                        onClick={() => handleResetSection(type)}
                      >
                        Reset section
                      </button>
                    )}
                  </div>
                </div>

                <div className="reallocation-section-items">
                  {sectionProposals.map((proposal) => {
                    const overrideFreed =
                      overrides.get(proposal.sourceId) ?? proposal.freedPerPaycheckAmount;
                    const sourceBadge = getSourceBadge(proposal.sourceType);
                    const originLabel = getOriginLabel(proposal);
                    const newProposed = Math.max(
                      0,
                      proposal.currentPerPaycheckAmount - overrideFreed,
                    );
                    const isActive = overrideFreed > 0.005;

                    return (
                      <div key={proposal.sourceId} className="reallocation-row">
                        <div className="reallocation-row-header">
                          <div className="reallocation-row-info">
                            <span className="reallocation-proposal-title">{proposal.label}</span>
                            <div className="reallocation-proposal-badges">
                              {originLabel && (
                                <PillBadge variant="outline">{originLabel}</PillBadge>
                              )}
                            </div>
                          </div>
                          <span
                            className={`reallocation-row-freed ${isActive ? 'is-active' : 'is-muted'}`}
                          >
                            {isActive ? `+${fmt(overrideFreed)}` : '—'}
                          </span>
                        </div>

                        <div className="reallocation-row-control">
                          {PAUSE_ONLY_TYPES.has(proposal.sourceType) ? (
                            <Toggle
                              checked={isActive}
                              onChange={(checked) =>
                                handleToggleChange(
                                  proposal.sourceId,
                                  checked,
                                  proposal.currentPerPaycheckAmount,
                                )
                              }
                              label={
                                isActive
                                  ? `Pause — frees ${fmt(proposal.currentPerPaycheckAmount)} ${displayModeLabel.toLowerCase()}`
                                  : `Skip — currently ${fmt(proposal.currentPerPaycheckAmount)} ${displayModeLabel.toLowerCase()}`
                              }
                            />
                          ) : (
                            <div className="reallocation-slider-area">
                              <Slider
                                value={overrideFreed}
                                min={0}
                                max={proposal.currentPerPaycheckAmount}
                                step={0.01}
                                size="md"
                                aria-label={`Adjust freed amount for ${proposal.label}`}
                                onChange={(val) =>
                                  handleSliderChange(proposal.sourceId, val)
                                }
                              />
                              <div className="reallocation-slider-labels">
                                <span className="reallocation-slider-bound">
                                  {fmt(0)}
                                </span>
                                <span className="reallocation-slider-new-value">
                                  New: {fmt(newProposed)} {displayModeLabel.toLowerCase()}
                                </span>
                                <span className="reallocation-slider-bound">
                                  {fmt(proposal.currentPerPaycheckAmount)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

export default ReallocationReviewModal;
