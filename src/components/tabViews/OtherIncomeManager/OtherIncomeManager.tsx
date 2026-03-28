import React, { useEffect, useRef, useState } from 'react';
import { BanknoteArrowUp, Edit, HandCoins, Plus } from 'lucide-react';
import { useBudget } from '../../../contexts/BudgetContext';
import { useAppDialogs, useFieldErrors, useModalEntityEditor } from '../../../hooks';
import type { AuditHistoryTarget } from '../../../types/audit';
import type { OtherIncome } from '../../../types/payroll';
import type { ViewMode } from '../../../types/viewMode';
import { formatWithSymbol, getCurrencySymbol } from '../../../utils/currency';
import { roundToCent } from '../../../utils/money';
import { calculateOtherIncomeAnnualAmount, calculateOtherIncomePerPaycheckAmount } from '../../../utils/otherIncome';
import {
  OTHER_INCOME_AMOUNT_MODE_OPTIONS,
  OTHER_INCOME_PAY_TREATMENT_OPTIONS,
  OTHER_INCOME_TIMING_MODE_OPTIONS,
  OTHER_INCOME_TYPE_OPTIONS,
  OTHER_INCOME_WITHHOLDING_MODE_OPTIONS,
  getOtherIncomeAmountModeLabel,
  getOtherIncomePayTreatmentLabel,
  getOtherIncomeTimingModeLabel,
  getOtherIncomeTypeLabel,
  getOtherIncomeWithholdingModeLabel,
} from '../../../utils/otherIncomeLabels';
import {
  calculateGrossPayPerPaycheck,
  getDisplayModeLabel,
  getDisplayModeOccurrencesPerYear,
  getPaychecksPerYear,
} from '../../../utils/payPeriod';
import { Button, Banner, ConfirmDialog, Dropdown, FormGroup, InputWithPrefix, Modal, PageHeader, PillBadge, SectionItemCard } from '../../_shared';
import '../tabViews.shared.css';
import './OtherIncomeManager.css';

interface OtherIncomeManagerProps {
  searchActionRequestKey?: number;
  searchActionType?: 'add-other-income' | 'edit-other-income' | 'delete-other-income' | 'toggle-other-income';
  searchActionTargetId?: string;
  displayMode: ViewMode;
  viewModeControl?: React.ReactNode;
  onViewHistory?: (target: AuditHistoryTarget) => void;
}

type OtherIncomeFieldErrors = {
  name?: string;
  amount?: string;
  percentOfGross?: string;
};

const FREQUENCY_OPTIONS: Array<{ value: OtherIncome['frequency']; label: string }> = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-weekly' },
  { value: 'semi-monthly', label: 'Semi-monthly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const OtherIncomeManager: React.FC<OtherIncomeManagerProps> = ({
  searchActionRequestKey,
  searchActionType,
  searchActionTargetId,
  displayMode,
  viewModeControl,
  onViewHistory,
}) => {
  const { budgetData, addOtherIncome, updateOtherIncome, deleteOtherIncome } = useBudget();
  const { confirmDialog, openConfirmDialog, closeConfirmDialog, confirmCurrentDialog } = useAppDialogs();
  const incomeEditor = useModalEntityEditor<OtherIncome>();
  const incomeErrors = useFieldErrors<OtherIncomeFieldErrors>();

  const [incomeName, setIncomeName] = useState('');
  const [incomeType, setIncomeType] = useState<OtherIncome['incomeType']>('bonus');
  const [amountMode, setAmountMode] = useState<OtherIncome['amountMode']>('fixed');
  const [amount, setAmount] = useState('');
  const [percentOfGross, setPercentOfGross] = useState('');
  const [frequency, setFrequency] = useState<OtherIncome['frequency']>('monthly');
  const [payTreatment, setPayTreatment] = useState<OtherIncome['payTreatment']>('gross');
  const [timingMode, setTimingMode] = useState<NonNullable<OtherIncome['timingMode']>>('average');
  const [withholdingMode, setWithholdingMode] = useState<OtherIncome['withholdingMode']>('manual');
  const [notes, setNotes] = useState('');
  const lastHandledSearchActionKeyRef = useRef(0);

  useEffect(() => {
    if (!budgetData) {
      return;
    }

    if (!searchActionRequestKey || searchActionRequestKey === lastHandledSearchActionKeyRef.current) {
      return;
    }

    lastHandledSearchActionKeyRef.current = searchActionRequestKey;

    const timeoutId = window.setTimeout(() => {
      if (searchActionTargetId && searchActionType === 'toggle-other-income') {
        const entry = (budgetData.otherIncome || []).find((item) => item.id === searchActionTargetId);
        if (entry) {
          updateOtherIncome(entry.id, { enabled: entry.enabled === false });
        }
        return;
      }

      if (searchActionTargetId && searchActionType === 'delete-other-income') {
        const entry = (budgetData.otherIncome || []).find((item) => item.id === searchActionTargetId);
        if (entry) {
          openConfirmDialog({
            title: 'Delete Other Income',
            message: 'Are you sure you want to delete this other income entry?',
            confirmLabel: 'Delete Entry',
            confirmVariant: 'danger',
            onConfirm: () => deleteOtherIncome(entry.id),
          });
        }
        return;
      }

      if (searchActionTargetId && searchActionType === 'edit-other-income') {
        const entry = (budgetData.otherIncome || []).find((item) => item.id === searchActionTargetId);
        if (entry) {
          populateForm(entry);
          incomeEditor.openForEdit(entry);
        }
        return;
      }

      resetForm();
      incomeEditor.openForCreate();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    budgetData,
    deleteOtherIncome,
    incomeEditor,
    openConfirmDialog,
    searchActionRequestKey,
    searchActionTargetId,
    searchActionType,
    updateOtherIncome,
  ]);

  if (!budgetData) return null;

  const currency = budgetData.settings?.currency || 'USD';
  const paychecksPerYear = getPaychecksPerYear(budgetData.paySettings.payFrequency);
  const grossPayPerPaycheck = calculateGrossPayPerPaycheck(budgetData.paySettings);
  const displayModeOccurrencesPerYear = getDisplayModeOccurrencesPerYear(displayMode, paychecksPerYear);
  const otherIncomeEntries = budgetData.otherIncome ?? [];
  const totalAnnualAmount = otherIncomeEntries.reduce((sum, entry) => {
    return sum + calculateOtherIncomeAnnualAmount(entry, grossPayPerPaycheck, paychecksPerYear);
  }, 0);
  const totalDisplayAmount = roundToCent(totalAnnualAmount / displayModeOccurrencesPerYear);
  const sortedEntries = [...otherIncomeEntries].sort((left, right) => left.name.localeCompare(right.name));
  const editingIncome = incomeEditor.editingEntity;

  function resetForm() {
    setIncomeName('');
    setIncomeType('bonus');
    setAmountMode('fixed');
    setAmount('');
    setPercentOfGross('');
    setFrequency('monthly');
    setPayTreatment('gross');
    setTimingMode('average');
    setWithholdingMode('manual');
    setNotes('');
    incomeErrors.clearErrors();
  }

  function populateForm(entry: OtherIncome) {
    setIncomeName(entry.name);
    setIncomeType(entry.incomeType);
    setAmountMode(entry.amountMode);
    setAmount(entry.amount > 0 ? String(entry.amount) : '');
    setPercentOfGross(entry.percentOfGross != null && entry.percentOfGross > 0 ? String(entry.percentOfGross) : '');
    setFrequency(entry.frequency);
    setPayTreatment(entry.payTreatment);
    setTimingMode(entry.timingMode || 'average');
    setWithholdingMode(entry.withholdingMode);
    setNotes(entry.notes || '');
    incomeErrors.clearErrors();
  }

  const handleAddIncome = () => {
    resetForm();
    incomeEditor.openForCreate();
  };

  const handleEditIncome = (entry: OtherIncome) => {
    populateForm(entry);
    incomeEditor.openForEdit(entry);
  };

  const handleDeleteIncome = (id: string) => {
    openConfirmDialog({
      title: 'Delete Other Income',
      message: 'Are you sure you want to delete this other income entry?',
      confirmLabel: 'Delete Entry',
      confirmVariant: 'danger',
      onConfirm: () => deleteOtherIncome(id),
    });
  };

  const handleToggleIncomeEnabled = (entry: OtherIncome) => {
    updateOtherIncome(entry.id, { enabled: entry.enabled === false });
  };

  const closeModal = () => {
    incomeEditor.closeEditor();
    incomeErrors.clearErrors();
  };

  const validateForm = (): boolean => {
    const nextErrors: OtherIncomeFieldErrors = {};

    if (!incomeName.trim()) {
      nextErrors.name = 'Name is required';
    }

    if (amountMode === 'fixed') {
      const numericAmount = Number.parseFloat(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        nextErrors.amount = 'Enter an amount greater than 0';
      }
    } else {
      const numericPercent = Number.parseFloat(percentOfGross);
      if (!Number.isFinite(numericPercent) || numericPercent <= 0) {
        nextErrors.percentOfGross = 'Enter a percent greater than 0';
      }
    }

    incomeErrors.setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveIncome = () => {
    if (!validateForm()) {
      return;
    }

    const numericAmount = amountMode === 'fixed' ? Number.parseFloat(amount) : 0;
    const numericPercent = amountMode === 'percent-of-gross' ? Number.parseFloat(percentOfGross) : undefined;

    const payload: Omit<OtherIncome, 'id'> = {
      name: incomeName.trim(),
      incomeType,
      amountMode,
      amount: Number.isFinite(numericAmount) ? numericAmount : 0,
      percentOfGross: numericPercent,
      frequency,
      enabled: editingIncome?.enabled !== false,
      notes: notes.trim(),
      isTaxable: payTreatment !== 'net',
      payTreatment,
      timingMode,
      withholdingMode,
      withholdingProfileId: undefined,
      activeMonths: undefined,
    };

    if (editingIncome) {
      updateOtherIncome(editingIncome.id, payload);
    } else {
      addOtherIncome(payload);
    }

    closeModal();
  };

  const formatFrequencyLabel = (value: OtherIncome['frequency']): string => {
    return FREQUENCY_OPTIONS.find((option) => option.value === value)?.label ?? value;
  };

  const getTreatmentHelperText = (value: OtherIncome['payTreatment']): string => {
    if (value === 'gross') {
      return 'Adds this income to gross pay before tax calculations.';
    }
    if (value === 'taxable') {
      return 'Adds this income to taxable income without changing displayed gross pay.';
    }
    return 'Adds this income directly to net pay after deductions and taxes.';
  };

  const handleOpenHistory = (target: { id: string; name: string }) => {
    if (!onViewHistory) return;

    onViewHistory({
      entityType: 'other-income',
      entityId: target.id,
      title: target.name,
    });
  };

  return (
    <div className="tab-view other-income-manager">
      <PageHeader
        title="Other Income Sources"
        subtitle="Track bonuses, side income, reimbursements, and other pay additions"
        icon={<HandCoins className="ui-icon" aria-hidden="true" />}
        actions={viewModeControl}
      />

      <Banner
        label={`Total ${getDisplayModeLabel(displayMode)} Across All Other Income Sources`}
        value={formatWithSymbol(totalDisplayAmount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      />

      <div className="other-income-section">
        <div className="section-header">
          <div>
            <h2>Other Income Sources</h2>
            <p>Choose whether each item belongs in gross pay, taxable income only, or net pay.</p>
          </div>
          <div className="section-total">
            <div>
              <span className="section-total-label">Total {getDisplayModeLabel(displayMode)}</span>
              <span className="section-total-amount">
                {formatWithSymbol(totalDisplayAmount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <Button variant="primary" onClick={handleAddIncome}>
              <Plus className="ui-icon ui-icon-sm" aria-hidden="true" />
              Add Other Income
            </Button>
          </div>
        </div>

        {sortedEntries.length === 0 ? (
          <div className="empty-state empty-state--dashed empty-state--compact">
            <div className="empty-icon" aria-hidden="true">
              <HandCoins className="ui-icon" />
            </div>
            <h3>No Other Income Sources Yet</h3>
            <p>Add bonuses, personal business income, reimbursements, or any other recurring pay additions.</p>
          </div>
        ) : (
          <div className="other-income-list">
            {sortedEntries.map((entry) => {
              const annualAmount = calculateOtherIncomeAnnualAmount(entry, grossPayPerPaycheck, paychecksPerYear);
              const perPaycheckAmount = calculateOtherIncomePerPaycheckAmount(entry, grossPayPerPaycheck, paychecksPerYear);
              const displayAmount = roundToCent(annualAmount / displayModeOccurrencesPerYear);
              const isEnabled = entry.enabled !== false;

              return (
                <SectionItemCard
                  key={entry.id}
                  elementId={`other-income-${entry.id}`}
                  title={entry.name}
                  subtitle={entry.amountMode === 'percent-of-gross'
                    ? `${entry.percentOfGross || 0}% of base gross pay`
                    : `${formatFrequencyLabel(entry.frequency)}: ${formatWithSymbol(entry.amount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  amount={formatWithSymbol(displayAmount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  amountLabel={getDisplayModeLabel(displayMode)}
                  badges={
                    <>
                      <PillBadge variant="accent">{getOtherIncomeTypeLabel(entry.incomeType)}</PillBadge>
                      <PillBadge variant="info">{getOtherIncomePayTreatmentLabel(entry.payTreatment)}</PillBadge>
                      <PillBadge variant="neutral">{getOtherIncomeAmountModeLabel(entry.amountMode)}</PillBadge>
                      <PillBadge variant="outline">{entry.timingMode === 'payout' ? 'Payout-Timed' : 'Averaged'}</PillBadge>
                    </>
                  }
                  isPaused={!isEnabled}
                  onPauseToggle={() => handleToggleIncomeEnabled(entry)}
                  onEdit={() => handleEditIncome(entry)}
                  onHistory={() => handleOpenHistory({ id: entry.id, name: entry.name })}
                  historyLabel="View History"
                  onDelete={() => handleDeleteIncome(entry.id)}
                >
                  <div className="other-income-details">
                    <div className="detail">
                      <span className="label">Per paycheck</span>
                      <span className="value">{formatWithSymbol(perPaycheckAmount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="detail">
                      <span className="label">Placement</span>
                      <span className="value">{getOtherIncomePayTreatmentLabel(entry.payTreatment)}</span>
                    </div>
                    <div className="detail">
                      <span className="label">Timing</span>
                      <span className="value">{getOtherIncomeTimingModeLabel(entry.timingMode)}</span>
                    </div>
                    <div className="detail">
                      <span className="label">Withholding mode</span>
                      <span className="value">{getOtherIncomeWithholdingModeLabel(entry.withholdingMode)}</span>
                    </div>
                  </div>
                  {(entry.timingMode || 'average') === 'payout' && (
                    <div className="other-income-v1-note">
                      V1 behavior: payout-timed entries are excluded from averaged paycheck calculations.
                    </div>
                  )}
                  {entry.notes && <div className="other-income-notes">{entry.notes}</div>}
                </SectionItemCard>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={incomeEditor.isOpen}
        onClose={closeModal}
        header={editingIncome ? 'Edit Other Income' : 'Add Other Income'}
        headerIcon={editingIncome ? <Edit className="ui-icon" aria-hidden="true" /> : <BanknoteArrowUp className="ui-icon" aria-hidden="true" />}
        footer={(
          <>
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" onClick={handleSaveIncome}>
              {editingIncome ? 'Update Entry' : 'Add Entry'}
            </Button>
          </>
        )}
      >
        <FormGroup label="Income Name" required error={incomeErrors.errors.name}>
          <input
            type="text"
            value={incomeName}
            onChange={(event) => {
              setIncomeName(event.target.value);
              incomeErrors.clearFieldError('name');
            }}
            className={incomeErrors.errors.name ? 'field-error' : ''}
            placeholder="e.g., Annual Bonus, Etsy Shop"
            required
          />
        </FormGroup>

        <div className="form-row">
          <FormGroup label="Income Type" required>
            <Dropdown value={incomeType} onChange={(event) => setIncomeType(event.target.value as OtherIncome['incomeType'])}>
              {OTHER_INCOME_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Dropdown>
          </FormGroup>
          <FormGroup label="Placement" required>
            <Dropdown value={payTreatment} onChange={(event) => setPayTreatment(event.target.value as OtherIncome['payTreatment'])}>
              {OTHER_INCOME_PAY_TREATMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Dropdown>
          </FormGroup>
        </div>

        <p className="other-income-treatment-note">{getTreatmentHelperText(payTreatment)}</p>

        <div className="form-row">
          <FormGroup label="Timing Mode" required>
            <Dropdown value={timingMode} onChange={(event) => setTimingMode(event.target.value as NonNullable<OtherIncome['timingMode']>)}>
              {OTHER_INCOME_TIMING_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Dropdown>
          </FormGroup>
          <FormGroup label="Withholding Mode" required>
            <Dropdown value={withholdingMode} onChange={(event) => setWithholdingMode(event.target.value as OtherIncome['withholdingMode'])}>
              {OTHER_INCOME_WITHHOLDING_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Dropdown>
          </FormGroup>
        </div>

        <p className="other-income-withholding-note">
          V1 timing behavior: payout-timed entries are saved but excluded from averaged paycheck forecasts until v2 cashflow timing is added.
        </p>

        <div className="form-row">
          <FormGroup label="Amount Style" required>
            <Dropdown value={amountMode} onChange={(event) => setAmountMode(event.target.value as OtherIncome['amountMode'])}>
              {OTHER_INCOME_AMOUNT_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Dropdown>
          </FormGroup>
          <FormGroup label="Frequency" required>
            <Dropdown value={frequency} onChange={(event) => setFrequency(event.target.value as OtherIncome['frequency'])}>
              {FREQUENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Dropdown>
          </FormGroup>
        </div>

        {amountMode === 'fixed' ? (
          <FormGroup label="Amount" required error={incomeErrors.errors.amount}>
            <InputWithPrefix
              prefix={getCurrencySymbol(currency)}
              type="number"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                incomeErrors.clearFieldError('amount');
              }}
              className={incomeErrors.errors.amount ? 'field-error' : ''}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
            />
          </FormGroup>
        ) : (
          <FormGroup label="Percent of Gross Pay" required error={incomeErrors.errors.percentOfGross}>
            <InputWithPrefix
              suffix="%"
              type="number"
              value={percentOfGross}
              onChange={(event) => {
                setPercentOfGross(event.target.value);
                incomeErrors.clearFieldError('percentOfGross');
              }}
              className={incomeErrors.errors.percentOfGross ? 'field-error' : ''}
              placeholder="0"
              step="0.01"
              min="0"
              required
            />
          </FormGroup>
        )}

        <div className="form-row">
          <FormGroup label="Estimated Income Per Paycheck">
            <InputWithPrefix
              prefix={getCurrencySymbol(currency)}
              type="text"
              value={calculateOtherIncomePerPaycheckAmount(
                {
                  id: editingIncome?.id || 'preview',
                  name: incomeName || 'Preview',
                  incomeType,
                  amountMode,
                  amount: amountMode === 'fixed' ? Number.parseFloat(amount || '0') || 0 : 0,
                  percentOfGross: amountMode === 'percent-of-gross' ? Number.parseFloat(percentOfGross || '0') || 0 : undefined,
                  frequency,
                  enabled: true,
                  notes,
                  isTaxable: payTreatment !== 'net',
                  payTreatment,
                  timingMode,
                  withholdingMode,
                },
                grossPayPerPaycheck,
                paychecksPerYear,
              ).toFixed(2)}
              readOnly
            />
          </FormGroup>
        </div>

        <p className="other-income-withholding-note">
          Withholding mode is saved with this entry for future withholding workflows and does not currently change paycheck calculations.
        </p>

        <FormGroup label="Notes">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional notes"
            rows={2}
          />
        </FormGroup>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDialog}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        confirmLabel={confirmDialog?.confirmLabel}
        confirmVariant={confirmDialog?.confirmVariant}
        onConfirm={confirmCurrentDialog}
        onClose={closeConfirmDialog}
      />
    </div>
  );
};

export default OtherIncomeManager;