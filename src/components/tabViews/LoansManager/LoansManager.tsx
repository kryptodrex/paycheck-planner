import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Landmark, Plus, X } from 'lucide-react';
import { useBudget } from '../../../contexts/BudgetContext';
import { useAppDialogs, useFieldErrors, useModalEntityEditor } from '../../../hooks';
import type { AuditHistoryTarget } from '../../../types/audit';
import type { Loan, LoanPaymentLine } from '../../../types/obligations';
import type { LoanPaymentFrequency } from '../../../types/frequencies';
import type { ViewMode } from '../../../types/viewMode';
import type { LoanFieldErrors } from '../../../types/fieldErrors';
import { LOAN_PAYMENT_FREQUENCY_OPTIONS } from '../../../constants/frequencies';
import { LOAN_TYPE_METADATA } from '../../../constants/loanTypes';
import { formatWithSymbol, getCurrencySymbol } from '../../../utils/currency';
import { getPaychecksPerYear, getDisplayModeLabel } from '../../../utils/payPeriod';
import { getDefaultAccountIcon, getIconComponent } from '../../../utils/accountDefaults';
import { buildAccountRows, groupByAccountId } from '../../../utils/accountGrouping';
import { convertBillToMonthly, formatBillFrequency } from '../../../utils/billFrequency';
import { monthlyToDisplayAmount } from '../../../utils/displayAmounts';
import { Banner, Modal, Button, ConfirmDialog, Dropdown, FormGroup, InputWithPrefix, PageHeader, PillBadge, SectionItemCard, AmountBreakdown } from '../../_shared';
import '../tabViews.shared.css';
import './LoansManager.css';

interface LoansManagerProps {
    scrollToAccountId?: string;
    searchActionRequestKey?: number;
    searchActionType?: 'add-loan' | 'edit-loan' | 'delete-loan' | 'toggle-loan';
    searchActionTargetId?: string;
    displayMode: ViewMode;
    viewModeControl?: React.ReactNode;
    onViewHistory?: (target: AuditHistoryTarget) => void;
}

type EditableLoanPaymentLine = {
    id: string;
    label: string;
    amount: string;
    error?: string;
};

const LOAN_TYPE_DEFAULT_LINES: Record<Loan['type'], Array<{ label: string }>> = {
    mortgage: [
        { label: 'Principal & Interest' },
        { label: 'Home Insurance' },
        { label: 'Mortgage Insurance' },
        { label: 'Property Tax' },
    ],
    auto: [
        { label: 'Principal & Interest' },
        { label: 'Car Insurance' },
    ],
    student: [{ label: 'Principal & Interest' }],
    personal: [{ label: 'Principal & Interest' }],
    'credit-card': [{ label: 'Card Payment' }],
    other: [{ label: 'Loan Payment' }],
};

const roundToCent = (value: number): number => Math.round(value * 100) / 100;

const convertMonthlyPaymentToFrequency = (monthlyAmount: number, frequency: LoanPaymentFrequency): number => {
    switch (frequency) {
        case 'weekly':
            return roundToCent((monthlyAmount * 12) / 52);
        case 'bi-weekly':
            return roundToCent((monthlyAmount * 12) / 26);
        case 'quarterly':
            return roundToCent((monthlyAmount * 12) / 4);
        case 'semi-annual':
            return roundToCent((monthlyAmount * 12) / 2);
        case 'yearly':
            return roundToCent(monthlyAmount * 12);
        case 'monthly':
        default:
            return roundToCent(monthlyAmount);
    }
};

const createDefaultPaymentLines = (loanType: Loan['type']): EditableLoanPaymentLine[] =>
    LOAN_TYPE_DEFAULT_LINES[loanType].map((line) => ({
        id: crypto.randomUUID(),
        label: line.label,
        amount: '',
    }));

const mapLoanPaymentLinesToEditable = (paymentBreakdown: LoanPaymentLine[]): EditableLoanPaymentLine[] =>
    paymentBreakdown.map((line) => ({
        id: line.id,
        label: line.label,
        amount: String(line.amount),
    }));

const LoansManager: React.FC<LoansManagerProps> = ({
    scrollToAccountId,
    searchActionRequestKey,
    searchActionType,
    searchActionTargetId,
    displayMode,
    viewModeControl,
    onViewHistory,
}) => {
    const { budgetData, addLoan, updateLoan, deleteLoan } = useBudget();
    const { confirmDialog, openConfirmDialog, closeConfirmDialog, confirmCurrentDialog } = useAppDialogs();
    const loanEditor = useModalEntityEditor<Loan>();
    const [loanName, setLoanName] = useState('');
    const [loanType, setLoanType] = useState<Loan['type']>('personal');
    const [loanPaymentFrequency, setLoanPaymentFrequency] = useState<LoanPaymentFrequency>('monthly');
    const [loanAccountId, setLoanAccountId] = useState('');
    const [loanNotes, setLoanNotes] = useState('');
    const [loanPaymentLines, setLoanPaymentLines] = useState<EditableLoanPaymentLine[]>(createDefaultPaymentLines('personal'));
    const loanErrors = useFieldErrors<LoanFieldErrors>();
    const lastHandledSearchActionKeyRef = useRef(0);

    useEffect(() => {
        if (scrollToAccountId) {
            const element = document.getElementById(`account-${scrollToAccountId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }, [scrollToAccountId]);

    const currency = budgetData?.settings?.currency || 'USD';
    const isLoanEnabled = (loan: Loan) => loan.enabled !== false;
    const editingLoan = loanEditor.editingEntity;
    const loanFieldErrors = loanErrors.errors;

    const parsedPaymentLinesSummary = useMemo(() => {
        const validLines = loanPaymentLines
            .map((line) => {
                const amount = parseFloat(line.amount);
                if (!line.label.trim() || !Number.isFinite(amount) || amount <= 0) return null;
                return { ...line, parsedAmount: amount };
            })
            .filter((line): line is EditableLoanPaymentLine & { parsedAmount: number } => line !== null);

        const monthlyTotal = validLines.reduce((sum, line) => {
            return sum + convertBillToMonthly(line.parsedAmount, loanPaymentFrequency);
        }, 0);

        return {
            validLines,
            monthlyTotal: roundToCent(monthlyTotal),
        };
    }, [loanPaymentLines, loanPaymentFrequency]);

    const resetForm = () => {
        setLoanName('');
        setLoanType('personal');
        setLoanPaymentFrequency('monthly');
        setLoanAccountId(budgetData?.accounts[0]?.id || '');
        setLoanNotes('');
        setLoanPaymentLines(createDefaultPaymentLines('personal'));
        loanErrors.clearErrors();
    };

    const closeLoanModal = () => {
        loanEditor.closeEditor();
        resetForm();
    };

    useEffect(() => {
        if (!budgetData) {
            return;
        }

        if (!searchActionRequestKey || searchActionRequestKey === lastHandledSearchActionKeyRef.current) {
            return;
        }

        lastHandledSearchActionKeyRef.current = searchActionRequestKey;

        const timeoutId = window.setTimeout(() => {
            if (searchActionTargetId && searchActionType === 'toggle-loan') {
                const loan = (budgetData.loans || []).find((item) => item.id === searchActionTargetId);
                if (loan) {
                    updateLoan(loan.id, { enabled: loan.enabled === false });
                }
                return;
            }

            if (searchActionTargetId && searchActionType === 'delete-loan') {
                const loan = (budgetData.loans || []).find((item) => item.id === searchActionTargetId);
                if (loan) {
                    openConfirmDialog({
                        title: 'Delete Loan Payment',
                        message: 'Are you sure you want to delete this loan payment?',
                        confirmLabel: 'Delete Loan',
                        confirmVariant: 'danger',
                        onConfirm: () => deleteLoan(loan.id),
                    });
                }
                return;
            }

            if (searchActionTargetId && searchActionType === 'edit-loan') {
                const loan = (budgetData.loans || []).find((item) => item.id === searchActionTargetId);
                if (loan) {
                    setLoanName(loan.name);
                    setLoanType(loan.type);
                    setLoanPaymentFrequency((loan.paymentFrequency ?? 'monthly') as LoanPaymentFrequency);
                    setLoanAccountId(loan.accountId);
                    setLoanNotes(loan.notes || '');

                    if (loan.paymentBreakdown && loan.paymentBreakdown.length > 0) {
                        setLoanPaymentLines(mapLoanPaymentLinesToEditable(loan.paymentBreakdown));
                    } else {
                        const fallbackFrequency = (loan.paymentFrequency ?? 'monthly') as LoanPaymentFrequency;
                        setLoanPaymentLines([
                            {
                                id: crypto.randomUUID(),
                                label: 'Payment',
                                amount: String(convertMonthlyPaymentToFrequency(loan.monthlyPayment, fallbackFrequency)),
                            },
                        ]);
                    }

                    loanErrors.clearErrors();
                    loanEditor.openForEdit(loan);
                }
                return;
            }

            setLoanName('');
            setLoanType('personal');
            setLoanPaymentFrequency('monthly');
            setLoanAccountId(budgetData.accounts[0]?.id || '');
            setLoanNotes('');
            setLoanPaymentLines(createDefaultPaymentLines('personal'));
            loanErrors.clearErrors();
            loanEditor.openForCreate();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [
        budgetData,
        deleteLoan,
        loanEditor,
        loanErrors,
        openConfirmDialog,
        searchActionRequestKey,
        searchActionTargetId,
        searchActionType,
        updateLoan,
    ]);

    if (!budgetData) return null;

    const handleAddLoan = () => {
        resetForm();
        loanEditor.openForCreate();
    };

    const handleEditLoan = (loan: Loan) => {
        setLoanName(loan.name);
        setLoanType(loan.type);
        setLoanPaymentFrequency((loan.paymentFrequency ?? 'monthly') as LoanPaymentFrequency);
        setLoanAccountId(loan.accountId);
        setLoanNotes(loan.notes || '');

        if (loan.paymentBreakdown && loan.paymentBreakdown.length > 0) {
            setLoanPaymentLines(mapLoanPaymentLinesToEditable(loan.paymentBreakdown));
        } else {
            const fallbackFrequency = (loan.paymentFrequency ?? 'monthly') as LoanPaymentFrequency;
            setLoanPaymentLines([
                {
                    id: crypto.randomUUID(),
                    label: 'Payment',
                    amount: String(convertMonthlyPaymentToFrequency(loan.monthlyPayment, fallbackFrequency)),
                },
            ]);
        }

        loanErrors.clearErrors();
        loanEditor.openForEdit(loan);
    };

    const handlePaymentLineChange = (
        id: string,
        field: 'label' | 'amount',
        value: string
    ) => {
        setLoanPaymentLines((prev) =>
            prev.map((line) => {
                if (line.id !== id) return line;
                return { ...line, [field]: value, error: undefined };
            })
        );

        loanErrors.clearFieldError('paymentLines');
    };

    const handleAddPaymentLine = () => {
        setLoanPaymentLines((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                label: '',
                amount: '',
            },
        ]);
    };

    const handleRemovePaymentLine = (id: string) => {
        setLoanPaymentLines((prev) => prev.filter((line) => line.id !== id));
    };

    const handleApplyTypeDefaults = () => {
        setLoanPaymentLines(createDefaultPaymentLines(loanType));
        loanErrors.clearFieldError('paymentLines');
    };

    const handleSaveLoan = () => {
        const trimmedLoanName = loanName.trim();
        const errors: LoanFieldErrors = {};

        if (!trimmedLoanName) {
            errors.name = 'Loan payment name is required.';
        }

        if (!loanAccountId) {
            errors.accountId = 'Please select an account.';
        }

        let hasLineErrors = false;
        const validatedLines = loanPaymentLines.map((line) => {
            const parsedAmount = parseFloat(line.amount);
            if (!line.label.trim()) {
                hasLineErrors = true;
                return { ...line, error: 'Label is required.' };
            }
            if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
                hasLineErrors = true;
                return { ...line, error: 'Amount must be zero or greater.' };
            }
            return { ...line, error: undefined };
        });

        const normalizedPaymentBreakdown: LoanPaymentLine[] = validatedLines
            .map((line) => ({
                id: line.id,
                label: line.label.trim(),
                amount: parseFloat(line.amount),
                frequency: loanPaymentFrequency,
            }))
            .filter((line) => line.label.length > 0 && Number.isFinite(line.amount) && line.amount > 0);

        const normalizedMonthlyPayment = roundToCent(
            normalizedPaymentBreakdown.reduce((sum, line) => {
                return sum + convertBillToMonthly(line.amount, loanPaymentFrequency);
            }, 0)
        );

        if (hasLineErrors) {
            errors.paymentLines = 'Please fix payment line errors before saving.';
            setLoanPaymentLines(validatedLines);
        }

        if (normalizedPaymentBreakdown.length === 0 || normalizedMonthlyPayment <= 0) {
            errors.paymentLines = 'Add at least one payment line with an amount greater than zero.';
        }

        if (Object.keys(errors).length > 0) {
            loanErrors.setErrors(errors);
            return;
        }

        const fallbackFrequency = loanPaymentFrequency;

        if (editingLoan) {
            updateLoan(editingLoan.id, {
                name: trimmedLoanName,
                type: loanType,
                monthlyPayment: normalizedMonthlyPayment,
                paymentFrequency: fallbackFrequency,
                paymentBreakdown: normalizedPaymentBreakdown,
                accountId: loanAccountId,
                enabled: editingLoan.enabled !== false,
                notes: loanNotes.trim() || undefined,
                principal: 0,
                currentBalance: 0,
                interestRate: 0,
                propertyTaxRate: undefined,
                propertyValue: undefined,
                termMonths: undefined,
                insurancePayment: undefined,
                insuranceEndBalance: undefined,
                insuranceEndBalancePercent: undefined,
            });
        } else {
            addLoan({
                name: trimmedLoanName,
                type: loanType,
                principal: 0,
                currentBalance: 0,
                interestRate: 0,
                propertyTaxRate: undefined,
                propertyValue: undefined,
                monthlyPayment: normalizedMonthlyPayment,
                paymentFrequency: fallbackFrequency,
                paymentBreakdown: normalizedPaymentBreakdown,
                accountId: loanAccountId,
                startDate: new Date().toISOString(),
                termMonths: undefined,
                insurancePayment: undefined,
                insuranceEndBalance: undefined,
                insuranceEndBalancePercent: undefined,
                enabled: true,
                notes: loanNotes.trim() || undefined,
            });
        }

        closeLoanModal();
    };

    const handleDeleteLoan = (id: string) => {
        openConfirmDialog({
            title: 'Delete Loan Payment',
            message: 'Are you sure you want to delete this loan payment?',
            confirmLabel: 'Delete Loan',
            confirmVariant: 'danger',
            onConfirm: () => deleteLoan(id),
        });
    };

    const handleToggleLoanEnabled = (loan: Loan) => {
        updateLoan(loan.id, { enabled: !isLoanEnabled(loan) });
    };

    const handleOpenHistory = (loan: Loan) => {
        if (!onViewHistory) return;

        onViewHistory({
            entityType: 'loan',
            entityId: loan.id,
            title: loan.name,
        });
    };

    const loansList = budgetData.loans ?? [];
    const loansByAccount = groupByAccountId(loansList);

    const paychecksPerYear = getPaychecksPerYear(budgetData.paySettings.payFrequency);
    const displayAmount = (monthlyAmount: number): number => monthlyToDisplayAmount(monthlyAmount, paychecksPerYear, displayMode);
    const allAccountsLoansTotalMonthly = roundToCent(
        loansList.reduce((sum, loan) => {
            if (!isLoanEnabled(loan)) {
                return sum;
            }
            return sum + loan.monthlyPayment;
        }, 0),
    );

    return (
        <div className="tab-view loans-manager">
            <PageHeader
                title="Loan Payments"
                subtitle="Track recurring mortgage, auto, student, and other loan payments"
                icon={<Landmark className="ui-icon" aria-hidden="true" />}
                actions={
                    <>
                        {viewModeControl}
                        <Button variant="primary" onClick={handleAddLoan}>
                            <Plus className="ui-icon ui-icon-sm" aria-hidden="true" />
                            Add Loan Payment
                        </Button>
                    </>
                }
            />

            <Banner
                label={`Total ${getDisplayModeLabel(displayMode)} Across All Accounts`}
                value={formatWithSymbol(displayAmount(allAccountsLoansTotalMonthly), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            />

            <div className="loans-content">
                {budgetData.accounts.length === 0 ? (
                    <div className="empty-state empty-state--dashed">
                        <div className="empty-icon" aria-hidden="true">
                            <Building2 className="ui-icon" />
                        </div>
                        <h3>No Accounts Set Up</h3>
                        <p>Accounts are created during setup. Add an account before assigning loan payments.</p>
                    </div>
                ) : loansList.length === 0 ? (
                    <div className="empty-state empty-state--dashed">
                        <div className="empty-icon" aria-hidden="true">
                            <Landmark className="ui-icon" />
                        </div>
                        <h3>No Loan Payments Added Yet</h3>
                        <p>Add your first recurring loan payment to track it across the app.</p>
                        <Button variant="primary" onClick={handleAddLoan}>
                            <Plus className="ui-icon ui-icon-sm" aria-hidden="true" />
                            Add First Loan Payment
                        </Button>
                    </div>
                ) : (
                    <>
                        {buildAccountRows(budgetData.accounts, loansByAccount, (accountLoans) => {
                            return roundToCent(
                                accountLoans.reduce((sum, loan) => {
                                    if (!isLoanEnabled(loan)) {
                                        return sum;
                                    }
                                    return sum + loan.monthlyPayment;
                                }, 0)
                            );
                        }).map(({ account, items: accountLoans, totalMonthly }) => (
                            <section key={account.id} className="account-section" id={`account-${account.id}`}>
                                <div className="account-header">
                                    <div className="account-info">
                                        <span className="account-icon">
                                            {(() => {
                                                const iconName = account.icon || getDefaultAccountIcon(account.type);
                                                const IconComponent = getIconComponent(iconName);
                                                return IconComponent ? <IconComponent className="ui-icon" /> : iconName;
                                            })()}
                                        </span>
                                        <h3>{account.name}</h3>
                                    </div>
                                    <div className="account-total">
                                        <span className="total-label">Total {getDisplayModeLabel(displayMode)}:</span>
                                        <span className="total-amount">
                                            {formatWithSymbol(displayAmount(totalMonthly), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>

                                <div className="loans-list">
                                    {accountLoans
                                        .sort((a, b) => {
                                            const aEnabled = isLoanEnabled(a);
                                            const bEnabled = isLoanEnabled(b);
                                            if (aEnabled !== bEnabled) {
                                                return aEnabled ? -1 : 1;
                                            }
                                            return b.monthlyPayment - a.monthlyPayment;
                                        })
                                        .map((loan) => {
                                            const lineItems = loan.paymentBreakdown || [];

                                            return (
                                                <SectionItemCard
                                                    key={loan.id}
                                                    elementId={`loan-${loan.id}`}
                                                    title={loan.name}
                                                    subtitle={`Paid ${formatBillFrequency((loan.paymentFrequency ?? 'monthly') as LoanPaymentFrequency)}: ${formatWithSymbol(convertMonthlyPaymentToFrequency(loan.monthlyPayment, (loan.paymentFrequency ?? 'monthly') as LoanPaymentFrequency), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                                    amount={formatWithSymbol(displayAmount(loan.monthlyPayment), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    amountLabel={getDisplayModeLabel(displayMode)}
                                                    notes={loan.notes}
                                                    badges={
                                                        <PillBadge variant="outline">
                                                            {LOAN_TYPE_METADATA.find((type) => type.value === loan.type)?.label ?? 'Loan'}
                                                        </PillBadge>
                                                    }
                                                    isPaused={!isLoanEnabled(loan)}
                                                    onPauseToggle={() => handleToggleLoanEnabled(loan)}
                                                    onEdit={() => handleEditLoan(loan)}
                                                    onDelete={() => handleDeleteLoan(loan.id)}
                                                    onHistory={() => handleOpenHistory(loan)}
                                                >
                                                    {lineItems.length > 0 && (
                                                        <AmountBreakdown
                                                            items={lineItems
                                                                .sort((a, b) => b.amount - a.amount)
                                                                .map((item) => ({
                                                                    id: item.id,
                                                                    label: item.label,
                                                                    amount: displayAmount(convertBillToMonthly(item.amount, item.frequency))
                                                                }))
                                                            }
                                                            formatAmount={(amount) => formatWithSymbol(amount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            className="deduction-breakdown"
                                                        />
                                                    )}
                                                </SectionItemCard>
                                            );
                                        })}
                                </div>
                            </section>
                        ))}
                    </>
                )}
            </div>

            <Modal
                isOpen={loanEditor.isOpen}
                onClose={closeLoanModal}
                contentClassName="loan-payment-modal"
                header={editingLoan ? 'Edit Loan Payment' : 'Add Loan Payment'}
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={closeLoanModal}
                        >
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={handleSaveLoan}>
                            {editingLoan ? 'Save Changes' : 'Add Loan Payment'}
                        </Button>
                    </>
                }
            >
                <div className="loan-setup-grid">
                    <FormGroup label="Loan Payment Name" required error={loanFieldErrors.name}>
                        <input
                            type="text"
                            value={loanName}
                            onChange={(event) => {
                                setLoanName(event.target.value);
                                loanErrors.clearFieldError('name');
                            }}
                            placeholder="e.g., Home Mortgage, Car Loan"
                            className={loanFieldErrors.name ? 'field-error' : ''}
                        />
                    </FormGroup>

                    <FormGroup label="Loan Type" required>
                        <Dropdown
                            value={loanType}
                            onChange={(event) => {
                                const nextType = event.target.value as Loan['type'];
                                setLoanType(nextType);
                                if (!editingLoan) {
                                    setLoanPaymentLines(createDefaultPaymentLines(nextType));
                                }
                            }}
                        >
                            {LOAN_TYPE_METADATA.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </Dropdown>
                    </FormGroup>
                </div>

                <div className="loan-setup-grid">
                    <FormGroup label="Paid from Account" required error={loanFieldErrors.accountId}>
                        <Dropdown
                            value={loanAccountId}
                            onChange={(event) => {
                                setLoanAccountId(event.target.value);
                                loanErrors.clearFieldError('accountId');
                            }}
                            className={loanFieldErrors.accountId ? 'field-error' : ''}
                        >
                            {budgetData.accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                    {account.name}
                                </option>
                            ))}
                        </Dropdown>
                    </FormGroup>

                    <FormGroup label="Payment Frequency" required>
                        <Dropdown
                            value={loanPaymentFrequency}
                            onChange={(event) => setLoanPaymentFrequency(event.target.value as LoanPaymentFrequency)}
                        >
                            {LOAN_PAYMENT_FREQUENCY_OPTIONS.map((frequency) => (
                                <option key={frequency.value} value={frequency.value}>
                                    {frequency.label}
                                </option>
                            ))}
                        </Dropdown>
                    </FormGroup>
                </div>

                <FormGroup
                    label="Payment Components"
                    required
                    helperText="Add all items included in this loan payment. We total these for your final loan amount."
                    error={loanFieldErrors.paymentLines}
                >
                    <div className="loan-lines-editor">
                        <div className="loan-lines-header">
                            <span className="col-label">Name</span>
                            <span className="col-amount">Amount</span>
                            <span className="col-actions" />
                        </div>

                        {loanPaymentLines.map((line) => (
                            <div key={line.id} className="loan-line-row">
                                <div className="loan-line-fields">
                                    <input
                                        type="text"
                                        value={line.label}
                                        placeholder="e.g., Principal & Interest"
                                        onChange={(event) => handlePaymentLineChange(line.id, 'label', event.target.value)}
                                        className={line.error === 'Label is required.' ? 'field-error' : ''}
                                    />
                                    <InputWithPrefix
                                        prefix={getCurrencySymbol(currency)}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={line.amount}
                                        onChange={(event) => handlePaymentLineChange(line.id, 'amount', event.target.value)}
                                        className={line.error && line.error !== 'Label is required.' ? 'field-error' : ''}
                                    />
                                    <Button
                                        variant="remove"
                                        size="xsmall"
                                        type="button"
                                        title="Remove payment line"
                                        onClick={() => handleRemovePaymentLine(line.id)}
                                        disabled={loanPaymentLines.length <= 1}
                                    >
                                        <X className="ui-icon ui-icon-sm" aria-hidden="true" />
                                    </Button>
                                </div>
                                {line.error && <div className="loan-line-error">{line.error}</div>}
                            </div>
                        ))}

                        <div className="loan-component-actions">
                            <Button variant="secondary" className="loan-add-component" type="button" onClick={handleAddPaymentLine}>
                                <Plus className="ui-icon ui-icon-sm" aria-hidden="true" />
                                Add Component
                            </Button>
                            <Button variant="tertiary" type="button" onClick={handleApplyTypeDefaults}>
                                Add Defaults for {LOAN_TYPE_METADATA.find((type) => type.value === loanType)?.label}
                            </Button>
                        </div>

                        <div className="loan-lines-total">
                            Estimated Monthly Total: {formatWithSymbol(parsedPaymentLinesSummary.monthlyTotal, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </FormGroup>

                <FormGroup label="Notes">
                    <textarea
                        value={loanNotes}
                        onChange={(event) => setLoanNotes(event.target.value)}
                        placeholder="Add some notes about this loan payment (optional)"
                        rows={2}
                    />
                </FormGroup>
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

export default LoansManager;