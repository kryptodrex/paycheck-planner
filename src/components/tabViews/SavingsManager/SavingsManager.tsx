import React, { useEffect, useRef, useState } from 'react';
import { ChartNoAxesCombined, PiggyBank, Plus } from 'lucide-react';
import { useBudget } from '../../../contexts/BudgetContext';
import { useAppDialogs } from '../../../hooks';
import type { AuditHistoryTarget } from '../../../types/audit';
import type { SavingsContribution } from '../../../types/obligations';
import type { RetirementElection } from '../../../types/payroll';
import type { ViewMode } from '../../../types/viewMode';
import { formatWithSymbol, getCurrencySymbol } from '../../../utils/currency';
import { getPaychecksPerYear, getDisplayModeLabel, calculateGrossPayPerPaycheck } from '../../../utils/payPeriod';
import { getSavingsFrequencyOccurrencesPerYear } from '../../../utils/frequency';
import { getAccountNameById } from '../../../utils/accountGrouping';
import { formatBillFrequency } from '../../../utils/billFrequency';
import { getRetirementPlanDisplayLabel, RETIREMENT_PLAN_OPTIONS } from '../../../utils/retirement';
import { toDisplayAmount } from '../../../utils/displayAmounts';
import { roundToCent } from '../../../utils/money';
import { Alert, Banner, Button, ConfirmDialog, Dropdown, FormGroup, InputWithPrefix, Modal, PageHeader, PillBadge, RadioGroup, SectionItemCard, Toggle } from '../../_shared';
import { GlossaryTerm } from '../../modals/GlossaryModal';
import '../tabViews.shared.css';
import './SavingsManager.css';

interface SavingsManagerProps {
  shouldScrollToRetirement?: boolean;
  onScrollToRetirementComplete?: () => void;
  searchActionRequestKey?: number;
  searchActionType?:
    | 'add-contribution'
    | 'add-retirement'
    | 'edit-savings'
    | 'delete-savings'
    | 'toggle-savings'
    | 'edit-retirement'
    | 'delete-retirement'
    | 'toggle-retirement';
  searchActionTargetId?: string;
  displayMode?: ViewMode;
  viewModeControl?: React.ReactNode;
  onViewHistory?: (target: AuditHistoryTarget) => void;
}

type SavingsFieldErrors = {
  name?: string;
  amount?: string;
  accountId?: string;
};

type RetirementFieldErrors = {
  employeeAmount?: string;
  sourceAccountId?: string;
  yearlyLimit?: string;
  customLabel?: string;
};

const SavingsManager: React.FC<SavingsManagerProps> = ({
  shouldScrollToRetirement,
  onScrollToRetirementComplete,
  searchActionRequestKey,
  searchActionType,
  searchActionTargetId,
  displayMode = 'paycheck',
  viewModeControl,
  onViewHistory,
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
  const [savingsReallocationProtected, setSavingsReallocationProtected] = useState(false);
  const [savingsFieldErrors, setSavingsFieldErrors] = useState<SavingsFieldErrors>({});

  const [showAddRetirement, setShowAddRetirement] = useState(false);
  const [editingRetirement, setEditingRetirement] = useState<RetirementElection | null>(null);
  const [retirementReallocationProtected, setRetirementReallocationProtected] = useState(false);
  const [retirementType, setRetirementType] = useState<RetirementElection['type']>('401k');
  const [retirementCustomLabel, setRetirementCustomLabel] = useState('');
  const [employeeAmount, setEmployeeAmount] = useState('');
  const [employeeIsPercentage, setEmployeeIsPercentage] = useState(true);
  const [retirementSource, setRetirementSource] = useState<'paycheck' | 'account'>('paycheck');
  const [retirementSourceAccountId, setRetirementSourceAccountId] = useState('');
  const [retirementIsPreTax, setRetirementIsPreTax] = useState(true);
  const [yearlyLimit, setYearlyLimit] = useState('');
  const [retirementFieldErrors, setRetirementFieldErrors] = useState<RetirementFieldErrors>({});
  const [retirementFormMessage, setRetirementFormMessage] = useState<{ type: 'warning' | 'error'; message: string } | null>(null);

  const scrollCompletedRef = useRef(false);
  const lastHandledSearchActionKeyRef = useRef(0);

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

  useEffect(() => {
    if (!budgetData) {
      return;
    }

    if (!searchActionRequestKey || searchActionRequestKey === lastHandledSearchActionKeyRef.current) {
      return;
    }

    lastHandledSearchActionKeyRef.current = searchActionRequestKey;

    const timeoutId = window.setTimeout(() => {
      if (searchActionTargetId && searchActionType === 'toggle-savings') {
        const item = (budgetData.savingsContributions || []).find((entry) => entry.id === searchActionTargetId);
        if (item) {
          updateSavingsContribution(item.id, { enabled: item.enabled === false });
        }
        return;
      }

      if (searchActionTargetId && searchActionType === 'delete-savings') {
        const item = (budgetData.savingsContributions || []).find((entry) => entry.id === searchActionTargetId);
        if (item) {
          openConfirmDialog({
            title: 'Delete Contribution',
            message: 'Are you sure you want to delete this contribution?',
            confirmLabel: 'Delete Contribution',
            confirmVariant: 'danger',
            onConfirm: () => deleteSavingsContribution(item.id),
          });
        }
        return;
      }

      if (searchActionTargetId && searchActionType === 'edit-savings') {
        const item = (budgetData.savingsContributions || []).find((entry) => entry.id === searchActionTargetId);
        if (item) {
          setEditingSavings(item);
          setSavingsName(item.name);
          setSavingsAmount(String(item.amount));
          setSavingsFrequency(item.frequency);
          setSavingsType(item.type);
          setSavingsAccountId(item.accountId);
          setSavingsNotes(item.notes || '');
          setSavingsReallocationProtected(item.reallocationProtected === true);
          setSavingsFieldErrors({});
          setShowAddSavings(true);
        }
        return;
      }

      if (searchActionTargetId && searchActionType === 'toggle-retirement') {
        const item = (budgetData.retirement || []).find((entry) => entry.id === searchActionTargetId);
        if (item) {
          updateRetirementElection(item.id, { enabled: item.enabled === false });
        }
        return;
      }

      if (searchActionTargetId && searchActionType === 'delete-retirement') {
        const item = (budgetData.retirement || []).find((entry) => entry.id === searchActionTargetId);
        if (item) {
          openConfirmDialog({
            title: 'Delete Retirement Election',
            message: 'Are you sure you want to delete this retirement election?',
            confirmLabel: 'Delete Election',
            confirmVariant: 'danger',
            onConfirm: () => deleteRetirementElection(item.id),
          });
        }
        return;
      }

      if (searchActionTargetId && searchActionType === 'edit-retirement') {
        const election = (budgetData.retirement || []).find((entry) => entry.id === searchActionTargetId);
        if (election) {
          setEditingRetirement(election);
          setRetirementType(election.type);
          setRetirementCustomLabel(election.customLabel || '');
          setEmployeeAmount(election.employeeContribution.toString());
          setEmployeeIsPercentage(election.employeeContributionIsPercentage);
          setRetirementSource(election.deductionSource || 'paycheck');
          setRetirementSourceAccountId(election.sourceAccountId || '');
          setRetirementIsPreTax(election.isPreTax !== false);
          setYearlyLimit((election.yearlyLimit || '').toString());
          setRetirementReallocationProtected(election.reallocationProtected === true);
          setRetirementFieldErrors({});
          setRetirementFormMessage(null);
          setShowAddRetirement(true);
        }
        return;
      }

      if (searchActionType === 'add-retirement') {
        setEditingRetirement(null);
        setRetirementType('401k');
        setRetirementCustomLabel('');
        setEmployeeAmount('');
        setEmployeeIsPercentage(true);
        setRetirementSource('paycheck');
        setRetirementSourceAccountId('');
        setRetirementIsPreTax(true);
        setYearlyLimit('');
        setRetirementReallocationProtected(false);
        setRetirementFieldErrors({});
        setRetirementFormMessage(null);
        setShowAddRetirement(true);
        return;
      }

      setEditingSavings(null);
      setSavingsName('');
      setSavingsAmount('');
      setSavingsFrequency('monthly');
      setSavingsType('savings');
      setSavingsAccountId(budgetData.accounts[0]?.id || '');
      setSavingsNotes('');
      setSavingsReallocationProtected(false);
      setSavingsFieldErrors({});
      setShowAddSavings(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    budgetData,
    deleteRetirementElection,
    deleteSavingsContribution,
    openConfirmDialog,
    searchActionRequestKey,
    searchActionTargetId,
    searchActionType,
    updateRetirementElection,
    updateSavingsContribution,
  ]);

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

    return {
      employeeAmount: roundToCent(employeeAmountPerPaycheck),
      employerAmount: 0,
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

    return calculateRetirementContributions(b).employeeAmount - calculateRetirementContributions(a).employeeAmount;
  });

  const retirementTotalPerPaycheck = sortedRetirement.reduce((sum, election) => {
    if (election.enabled === false) return sum;

    const { employeeAmount: employeePerPaycheck } = calculateRetirementContributions(election);
    return sum + employeePerPaycheck;
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
    setSavingsReallocationProtected(false);
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
    setSavingsReallocationProtected(item.reallocationProtected === true);
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
      reallocationProtected: savingsReallocationProtected || undefined,
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
    const total = roundToCent(employeePerPaycheck * paychecksPerYear);
    const overage = roundToCent(Math.max(0, total - limit));
    return {
      exceeded: overage > 0,
      total,
      overage,
    };
  };

  const floorToDecimals = (value: number, decimals: number): number => {
    const factor = 10 ** decimals;
    return Math.floor(value * factor) / factor;
  };

  const handleAutoCalculateYearlyAmount = () => {
    if (!yearlyLimit || parseFloat(yearlyLimit) <= 0) {
      setRetirementFormMessage({ type: 'warning', message: 'Please enter a yearly limit first.' });
      return;
    }

    if (grossPayPerPaycheck <= 0 || paychecksPerYear <= 0) {
      setRetirementFormMessage({
        type: 'warning',
        message: 'Gross pay must be greater than zero before auto-calculating to yearly limit.',
      });
      return;
    }

    const yearlyLimitAmount = parseFloat(yearlyLimit);
    const employeePerPaycheck = yearlyLimitAmount / paychecksPerYear;

    if (employeeIsPercentage) {
      const annualGrossPay = grossPayPerPaycheck * paychecksPerYear;
      const maxSafePercent = floorToDecimals((yearlyLimitAmount / annualGrossPay) * 100, 2);
      setEmployeeAmount(maxSafePercent.toFixed(2));
    } else {
      const maxSafePerPaycheck = floorToDecimals(employeePerPaycheck, 2);
      setEmployeeAmount(maxSafePerPaycheck.toFixed(2));
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
    setYearlyLimit('');
    setRetirementReallocationProtected(false);
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
    setYearlyLimit((election.yearlyLimit || '').toString());
    setRetirementReallocationProtected(election.reallocationProtected === true);
    setRetirementFieldErrors({});
    setRetirementFormMessage(null);
    setShowAddRetirement(true);
  };

  const handleSaveRetirement = () => {
    const parsedEmployeeContribution = parseFloat(employeeAmount);
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
      hasEmployerMatch: false,
      employerMatchCap: 0,
      employerMatchCapIsPercentage: false,
      yearlyLimit: parsedYearlyLimit,
      reallocationProtected: retirementReallocationProtected || undefined,
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

  const handleOpenHistory = (
    target: { type: 'savings-contribution' | 'retirement-election'; id: string; name: string },
  ) => {
    if (!onViewHistory) return;

    onViewHistory({
      entityType: target.type,
      entityId: target.id,
      title: target.name,
    });
  };

  return (
    <div className="tab-view savings-manager">
      <PageHeader
        title="Savings & Retirement Plans"
        subtitle="Manage savings/investment transfers and retirement contributions"
        icon={<PiggyBank className="ui-icon" aria-hidden="true" />}
        actions={viewModeControl}
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
            <Button variant="primary" onClick={handleAddSavings}>
              <Plus className="ui-icon ui-icon-sm" aria-hidden="true" />
              Add Contribution
            </Button>
          </div>
        </div>

        {sortedSavings.length === 0 ? (
          <div className="empty-state empty-state--dashed empty-state--compact">
            <div className="empty-icon" aria-hidden="true">
              <PiggyBank className="ui-icon" />
            </div>
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
                  elementId={`savings-${item.id}`}
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
                      {item.reallocationProtected && (
                        <PillBadge variant="warning">Protected</PillBadge>
                      )}
                    </>
                  }
                  notes={item.notes}
                  isPaused={!isEnabled}
                  onPauseToggle={() => handleToggleSavingsEnabled(item)}
                  onEdit={() => handleEditSavings(item)}
                  onDelete={() => handleDeleteSavings(item.id)}
                  onHistory={() => handleOpenHistory({ type: 'savings-contribution', id: item.id, name: item.name })}
                />
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
            <Button variant="primary" onClick={handleAddRetirement}>
              <Plus className="ui-icon ui-icon-sm" aria-hidden="true" />
              Add Retirement Plan
            </Button>
          </div>
        </div>

        {sortedRetirement.length === 0 ? (
          <div className="empty-state empty-state--dashed empty-state--compact">
            <div className="empty-icon" aria-hidden="true">
              <ChartNoAxesCombined className="ui-icon" />
            </div>
            <h3>No Retirement Plans Yet</h3>
            <p>Add your retirement plans to get started</p>
          </div>
        ) : (
          <div className="retirement-list">
            {sortedRetirement.map((retirement) => {
              const { employeeAmount: employeePerPaycheck } = getRetirementContributionPreview(retirement);
              const totalPerPaycheck = employeePerPaycheck;
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
                  elementId={`retirement-${retirement.id}`}
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
                      {retirement.reallocationProtected && (
                        <PillBadge variant="warning">Protected</PillBadge>
                      )}
                    </>
                  }
                  isPaused={!isEnabled}
                  onPauseToggle={() => handleToggleRetirementEnabled(retirement)}
                  onEdit={() => handleEditRetirement(retirement)}
                  onDelete={() => handleDeleteRetirement(retirement.id)}
                  onHistory={() => handleOpenHistory({ type: 'retirement-election', id: retirement.id, name: displayLabel })}
                >
                  <div className="retirement-details">
                    <div className="detail">
                      <span className="label"><GlossaryTerm termId="retirement-contribution">Your Contribution</GlossaryTerm>:</span>
                      <span className="value">
                        {formatWithSymbol(employeePerPaycheck || 0, currency, { minimumFractionDigits: 2 })} per paycheck
                        {retirement.employeeContributionIsPercentage && ` (${retirement.employeeContribution}%)`}
                      </span>
                    </div>
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
            <Dropdown value={savingsFrequency} onChange={(e) => setSavingsFrequency(e.target.value as SavingsContribution['frequency'])}>
              <option value="weekly">Weekly</option>
              <option value="bi-weekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="semi-annual">Semi-annual</option>
              <option value="yearly">Yearly</option>
            </Dropdown>
          </FormGroup>
        </div>

        <div className="form-row">
          <FormGroup label="Category" required>
            <Dropdown value={savingsType} onChange={(e) => setSavingsType(e.target.value as SavingsContribution['type'])}>
              <option value="savings">Savings</option>
              <option value="investment">Investment</option>
            </Dropdown>
          </FormGroup>
          <FormGroup label="Paid from Account" required error={savingsFieldErrors.accountId}>
            <Dropdown
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
                  {account.name}
                </option>
              ))}
            </Dropdown>
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

        <Toggle
          checked={savingsReallocationProtected}
          onChange={setSavingsReallocationProtected}
          label="Protect from reallocation suggestions"
        />
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
          <Dropdown value={retirementType} onChange={(e) => setRetirementType(e.target.value as RetirementElection['type'])} required>
            {RETIREMENT_PLAN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Dropdown>
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
            <Dropdown
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
                  {account.name}
                </option>
              ))}
            </Dropdown>
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
              <Dropdown value={employeeIsPercentage ? 'percentage' : 'amount'} onChange={(e) => setEmployeeIsPercentage(e.target.value === 'percentage')}>
                <option value="amount">Fixed Amount</option>
                <option value="percentage">Percentage of Gross</option>
              </Dropdown>
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

        <Toggle
          checked={retirementReallocationProtected}
          onChange={setRetirementReallocationProtected}
          label="Protect from reallocation suggestions"
        />
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
