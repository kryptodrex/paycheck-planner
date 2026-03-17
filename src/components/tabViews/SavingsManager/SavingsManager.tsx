import React, { useEffect, useRef, useState } from 'react';
import { useBudget } from '../../../contexts/BudgetContext';
import { useAppDialogs } from '../../../hooks';
import type { SavingsContribution } from '../../../types/obligations';
import type { RetirementElection } from '../../../types/payroll';
import type { ViewMode } from '../../../types/viewMode';
import { formatWithSymbol, getCurrencySymbol } from '../../../utils/currency';
import { getPaychecksPerYear, getDisplayModeLabel, calculateGrossPayPerPaycheck, getPayFrequencyViewMode } from '../../../utils/payPeriod';
import { getSavingsFrequencyOccurrencesPerYear } from '../../../utils/frequency';
import { getDefaultAccountIcon } from '../../../utils/accountDefaults';
import { getAccountNameById } from '../../../utils/accountGrouping';
import { formatBillFrequency } from '../../../utils/billFrequency';
import { getRetirementPlanDisplayLabel, RETIREMENT_PLAN_OPTIONS } from '../../../utils/retirement';
import { toDisplayAmount } from '../../../utils/displayAmounts';
import { roundToCent } from '../../../utils/money';
import { Alert, Banner, Button, ConfirmDialog, FormGroup, InputWithPrefix, Modal, PageHeader, PillBadge, RadioGroup, SectionItemCard, ViewModeSelector } from '../../_shared';
import { GlossaryTerm } from '../../modals/GlossaryModal';
import '../tabViews.shared.css';
import './SavingsManager.css';

interface SavingsManagerProps {
  shouldScrollToRetirement?: boolean;
  onScrollToRetirementComplete?: () => void;
  displayMode?: ViewMode;
  onDisplayModeChange?: (mode: ViewMode) => void;
}

type SavingsFieldErrors = {
  name?: string;
  amount?: string;
  accountId?: string;
};

type RetirementFieldErrors = {
  employeeAmount?: string;
  sourceAccountId?: string;
  employerMatchCap?: string;
  yearlyLimit?: string;
  customLabel?: string;
};

const SavingsManager: React.FC<SavingsManagerProps> = ({
  shouldScrollToRetirement,
  onScrollToRetirementComplete,
  displayMode = 'paycheck',
  onDisplayModeChange,
}) => {
  const { confirmDialog, openConfirmDialog, closeConfirmDialog, confirmCurrentDialog } = useAppDialogs();
  const {
    budgetData,
    addSavingsContribution,
    updateSavingsContribution,
    deleteSavingsContribution,
    addRetirementElection,
    updateRetirementElection,
    deleteRetirementElection,
    calculateRetirementContributions,
  } = useBudget();

  const [showAddSavings, setShowAddSavings] = useState(false);
  const [editingSavings, setEditingSavings] = useState<SavingsContribution | null>(null);
  const [savingsName, setSavingsName] = useState('');
  const [savingsAmount, setSavingsAmount] = useState('');
  const [savingsFrequency, setSavingsFrequency] = useState<SavingsContribution['frequency']>('monthly');
  const [savingsType, setSavingsType] = useState<SavingsContribution['type']>('savings');
  const [savingsAccountId, setSavingsAccountId] = useState('');
  const [savingsNotes, setSavingsNotes] = useState('');
  const [savingsFieldErrors, setSavingsFieldErrors] = useState<SavingsFieldErrors>({});

  const [showAddRetirement, setShowAddRetirement] = useState(false);
  const [editingRetirement, setEditingRetirement] = useState<RetirementElection | null>(null);
  const [retirementType, setRetirementType] = useState<RetirementElection['type']>('401k');
  const [retirementCustomLabel, setRetirementCustomLabel] = useState('');
  const [employeeAmount, setEmployeeAmount] = useState('');
  const [employeeIsPercentage, setEmployeeIsPercentage] = useState(true);
  const [retirementSource, setRetirementSource] = useState<'paycheck' | 'account'>('paycheck');
  const [retirementSourceAccountId, setRetirementSourceAccountId] = useState('');
  const [retirementIsPreTax, setRetirementIsPreTax] = useState(true);
  const [employerMatchOption, setEmployerMatchOption] = useState<'no-match' | 'has-match'>('no-match');
  const [employerMatchCap, setEmployerMatchCap] = useState('');
  const [employerMatchCapIsPercentage, setEmployerMatchCapIsPercentage] = useState(true);
  const [yearlyLimit, setYearlyLimit] = useState('');
  const [retirementFieldErrors, setRetirementFieldErrors] = useState<RetirementFieldErrors>({});
  const [retirementFormMessage, setRetirementFormMessage] = useState<{ type: 'warning' | 'error'; message: string } | null>(null);

  const scrollCompletedRef = useRef(false);

  useEffect(() => {
    if (shouldScrollToRetirement && !scrollCompletedRef.current) {
      const element = document.getElementById('retirement-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        scrollCompletedRef.current = true;
        onScrollToRetirementComplete?.();
      }
    }

    if (!shouldScrollToRetirement) {
      scrollCompletedRef.current = false;
    }
  }, [shouldScrollToRetirement, onScrollToRetirementComplete]);

  if (!budgetData) return null;

  const currency = budgetData.settings?.currency || 'USD';
  const paychecksPerYear = getPaychecksPerYear(budgetData.paySettings.payFrequency);
  const grossPayPerPaycheck = calculateGrossPayPerPaycheck(budgetData.paySettings);

  const frequencyMatchesPaySchedule = (itemFrequency: string): boolean => {
    return getSavingsFrequencyOccurrencesPerYear(itemFrequency) === paychecksPerYear;
  };

  const getSavingsPerPaycheck = (item: SavingsContribution): number => {
    if (frequencyMatchesPaySchedule(item.frequency)) {
      return item.amount;
    }
    const totalPerYear = item.amount * getSavingsFrequencyOccurrencesPerYear(item.frequency);
    return totalPerYear / paychecksPerYear;
  };

  const getRetirementContributionPreview = (election: RetirementElection) => {
    if (grossPayPerPaycheck === 0) {
      return { employeeAmount: 0, employerAmount: 0 };
    }

    const employeeAmountPerPaycheck = election.employeeContributionIsPercentage
      ? (grossPayPerPaycheck * election.employeeContribution) / 100
      : election.employeeContribution;

    let employerAmountPerPaycheck = 0;
    if (election.hasEmployerMatch) {
      const employeePercentage = election.employeeContributionIsPercentage
        ? election.employeeContribution
        : (employeeAmountPerPaycheck / grossPayPerPaycheck) * 100;

      if (election.employerMatchCapIsPercentage) {
        const matchPercentage = Math.min(employeePercentage, election.employerMatchCap);
        employerAmountPerPaycheck = (grossPayPerPaycheck * matchPercentage) / 100;
      } else {
        employerAmountPerPaycheck = Math.min(employeeAmountPerPaycheck, election.employerMatchCap);
      }
    }

    return {
      employeeAmount: roundToCent(employeeAmountPerPaycheck),
      employerAmount: roundToCent(employerAmountPerPaycheck),
    };
  };

  const savingsContributions = budgetData.savingsContributions || [];

  const sortedSavings = [...savingsContributions].sort((a, b) => {
    const aEnabled = a.enabled !== false;
    const bEnabled = b.enabled !== false;
    if (aEnabled !== bEnabled) return aEnabled ? -1 : 1;
    return getSavingsPerPaycheck(b) - getSavingsPerPaycheck(a);
  });

  const savingsTotalPerPaycheck = sortedSavings.reduce((sum, item) => {
    if (item.enabled === false) return sum;
    return sum + getSavingsPerPaycheck(item);
  }, 0);

  const sortedRetirement = [...(budgetData.retirement || [])].sort((a, b) => {
    const aEnabled = a.enabled !== false;
    const bEnabled = b.enabled !== false;
    if (aEnabled !== bEnabled) return aEnabled ? -1 : 1;

    const aTotal = calculateRetirementContributions(a).employeeAmount + calculateRetirementContributions(a).employerAmount;
    const bTotal = calculateRetirementContributions(b).employeeAmount + calculateRetirementContributions(b).employerAmount;
    return bTotal - aTotal;
  });

  const retirementTotalPerPaycheck = sortedRetirement.reduce((sum, election) => {
    if (election.enabled === false) return sum;

    const { employeeAmount: employeePerPaycheck, employerAmount } = calculateRetirementContributions(election);
    return sum + employeePerPaycheck + employerAmount;
  }, 0);

  const totalSavingsAndRetirementPerPaycheck = roundToCent(
    savingsTotalPerPaycheck + retirementTotalPerPaycheck,
  );

  const handleAddSavings = () => {
    setEditingSavings(null);
    setSavingsName('');
    setSavingsAmount('');
    setSavingsFrequency('monthly');
    setSavingsType('savings');
    setSavingsAccountId(budgetData.accounts[0]?.id || '');
    setSavingsNotes('');
    setSavingsFieldErrors({});
    setShowAddSavings(true);
  };

  const handleEditSavings = (item: SavingsContribution) => {
    setEditingSavings(item);
    setSavingsName(item.name);
    setSavingsAmount(String(item.amount));
    setSavingsFrequency(item.frequency);
    setSavingsType(item.type);
    setSavingsAccountId(item.accountId);
    setSavingsNotes(item.notes || '');
    setSavingsFieldErrors({});
    setShowAddSavings(true);
  };

  const handleSaveSavings = () => {
    const name = savingsName.trim();
    const parsedAmount = parseFloat(savingsAmount);
    const errors: SavingsFieldErrors = {};

    if (!name) {
      errors.name = 'Contribution name is required.';
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      errors.amount = 'Please enter a valid amount greater than zero.';
    }

    if (!savingsAccountId) {
      errors.accountId = 'Please select a funding account.';
    }

    if (Object.keys(errors).length > 0) {
      setSavingsFieldErrors(errors);
      return;
    }

    const payload = {
      name,
      amount: parsedAmount,
      frequency: savingsFrequency,
      accountId: savingsAccountId,
      type: savingsType,
      notes: savingsNotes.trim() || undefined,
      enabled: editingSavings ? editingSavings.enabled !== false : true,
    };

    if (editingSavings) {
      updateSavingsContribution(editingSavings.id, payload);
    } else {
      addSavingsContribution(payload);
    }

    setShowAddSavings(false);
    setEditingSavings(null);
    setSavingsFieldErrors({});
  };

  const handleDeleteSavings = (id: string) => {
    openConfirmDialog({
      title: 'Delete Contribution',
      message: 'Are you sure you want to delete this contribution?',
      confirmLabel: 'Delete Contribution',
      confirmVariant: 'danger',
      onConfirm: () => deleteSavingsContribution(id),
    });
  };

  const handleToggleSavingsEnabled = (item: SavingsContribution) => {
    updateSavingsContribution(item.id, { enabled: item.enabled === false });
  };

  const checkYearlyLimitExceeded = (
    limit: number,
    employeeContribAmount: number,
    isPercentage: boolean,
  ): { exceeded: boolean; total: number; overage: number } => {
    const employeePerPaycheck = isPercentage
      ? (grossPayPerPaycheck * employeeContribAmount) / 100
      : employeeContribAmount;
    const total = employeePerPaycheck * paychecksPerYear;
    return {
      exceeded: total > limit,
      total,
      overage: Math.max(0, total - limit),
    };
  };

  const handleAutoCalculateYearlyAmount = () => {
    if (!yearlyLimit || parseFloat(yearlyLimit) <= 0) {
      setRetirementFormMessage({ type: 'warning', message: 'Please enter a yearly limit first.' });
      return;
    }

    const yearlyLimitAmount = parseFloat(yearlyLimit);
    const employeePerPaycheck = yearlyLimitAmount / paychecksPerYear;

    if (employeeIsPercentage) {
      setEmployeeAmount(((employeePerPaycheck / grossPayPerPaycheck) * 100).toFixed(2));
    } else {
      setEmployeeAmount(employeePerPaycheck.toFixed(2));
    }
    setRetirementFormMessage(null);
  };

  const handleAddRetirement = () => {
    setEditingRetirement(null);
    setRetirementType('401k');
    setRetirementCustomLabel('');
    setEmployeeAmount('');
    setEmployeeIsPercentage(true);
    setRetirementSource('paycheck');
    setRetirementSourceAccountId('');
    setRetirementIsPreTax(true);
    setEmployerMatchOption('no-match');
    setEmployerMatchCap('');
    setEmployerMatchCapIsPercentage(true);
    setYearlyLimit('');
    setRetirementFieldErrors({});
    setRetirementFormMessage(null);
    setShowAddRetirement(true);
  };

  const handleEditRetirement = (election: RetirementElection) => {
    setEditingRetirement(election);
    setRetirementType(election.type);
    setRetirementCustomLabel(election.customLabel || '');
    setEmployeeAmount(election.employeeContribution.toString());
    setEmployeeIsPercentage(election.employeeContributionIsPercentage);
    setRetirementSource(election.deductionSource || 'paycheck');
    setRetirementSourceAccountId(election.sourceAccountId || '');
    setRetirementIsPreTax(election.isPreTax !== false);
    setEmployerMatchOption(election.hasEmployerMatch ? 'has-match' : 'no-match');
    setEmployerMatchCap((election.employerMatchCap || 0).toString());
    setEmployerMatchCapIsPercentage(election.employerMatchCapIsPercentage);
    setYearlyLimit((election.yearlyLimit || '').toString());
    setRetirementFieldErrors({});
    setRetirementFormMessage(null);
    setShowAddRetirement(true);
  };

  const handleSaveRetirement = () => {
    const hasEmployerMatch = employerMatchOption === 'has-match';
    const parsedEmployeeContribution = parseFloat(employeeAmount);
    const parsedMatchCap = parseFloat(employerMatchCap);
    const parsedYearlyLimit = yearlyLimit ? parseFloat(yearlyLimit) : undefined;
    const isAccountSource = retirementSource === 'account';
    const errors: RetirementFieldErrors = {};

    if (!Number.isFinite(parsedEmployeeContribution) || parsedEmployeeContribution < 0) {
      errors.employeeAmount = 'Please enter a valid contribution amount.';
    }

    if (retirementType === 'other' && !retirementCustomLabel.trim()) {
      errors.customLabel = 'Please enter a custom plan name for "Other" retirement type.';
    }

    if (isAccountSource && !retirementSourceAccountId) {
      errors.sourceAccountId = 'Please select an account for this retirement deduction source.';
    }

    if (hasEmployerMatch && (!Number.isFinite(parsedMatchCap) || parsedMatchCap < 0)) {
      errors.employerMatchCap = 'Please enter a valid employer match cap.';
    }

    if (yearlyLimit && (!Number.isFinite(parsedYearlyLimit) || (parsedYearlyLimit ?? 0) <= 0)) {
      errors.yearlyLimit = 'Please enter a valid yearly limit greater than zero.';
    }

    if (Object.keys(errors).length > 0) {
      setRetirementFieldErrors(errors);
      setRetirementFormMessage(null);
      return;
    }

    if (parsedYearlyLimit && parsedYearlyLimit > 0) {
      const limitCheck = checkYearlyLimitExceeded(
        parsedYearlyLimit,
        parsedEmployeeContribution,
        employeeIsPercentage,
      );

      if (limitCheck.exceeded) {
        setRetirementFormMessage({
          type: 'error',
          message: `This contribution would exceed your yearly limit by ${formatWithSymbol(limitCheck.overage, currency, { minimumFractionDigits: 2 })}. Total would be ${formatWithSymbol(limitCheck.total, currency, { minimumFractionDigits: 2 })} vs limit of ${formatWithSymbol(parsedYearlyLimit, currency, { minimumFractionDigits: 2 })}. Use "Auto-Calculate" to adjust or reduce the amount.`,
        });
        return;
      }
    }

    const retirementData = {
      type: retirementType,
      customLabel: retirementType === 'other' ? retirementCustomLabel.trim() : undefined,
      employeeContribution: parsedEmployeeContribution,
      employeeContributionIsPercentage: employeeIsPercentage,
      enabled: editingRetirement ? editingRetirement.enabled !== false : true,
      isPreTax: isAccountSource ? false : retirementIsPreTax,
      deductionSource: retirementSource,
      sourceAccountId: isAccountSource ? retirementSourceAccountId : undefined,
      hasEmployerMatch,
      employerMatchCap: hasEmployerMatch ? (Number.isNaN(parsedMatchCap) ? 0 : parsedMatchCap) : 0,
      employerMatchCapIsPercentage: hasEmployerMatch ? employerMatchCapIsPercentage : false,
      yearlyLimit: parsedYearlyLimit,
    };

    if (editingRetirement) {
      updateRetirementElection(editingRetirement.id, retirementData);
    } else {
      addRetirementElection(retirementData);
    }

    setShowAddRetirement(false);
    setEditingRetirement(null);
    setRetirementFieldErrors({});
    setRetirementFormMessage(null);
  };

  const handleDeleteRetirement = (id: string) => {
    openConfirmDialog({
      title: 'Delete Retirement Election',
      message: 'Are you sure you want to delete this retirement election?',
      confirmLabel: 'Delete Election',
      confirmVariant: 'danger',
      onConfirm: () => deleteRetirementElection(id),
    });
  };

  const handleToggleRetirementEnabled = (retirement: RetirementElection) => {
    updateRetirementElection(retirement.id, { enabled: retirement.enabled === false });
  };

  return (
    <div className="tab-view savings-manager">
      <PageHeader
        title="Savings"
        subtitle="Manage savings/investment transfers and retirement contributions"
        actions={(
          <ViewModeSelector
            mode={displayMode}
            onChange={onDisplayModeChange || (() => {})}
            payCadenceMode={getPayFrequencyViewMode(budgetData.paySettings.payFrequency)}
          />
        )}
      />

      <Banner
        label={`Total ${getDisplayModeLabel(displayMode)} Across All Accounts`}
        value={formatWithSymbol(toDisplayAmount(totalSavingsAndRetirementPerPaycheck, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      />

      <div className="savings-section">
        <div className="section-header">
          <div>
            <h2>Savings &amp; Investment Contributions</h2>
            <p>Track regular transfers funded from your accounts</p>
          </div>
          <div className="section-total">
            <div>
              <span className="section-total-label">Total {getDisplayModeLabel(displayMode)}</span>
              <span className="section-total-amount">
                {formatWithSymbol(toDisplayAmount(savingsTotalPerPaycheck, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <Button variant="primary" onClick={handleAddSavings}>+ Add Contribution</Button>
          </div>
        </div>

        {sortedSavings.length === 0 ? (
          <div className="empty-state empty-state--dashed empty-state--compact">
            <div className="empty-icon">💰</div>
            <h3>No Savings Contributions Yet</h3>
            <p>Add regular savings or investment transfers to get started</p>
          </div>
        ) : (
          <div className="savings-list">
            {sortedSavings.map((item) => {
              const accountName = getAccountNameById(budgetData.accounts, item.accountId);
              const perPaycheck = getSavingsPerPaycheck(item);
              const displayAmount = toDisplayAmount(perPaycheck, paychecksPerYear, displayMode);
              const isEnabled = item.enabled !== false;

              return (
                <SectionItemCard
                  key={item.id}
                  title={item.name}
                  subtitle={`Saved ${formatBillFrequency(item.frequency)}: ${formatWithSymbol(item.amount, currency, { minimumFractionDigits: 2 })}`}
                  amount={formatWithSymbol(displayAmount, currency, { minimumFractionDigits: 2 })}
                  amountLabel={getDisplayModeLabel(displayMode)}
                  badges={
                    <>
                      <PillBadge variant={item.type === 'investment' ? 'accent' : 'info'}>
                        {item.type === 'investment' ? 'Investment' : 'Savings'}
                      </PillBadge>
                      <PillBadge variant="neutral">From {accountName}</PillBadge>
                    </>
                  }
                  isPaused={!isEnabled}
                  onPauseToggle={() => handleToggleSavingsEnabled(item)}
                  onEdit={() => handleEditSavings(item)}
                  onDelete={() => handleDeleteSavings(item.id)}
                >
                  {item.notes && <div className="savings-notes">{item.notes}</div>}
                </SectionItemCard>
              );
            })}
          </div>
        )}
      </div>

      <div id="retirement-section" className="savings-section">
        <div className="section-header">
          <div>
            <h2><GlossaryTerm termId="retirement-contribution">Retirement</GlossaryTerm> Plans</h2>
            <p>401k, 403b, IRA, and other retirement plan contributions</p>
          </div>
          <div className="section-total">
            <div>
              <span className="section-total-label">Total {getDisplayModeLabel(displayMode)}</span>
              <span className="section-total-amount">
                {formatWithSymbol(toDisplayAmount(retirementTotalPerPaycheck, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <Button variant="primary" onClick={handleAddRetirement}>+ Add Retirement Plan</Button>
          </div>
        </div>

        {sortedRetirement.length === 0 ? (
          <div className="empty-state empty-state--dashed empty-state--compact">
            <div className="empty-icon">🏦</div>
            <h3>No Retirement Plans Yet</h3>
            <p>Add your retirement plans to get started</p>
          </div>
        ) : (
          <div className="retirement-list">
            {sortedRetirement.map((retirement) => {
              const { employeeAmount: employeePerPaycheck, employerAmount } = getRetirementContributionPreview(retirement);
              const totalPerPaycheck = employeePerPaycheck + employerAmount;
              const totalInDisplayMode = toDisplayAmount(totalPerPaycheck, paychecksPerYear, displayMode);
              const isEnabled = retirement.enabled !== false;
              const isPreTaxRetirement = retirement.isPreTax !== false;
              const sourceLabel = retirement.deductionSource === 'account'
                ? `From ${getAccountNameById(budgetData.accounts, retirement.sourceAccountId)}`
                : 'From Paycheck';
              const displayLabel = getRetirementPlanDisplayLabel(retirement);

              return (
                <SectionItemCard
                  key={retirement.id}
                  title={displayLabel}
                  subtitle={`${formatWithSymbol(employeePerPaycheck || 0, currency, { minimumFractionDigits: 2 })} per paycheck${retirement.employeeContributionIsPercentage ? ` (${retirement.employeeContribution}%)` : ''}`}
                  amount={formatWithSymbol(totalInDisplayMode, currency, { minimumFractionDigits: 2 })}
                  amountLabel={getDisplayModeLabel(displayMode)}
                  badges={
                    <>
                      <PillBadge variant={isPreTaxRetirement ? 'success' : 'warning'}>
                        {isPreTaxRetirement ? 'Pre-Tax' : 'Post-Tax'}
                      </PillBadge>
                      <PillBadge variant="neutral">{sourceLabel}</PillBadge>
                    </>
                  }
                  isPaused={!isEnabled}
                  onPauseToggle={() => handleToggleRetirementEnabled(retirement)}
                  onEdit={() => handleEditRetirement(retirement)}
                  onDelete={() => handleDeleteRetirement(retirement.id)}
                >
                  <div className="retirement-details">
                    <div className="detail">
                      <span className="label"><GlossaryTerm termId="retirement-contribution">Your Contribution</GlossaryTerm>:</span>
                      <span className="value">
                        {formatWithSymbol(employeePerPaycheck || 0, currency, { minimumFractionDigits: 2 })} per paycheck
                        {retirement.employeeContributionIsPercentage && ` (${retirement.employeeContribution}%)`}
                      </span>
                    </div>
                    {retirement.hasEmployerMatch && (
                      <div className="detail">
                        <span className="label"><GlossaryTerm termId="employer-match">Employer Match</GlossaryTerm>:</span>
                        <span className="value">
                          {formatWithSymbol(employerAmount || 0, currency, { minimumFractionDigits: 2 })} per paycheck
                          {' '}(up to {retirement.employerMatchCapIsPercentage ? `${retirement.employerMatchCap || 0}%` : formatWithSymbol(retirement.employerMatchCap || 0, currency, { minimumFractionDigits: 2 })})
                        </span>
                      </div>
                    )}
                    {displayMode !== 'paycheck' && (
                      <div className="detail total-detail">
                        <span className="label">Total {getDisplayModeLabel(displayMode)}:</span>
                        <span className="value emphasized">{formatWithSymbol(totalInDisplayMode, currency, { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {retirement.yearlyLimit && (
                      <div className="detail">
                        <span className="label"><GlossaryTerm termId="annual-contribution-limit">Yearly Limit</GlossaryTerm>:</span>
                        <span className="value">{formatWithSymbol(retirement.yearlyLimit, currency, { minimumFractionDigits: 2 })} max per year</span>
                      </div>
                    )}
                  </div>
                </SectionItemCard>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={showAddSavings}
        onClose={() => {
          setShowAddSavings(false);
          setSavingsFieldErrors({});
        }}
        header={editingSavings ? 'Edit Contribution' : 'Add Savings / Investment Contribution'}
        footer={(
          <>
            <Button type="button" variant="secondary" onClick={() => {
              setShowAddSavings(false);
              setSavingsFieldErrors({});
            }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" onClick={handleSaveSavings}>
              {editingSavings ? 'Update Contribution' : 'Add Contribution'}
            </Button>
          </>
        )}
      >
        <FormGroup label="Contribution Name" required error={savingsFieldErrors.name}>
          <input
            type="text"
            value={savingsName}
            onChange={(e) => {
              setSavingsName(e.target.value);
              if (savingsFieldErrors.name) {
                setSavingsFieldErrors((prev) => ({ ...prev, name: undefined }));
              }
            }}
            className={savingsFieldErrors.name ? 'field-error' : ''}
            placeholder="e.g., Emergency Fund, Brokerage Transfer"
            required
          />
        </FormGroup>

        <div className="form-row">
          <FormGroup label="Amount" required error={savingsFieldErrors.amount}>
            <InputWithPrefix
              prefix={getCurrencySymbol(currency)}
              type="number"
              value={savingsAmount}
              onChange={(e) => {
                setSavingsAmount(e.target.value);
                if (savingsFieldErrors.amount) {
                  setSavingsFieldErrors((prev) => ({ ...prev, amount: undefined }));
                }
              }}
              className={savingsFieldErrors.amount ? 'field-error' : ''}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
            />
          </FormGroup>
          <FormGroup label="Frequency" required>
            <select value={savingsFrequency} onChange={(e) => setSavingsFrequency(e.target.value as SavingsContribution['frequency'])}>
              <option value="weekly">Weekly</option>
              <option value="bi-weekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="semi-annual">Semi-annual</option>
              <option value="yearly">Yearly</option>
            </select>
          </FormGroup>
        </div>

        <div className="form-row">
          <FormGroup label="Category" required>
            <select value={savingsType} onChange={(e) => setSavingsType(e.target.value as SavingsContribution['type'])}>
              <option value="savings">Savings</option>
              <option value="investment">Investment</option>
            </select>
          </FormGroup>
          <FormGroup label="Paid from Account" required error={savingsFieldErrors.accountId}>
            <select
              value={savingsAccountId}
              className={savingsFieldErrors.accountId ? 'field-error' : ''}
              onChange={(e) => {
                setSavingsAccountId(e.target.value);
                if (savingsFieldErrors.accountId) {
                  setSavingsFieldErrors((prev) => ({ ...prev, accountId: undefined }));
                }
              }}
              required
            >
              {budgetData.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.icon || getDefaultAccountIcon(account.type)} {account.name}
                </option>
              ))}
            </select>
          </FormGroup>
        </div>

        <FormGroup label="Notes">
          <textarea
            value={savingsNotes}
            onChange={(e) => setSavingsNotes(e.target.value)}
            placeholder="Optional notes"
            rows={2}
          />
        </FormGroup>
      </Modal>

      <Modal
        isOpen={showAddRetirement}
        onClose={() => {
          setShowAddRetirement(false);
          setRetirementFieldErrors({});
          setRetirementFormMessage(null);
        }}
        header={editingRetirement ? 'Edit Retirement Plan' : 'Add Retirement Plan'}
        footer={(
          <>
            <Button type="button" variant="secondary" onClick={() => {
              setShowAddRetirement(false);
              setRetirementFieldErrors({});
              setRetirementFormMessage(null);
            }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" onClick={handleSaveRetirement}>
              {editingRetirement ? 'Update Plan' : 'Add Plan'}
            </Button>
          </>
        )}
      >
        <FormGroup label={<><GlossaryTerm termId="retirement-contribution">Plan Type</GlossaryTerm></>} required>
          <select value={retirementType} onChange={(e) => setRetirementType(e.target.value as RetirementElection['type'])} required>
            {RETIREMENT_PLAN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </FormGroup>

        {retirementType === 'other' && (
          <FormGroup label="Custom Plan Name" required error={retirementFieldErrors.customLabel}>
            <input
              type="text"
              value={retirementCustomLabel}
              className={retirementFieldErrors.customLabel ? 'field-error' : ''}
              onChange={(e) => {
                setRetirementCustomLabel(e.target.value);
                if (retirementFieldErrors.customLabel) {
                  setRetirementFieldErrors((prev) => ({ ...prev, customLabel: undefined }));
                }
              }}
              placeholder="e.g., 457(b), Solo 401(k), SIMPLE IRA"
              required
            />
          </FormGroup>
        )}

        <div className="retirement-form-section">
          <h4><GlossaryTerm termId="retirement-contribution">Your Contribution</GlossaryTerm></h4>

          <FormGroup label="Deduction Source" error={retirementFieldErrors.sourceAccountId}>
            <select
              className={retirementFieldErrors.sourceAccountId ? 'field-error' : ''}
              value={retirementSource === 'account' ? retirementSourceAccountId : 'paycheck'}
              onChange={(e) => {
                if (e.target.value === 'paycheck') {
                  setRetirementSource('paycheck');
                  setRetirementSourceAccountId('');
                  setRetirementIsPreTax(true);
                } else {
                  setRetirementSource('account');
                  setRetirementSourceAccountId(e.target.value);
                  setRetirementIsPreTax(false);
                }
                if (retirementFieldErrors.sourceAccountId) {
                  setRetirementFieldErrors((prev) => ({ ...prev, sourceAccountId: undefined }));
                }
              }}
            >
              <option value="paycheck">Paid from Paycheck</option>
              {budgetData.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.icon || getDefaultAccountIcon(account.type)} {account.name}
                </option>
              ))}
            </select>
          </FormGroup>

          <div className="form-row">
            <FormGroup label="Amount" required error={retirementFieldErrors.employeeAmount}>
              <InputWithPrefix
                prefix={!employeeIsPercentage ? getCurrencySymbol(currency) : ''}
                suffix={employeeIsPercentage ? '%' : ''}
                type="number"
                value={employeeAmount}
                className={retirementFieldErrors.employeeAmount ? 'field-error' : ''}
                onChange={(e) => {
                  setEmployeeAmount(e.target.value);
                  if (retirementFieldErrors.employeeAmount) {
                    setRetirementFieldErrors((prev) => ({ ...prev, employeeAmount: undefined }));
                  }
                }}
                placeholder={employeeIsPercentage ? '0' : '0.00'}
                step={employeeIsPercentage ? '0.1' : '0.01'}
                min="0"
                required
              />
            </FormGroup>
            <FormGroup label="Type">
              <select value={employeeIsPercentage ? 'percentage' : 'amount'} onChange={(e) => setEmployeeIsPercentage(e.target.value === 'percentage')}>
                <option value="amount">Fixed Amount</option>
                <option value="percentage">Percentage of Gross</option>
              </select>
            </FormGroup>
          </div>

          {retirementSource === 'paycheck' && (
            <FormGroup label={<><GlossaryTerm termId="pre-tax-deduction">Tax Treatment</GlossaryTerm></>}>
              <RadioGroup
                name="taxTreatment"
                value={retirementIsPreTax ? 'pre-tax' : 'post-tax'}
                onChange={(value) => setRetirementIsPreTax(value === 'pre-tax')}
                layout="column"
                options={[
                  { value: 'pre-tax', label: 'Pre-Tax', description: 'Reduces taxable income' },
                  { value: 'post-tax', label: 'Post-Tax', description: 'Deducted after taxes' },
                ]}
              />
            </FormGroup>
          )}

          {retirementFormMessage && <Alert type={retirementFormMessage.type}>{retirementFormMessage.message}</Alert>}

          <div className="retirement-form-divider">
            <h4><GlossaryTerm termId="annual-contribution-limit">Yearly Limit</GlossaryTerm> (Optional)</h4>
            <FormGroup label={<><GlossaryTerm termId="annual-contribution-limit">Maximum Yearly Contribution</GlossaryTerm></>} error={retirementFieldErrors.yearlyLimit}>
              <InputWithPrefix
                prefix={getCurrencySymbol(currency)}
                type="number"
                value={yearlyLimit}
                className={retirementFieldErrors.yearlyLimit ? 'field-error' : ''}
                onChange={(e) => {
                  setYearlyLimit(e.target.value);
                  if (retirementFieldErrors.yearlyLimit) {
                    setRetirementFieldErrors((prev) => ({ ...prev, yearlyLimit: undefined }));
                  }
                }}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </FormGroup>
            {yearlyLimit && parseFloat(yearlyLimit) > 0 && (
              <Button type="button" variant="secondary" onClick={handleAutoCalculateYearlyAmount}>Auto-Calculate to Limit</Button>
            )}
          </div>
        </div>

        <div className="retirement-form-section">
          <h4><GlossaryTerm termId="employer-match">Employer Match</GlossaryTerm> (Optional)</h4>
          <FormGroup label={<><GlossaryTerm termId="employer-match">Employer Match Availability</GlossaryTerm></>}>
            <RadioGroup
              name="employerMatch"
              value={employerMatchOption}
              onChange={(value) => setEmployerMatchOption(value as 'no-match' | 'has-match')}
              layout="column"
              options={[
                { value: 'no-match', label: 'Employer does not offer match' },
                { value: 'has-match', label: 'Employer offers match' },
              ]}
            />
          </FormGroup>

          {employerMatchOption === 'has-match' && (
            <div className="form-row">
              <FormGroup label={<><GlossaryTerm termId="employer-match">Match Cap</GlossaryTerm></>} required error={retirementFieldErrors.employerMatchCap}>
                <InputWithPrefix
                  prefix={!employerMatchCapIsPercentage ? getCurrencySymbol(currency) : ''}
                  suffix={employerMatchCapIsPercentage ? '%' : ''}
                  type="number"
                  value={employerMatchCap}
                  className={retirementFieldErrors.employerMatchCap ? 'field-error' : ''}
                  onChange={(e) => {
                    setEmployerMatchCap(e.target.value);
                    if (retirementFieldErrors.employerMatchCap) {
                      setRetirementFieldErrors((prev) => ({ ...prev, employerMatchCap: undefined }));
                    }
                  }}
                  placeholder={employerMatchCapIsPercentage ? '6' : '0.00'}
                  step={employerMatchCapIsPercentage ? '0.1' : '0.01'}
                  min="0"
                  required
                />
              </FormGroup>
              <FormGroup label={<><GlossaryTerm termId="employer-match">Cap Type</GlossaryTerm></>}>
                <select value={employerMatchCapIsPercentage ? 'percentage' : 'amount'} onChange={(e) => setEmployerMatchCapIsPercentage(e.target.value === 'percentage')}>
                  <option value="percentage">% of Gross Pay</option>
                  <option value="amount">Fixed Amount</option>
                </select>
              </FormGroup>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDialog}
        onClose={closeConfirmDialog}
        onConfirm={confirmCurrentDialog}
        title={confirmDialog?.title || 'Confirm'}
        message={confirmDialog?.message || ''}
        confirmLabel={confirmDialog?.confirmLabel}
        cancelLabel={confirmDialog?.cancelLabel}
        confirmVariant={confirmDialog?.confirmVariant}
      />
    </div>
  );
};

export default SavingsManager;
