import React, { useCallback, useEffect, useRef, useState } from 'react';
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
    calculateOtherIncomeAutoWithholdingDetail,
    getOtherIncomeWithholdingProfiles,
    resolveOtherIncomeWithholdingProfile,
} from '../../../utils/otherIncomeWithholding';
import {
    OTHER_INCOME_AMOUNT_MODE_OPTIONS,
    OTHER_INCOME_PAY_TREATMENT_OPTIONS,
    OTHER_INCOME_TYPE_OPTIONS,
    OTHER_INCOME_WITHHOLDING_MODE_OPTIONS,
    getOtherIncomePayTreatmentLabel,
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
];

const PLANNING_INCOME_TYPE_OPTIONS = OTHER_INCOME_TYPE_OPTIONS.filter((option) => option.value !== 'bonus');

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
    const [incomeType, setIncomeType] = useState<OtherIncome['incomeType']>('personal-business');
    const [amountMode, setAmountMode] = useState<OtherIncome['amountMode']>('fixed');
    const [amount, setAmount] = useState('');
    const [percentOfGross, setPercentOfGross] = useState('');
    const [frequency, setFrequency] = useState<OtherIncome['frequency']>('monthly');
    const [payTreatment, setPayTreatment] = useState<OtherIncome['payTreatment']>('gross');
    const [withholdingMode, setWithholdingMode] = useState<OtherIncome['withholdingMode']>('manual');
    const [withholdingProfileId, setWithholdingProfileId] = useState('');
    const [notes, setNotes] = useState('');
    const lastHandledSearchActionKeyRef = useRef(0);

    const resetForm = useCallback(() => {
        setIncomeName('');
        setIncomeType('personal-business');
        setAmountMode('fixed');
        setAmount('');
        setPercentOfGross('');
        setFrequency('monthly');
        setPayTreatment('gross');
        setWithholdingMode('manual');
        setWithholdingProfileId('');
        setNotes('');
        incomeErrors.clearErrors();
    }, [incomeErrors]);

    const populateForm = useCallback((entry: OtherIncome) => {
        setIncomeName(entry.name);
        setIncomeType(entry.incomeType);
        setAmountMode(entry.amountMode);
        setAmount(entry.amount > 0 ? String(entry.amount) : '');
        setPercentOfGross(entry.percentOfGross != null && entry.percentOfGross > 0 ? String(entry.percentOfGross) : '');
        setFrequency(entry.frequency);
        setPayTreatment(entry.payTreatment);
        setWithholdingMode(entry.withholdingMode);
        setWithholdingProfileId(entry.withholdingProfileId || '');
        setNotes(entry.notes || '');
        incomeErrors.clearErrors();
    }, [incomeErrors]);

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
        populateForm,
        resetForm,
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

    const previewEntry: OtherIncome = {
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
        withholdingMode,
        withholdingProfileId: withholdingProfileId || undefined,
    };

    const previewAnnualAmount = calculateOtherIncomeAnnualAmount(previewEntry, grossPayPerPaycheck, paychecksPerYear);
    const previewMonthlyAmount = roundToCent(previewAnnualAmount / 12);
    const previewPerPaycheckAmount = roundToCent(
        calculateOtherIncomePerPaycheckAmount(previewEntry, grossPayPerPaycheck, paychecksPerYear),
    );
    const previewAutoWithholding = calculateOtherIncomeAutoWithholdingDetail(previewEntry, previewPerPaycheckAmount);
    const withholdingProfiles = getOtherIncomeWithholdingProfiles();
    const selectedWithholdingProfile = resolveOtherIncomeWithholdingProfile(previewEntry);

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
            } else if (numericPercent > 100) {
                nextErrors.percentOfGross = 'Percent of gross must be 100 or less';
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
            withholdingMode,
            withholdingProfileId: withholdingProfileId || undefined,
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
                subtitle="Track recurring income from side work, second jobs, and other ongoing sources"
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
                        <p>Add side business, second job, rental, or other ongoing income you expect paycheck to paycheck.</p>
                    </div>
                ) : (
                    <div className="other-income-list">
                        {sortedEntries.map((entry) => {
                            const annualAmount = calculateOtherIncomeAnnualAmount(entry, grossPayPerPaycheck, paychecksPerYear);
                            const monthlyAmount = roundToCent(annualAmount / 12);
                            const perPaycheckAmount = roundToCent(
                                calculateOtherIncomePerPaycheckAmount(entry, grossPayPerPaycheck, paychecksPerYear),
                            );
                            const displayAmount = roundToCent(annualAmount / displayModeOccurrencesPerYear);
                            const isEnabled = entry.enabled !== false;
                            const autoWithholdingDetail = calculateOtherIncomeAutoWithholdingDetail(entry, perPaycheckAmount);

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
                                    badges={<PillBadge variant="accent">{getOtherIncomeTypeLabel(entry.incomeType)}</PillBadge>}
                                    notes={entry.notes}
                                    isPaused={!isEnabled}
                                    onPauseToggle={() => handleToggleIncomeEnabled(entry)}
                                    onEdit={() => handleEditIncome(entry)}
                                    onHistory={() => handleOpenHistory({ id: entry.id, name: entry.name })}
                                    historyLabel="View History"
                                    onDelete={() => handleDeleteIncome(entry.id)}
                                >
                                    <div className="other-income-details">
                                        <div className="detail">
                                            <span className="label">Per Paycheck</span>
                                            <span className="value">{formatWithSymbol(perPaycheckAmount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="detail">
                                            <span className="label">Monthly Average</span>
                                            <span className="value">{formatWithSymbol(monthlyAmount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="detail">
                                            <span className="label">Annual Total</span>
                                            <span className="value">{formatWithSymbol(annualAmount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="detail">
                                            <span className="label">Treatment</span>
                                            <span className="value">{getOtherIncomePayTreatmentLabel(entry.payTreatment)}</span>
                                        </div>
                                        <div className="detail">
                                            <span className="label">Withholding Mode</span>
                                            <span className="value">{getOtherIncomeWithholdingModeLabel(entry.withholdingMode)}</span>
                                        </div>
                                        {autoWithholdingDetail && (
                                            <>
                                                <div className="detail">
                                                    <span className="label">Withholding Profile</span>
                                                    <span className="value">{autoWithholdingDetail.profileLabel} ({autoWithholdingDetail.rate}%)</span>
                                                </div>
                                                <div className="detail">
                                                    <span className="label">Auto Withholding</span>
                                                    <span className="value">{formatWithSymbol(autoWithholdingDetail.amount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </SectionItemCard>
                            );
                        })}
                    </div>
                )}
            </div>

            <Modal
                isOpen={incomeEditor.isOpen}
                onClose={closeModal}
                contentClassName="other-income-modal"
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
                <FormGroup
                    label="Income Name"
                    required
                    error={incomeErrors.errors.name}
                    helperText={incomeType === 'other' ? 'Tip: Use a specific name to customize this Other income label.' : undefined}
                >
                    <input
                        type="text"
                        value={incomeName}
                        onChange={(event) => {
                            setIncomeName(event.target.value);
                            incomeErrors.clearFieldError('name');
                        }}
                        className={incomeErrors.errors.name ? 'field-error' : ''}
                        placeholder="e.g., Rental Property, Freelance"
                        required
                    />
                </FormGroup>

                <div className="form-row">
                    <FormGroup label="Income Type" required>
                        <Dropdown value={incomeType} onChange={(event) => setIncomeType(event.target.value as OtherIncome['incomeType'])}>
                            {PLANNING_INCOME_TYPE_OPTIONS.map((option) => (
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
                    <FormGroup label="Amount Style" required>
                        <Dropdown value={amountMode} onChange={(event) => setAmountMode(event.target.value as OtherIncome['amountMode'])}>
                            {OTHER_INCOME_AMOUNT_MODE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </Dropdown>
                    </FormGroup>
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
                                max="100"
                                required
                            />
                        </FormGroup>
                    )}
                </div>

                <div className="form-row">
                    <FormGroup label="Frequency" required>
                        <Dropdown value={frequency} onChange={(event) => setFrequency(event.target.value as OtherIncome['frequency'])}>
                            {FREQUENCY_OPTIONS.map((option) => (
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

                {withholdingMode === 'auto' && payTreatment !== 'net' && (
                    <FormGroup
                        label="Withholding Profile"
                        helperText="Defaults by income type, but you can override the profile for this entry."
                    >
                        <Dropdown value={withholdingProfileId || selectedWithholdingProfile.id} onChange={(event) => setWithholdingProfileId(event.target.value)}>
                            {withholdingProfiles.map((profile) => (
                                <option key={profile.id} value={profile.id}>{profile.label} ({profile.rate}%)</option>
                            ))}
                        </Dropdown>
                    </FormGroup>
                )}

                <div className="other-income-preview-row">
                    <FormGroup label="Estimated Per Paycheck">
                        <InputWithPrefix
                            prefix={getCurrencySymbol(currency)}
                            type="text"
                            value={previewPerPaycheckAmount.toFixed(2)}
                            readOnly
                        />
                    </FormGroup>
                    <FormGroup label="Estimated Per Month">
                        <InputWithPrefix
                            prefix={getCurrencySymbol(currency)}
                            type="text"
                            value={previewMonthlyAmount.toFixed(2)}
                            readOnly
                        />
                    </FormGroup>
                    <FormGroup label="Estimated Per Year">
                        <InputWithPrefix
                            prefix={getCurrencySymbol(currency)}
                            type="text"
                            value={previewAnnualAmount.toFixed(2)}
                            readOnly
                        />
                    </FormGroup>
                </div>

                {withholdingMode === 'auto' && payTreatment !== 'net' && previewAutoWithholding && (
                    <div className="other-income-auto-withholding-preview">
                        <div className="other-income-auto-withholding-preview__header">Auto withholding preview</div>
                        <div className="other-income-auto-withholding-preview__row">
                            <span>Profile</span>
                            <span>{previewAutoWithholding.profileLabel} ({previewAutoWithholding.rate}%)</span>
                        </div>
                        <div className="other-income-auto-withholding-preview__row">
                            <span>Taxable base</span>
                            <span>{formatWithSymbol(previewAutoWithholding.taxableBase, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="other-income-auto-withholding-preview__row">
                            <span>Estimated withholding</span>
                            <span>{formatWithSymbol(previewAutoWithholding.amount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <p className="other-income-withholding-note">
                            This adds a separate withholding estimate and does not overwrite manual tax lines or manual additional withholding.
                        </p>
                    </div>
                )}

                {withholdingMode === 'auto' && payTreatment === 'net' && (
                    <p className="other-income-withholding-note">
                        Auto withholding does not apply to net-pay income. Switch to Gross or Taxable Only to use an automatic withholding profile.
                    </p>
                )}

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