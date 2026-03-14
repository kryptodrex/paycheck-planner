import React, { useEffect, useMemo, useState } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import type { Loan, LoanPaymentFrequency, LoanPaymentLine } from '../../types/auth';
import { formatWithSymbol, getCurrencySymbol } from '../../utils/currency';
import { getPaychecksPerYear, convertToDisplayMode, getDisplayModeLabel, formatPayFrequencyLabel } from '../../utils/payPeriod';
import { getDefaultAccountIcon } from '../../utils/accountDefaults';
import { convertBillToMonthly, formatBillFrequency } from '../../utils/billFrequency';
import { Modal, Button, FormGroup, InputWithPrefix, SectionItemCard, ViewModeSelector, PageHeader } from '../shared';
import './LoansManager.css';

interface LoansManagerProps {
    scrollToAccountId?: string;
    displayMode: 'paycheck' | 'monthly' | 'yearly';
    onDisplayModeChange: (mode: 'paycheck' | 'monthly' | 'yearly') => void;
}

type LoanFieldErrors = {
    name?: string;
    accountId?: string;
    paymentLines?: string;
};

type EditableLoanPaymentLine = {
    id: string;
    label: string;
    amount: string;
    error?: string;
};

const LOAN_TYPES = [
    { value: 'mortgage', label: 'Mortgage' },
    { value: 'auto', label: 'Auto Loan' },
    { value: 'student', label: 'Student Loan' },
    { value: 'personal', label: 'Personal Loan' },
    { value: 'credit-card', label: 'Credit Card' },
    { value: 'other', label: 'Other' },
] as const;

const LOAN_PAYMENT_FREQUENCIES: Array<{ value: LoanPaymentFrequency; label: string }> = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'bi-weekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'semi-annual', label: 'Semi-annual' },
    { value: 'yearly', label: 'Yearly' },
];

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

const LoansManager: React.FC<LoansManagerProps> = ({ scrollToAccountId, displayMode, onDisplayModeChange }) => {
    const { budgetData, addLoan, updateLoan, deleteLoan } = useBudget();
    const [showAddLoan, setShowAddLoan] = useState(false);
    const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
    const [loanName, setLoanName] = useState('');
    const [loanType, setLoanType] = useState<Loan['type']>('personal');
    const [loanPaymentFrequency, setLoanPaymentFrequency] = useState<LoanPaymentFrequency>('monthly');
    const [loanAccountId, setLoanAccountId] = useState('');
    const [loanNotes, setLoanNotes] = useState('');
    const [loanPaymentLines, setLoanPaymentLines] = useState<EditableLoanPaymentLine[]>(createDefaultPaymentLines('personal'));
    const [loanFieldErrors, setLoanFieldErrors] = useState<LoanFieldErrors>({});

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
        setEditingLoan(null);
        setLoanName('');
        setLoanType('personal');
        setLoanPaymentFrequency('monthly');
        setLoanAccountId(budgetData?.accounts[0]?.id || '');
        setLoanNotes('');
        setLoanPaymentLines(createDefaultPaymentLines('personal'));
        setLoanFieldErrors({});
    };

    if (!budgetData) return null;

    const handleAddLoan = () => {
        resetForm();
        setShowAddLoan(true);
    };

    const handleEditLoan = (loan: Loan) => {
        setEditingLoan(loan);
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

        setLoanFieldErrors({});
        setShowAddLoan(true);
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

        if (loanFieldErrors.paymentLines) {
            setLoanFieldErrors((prev) => ({ ...prev, paymentLines: undefined }));
        }
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
        setLoanFieldErrors((prev) => ({ ...prev, paymentLines: undefined }));
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
            setLoanFieldErrors(errors);
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

        setShowAddLoan(false);
        resetForm();
    };

    const handleDeleteLoan = (id: string) => {
        if (confirm('Are you sure you want to delete this loan payment?')) {
            deleteLoan(id);
        }
    };

    const handleToggleLoanEnabled = (loan: Loan) => {
        updateLoan(loan.id, { enabled: !isLoanEnabled(loan) });
    };

    const loansList = budgetData.loans ?? [];
    const loansByAccount = loansList.reduce((acc, loan) => {
        if (!acc[loan.accountId]) {
            acc[loan.accountId] = [];
        }
        acc[loan.accountId].push(loan);
        return acc;
    }, {} as Record<string, Loan[]>);

    const paychecksPerYear = getPaychecksPerYear(budgetData.paySettings.payFrequency);
    const payFrequencyLabel = formatPayFrequencyLabel(budgetData.paySettings.payFrequency);

    const toDisplayAmount = (monthlyAmount: number): number => {
        const perPaycheckAmount = (monthlyAmount * 12) / paychecksPerYear;
        return convertToDisplayMode(perPaycheckAmount, paychecksPerYear, displayMode);
    };

    return (
        <div className="loans-manager">
            <PageHeader
                title="Loan Payments"
                subtitle="Track recurring mortgage, auto, student, and other loan payments"
                actions={
                    <>
                                                <ViewModeSelector
                                                    mode={displayMode}
                                                    onChange={onDisplayModeChange}
                                                    hintText={`Current setting: ${payFrequencyLabel}`}
                                                    hintVisibleModes={['paycheck']}
                                                    reserveHintSpace
                                                />
                        <Button variant="primary" onClick={handleAddLoan}>
                            + Add Payment
                        </Button>
                    </>
                }
            />

            <div className="loans-content">
                {budgetData.accounts.length === 0 ? (
                    <div className="empty-state loans-empty-state">
                        <div className="empty-icon">🏦</div>
                        <h3>No Accounts Set Up</h3>
                        <p>Accounts are created during setup. Add an account before assigning loan payments.</p>
                    </div>
                ) : loansList.length === 0 ? (
                    <div className="empty-state loans-empty-state">
                        <div className="empty-icon">💸</div>
                        <h3>No Loan Payments Yet</h3>
                        <p>Add your first recurring loan payment to track it across the app.</p>
                        <Button variant="primary" className="btn-large" onClick={handleAddLoan} style={{ marginTop: '1rem' }}>
                            Add First Loan Payment
                        </Button>
                    </div>
                ) : (
                    <>
                        {budgetData.accounts
                            .map((account) => {
                                const accountLoans = loansByAccount[account.id] || [];
                                const totalMonthly = roundToCent(
                                    accountLoans.reduce((sum, loan) => {
                                        if (!isLoanEnabled(loan)) {
                                            return sum;
                                        }
                                        return sum + loan.monthlyPayment;
                                    }, 0)
                                );
                                return { account, accountLoans, totalMonthly };
                            })
                            .filter(({ accountLoans }) => accountLoans.length > 0)
                            .sort((a, b) => b.totalMonthly - a.totalMonthly)
                            .map(({ account, accountLoans, totalMonthly }) => (
                                <section key={account.id} className="account-section" id={`account-${account.id}`}>
                                    <div className="account-header">
                                        <div className="account-title">
                                            <span className="account-icon" style={{ color: account.color }}>
                                                {account.icon || getDefaultAccountIcon(account.type)}
                                            </span>
                                            <h3>{account.name}</h3>
                                        </div>
                                        <div className="account-total">
                                            <span className="total-label">Total {getDisplayModeLabel(displayMode)}:</span>
                                            <span className="total-amount">
                                                {formatWithSymbol(toDisplayAmount(totalMonthly), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                                    <SectionItemCard key={loan.id} className={`loan-item ${isLoanEnabled(loan) ? '' : 'loan-disabled'}`}>
                                                        <div className="loan-header">
                                                            <div className="loan-title">
                                                                <h4>
                                                                    {loan.name}
                                                                    <span className="loan-type-badge">{LOAN_TYPES.find((type) => type.value === loan.type)?.label ?? 'Loan'}</span>
                                                                </h4>
                                                                <div className="loan-frequency">
                                                                    <span>Paid {formatBillFrequency((loan.paymentFrequency ?? 'monthly') as LoanPaymentFrequency)}: {formatWithSymbol(convertMonthlyPaymentToFrequency(loan.monthlyPayment, (loan.paymentFrequency ?? 'monthly') as LoanPaymentFrequency), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                                </div>
                                                            </div>
                                                            <div className="loan-amount">
                                                                {formatWithSymbol(toDisplayAmount(loan.monthlyPayment), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                <span className="amount-label">{getDisplayModeLabel(displayMode)}</span>
                                                            </div>
                                                        </div>

                                                        {lineItems.length > 0 && (
                                                            <div className="loan-breakdown">
                                                                {lineItems
                                                                    .sort((a, b) => b.amount - a.amount)
                                                                    .map((line) => (
                                                                    <div key={line.id} className="loan-line-items-preview-row">
                                                                        <span>{line.label}</span>
                                                                        <span>
                                                                            {formatWithSymbol(toDisplayAmount(convertBillToMonthly(line.amount, line.frequency)), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {loan.notes && <div className="loan-notes">{loan.notes}</div>}

                                                        <div className="loan-actions">
                                                            <Button
                                                                variant="icon"
                                                                onClick={() => handleToggleLoanEnabled(loan)}
                                                                title={isLoanEnabled(loan) ? 'Disable loan payment' : 'Enable loan payment'}
                                                            >
                                                                {isLoanEnabled(loan) ? '⏸️' : '▶️'}
                                                            </Button>
                                                            <Button variant="icon" onClick={() => handleEditLoan(loan)} title="Edit loan payment">
                                                                ✏️
                                                            </Button>
                                                            <Button variant="icon" onClick={() => handleDeleteLoan(loan.id)} title="Delete loan payment">
                                                                🗑️
                                                            </Button>
                                                        </div>
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
                isOpen={showAddLoan}
                onClose={() => {
                    setShowAddLoan(false);
                    resetForm();
                }}
                contentClassName="loan-payment-modal"
                header={editingLoan ? 'Edit Loan Payment' : 'Add Loan Payment'}
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setShowAddLoan(false);
                                resetForm();
                            }}
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
                                if (loanFieldErrors.name) {
                                    setLoanFieldErrors((prev) => ({ ...prev, name: undefined }));
                                }
                            }}
                            placeholder="e.g., Home Mortgage, Car Loan"
                            className={loanFieldErrors.name ? 'field-error' : ''}
                        />
                    </FormGroup>

                    <FormGroup label="Loan Type" required>
                        <select
                            value={loanType}
                            onChange={(event) => {
                                const nextType = event.target.value as Loan['type'];
                                setLoanType(nextType);
                                if (!editingLoan) {
                                    setLoanPaymentLines(createDefaultPaymentLines(nextType));
                                }
                            }}
                        >
                            {LOAN_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </FormGroup>
                </div>

                <div className="loan-setup-grid">
                    <FormGroup label="Paid from Account" required error={loanFieldErrors.accountId}>
                        <select
                            value={loanAccountId}
                            onChange={(event) => {
                                setLoanAccountId(event.target.value);
                                if (loanFieldErrors.accountId) {
                                    setLoanFieldErrors((prev) => ({ ...prev, accountId: undefined }));
                                }
                            }}
                            className={loanFieldErrors.accountId ? 'field-error' : ''}
                        >
                            {budgetData.accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                    {account.icon || getDefaultAccountIcon(account.type)} {account.name}
                                </option>
                            ))}
                        </select>
                    </FormGroup>

                    <FormGroup label="Payment Frequency" required>
                        <select
                            value={loanPaymentFrequency}
                            onChange={(event) => setLoanPaymentFrequency(event.target.value as LoanPaymentFrequency)}
                        >
                            {LOAN_PAYMENT_FREQUENCIES.map((frequency) => (
                                <option key={frequency.value} value={frequency.value}>
                                    {frequency.label}
                                </option>
                            ))}
                        </select>
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
                                        ✕
                                    </Button>
                                </div>
                                {line.error && <div className="loan-line-error">{line.error}</div>}
                            </div>
                        ))}

                        <div className="loan-component-actions">
                            <Button variant="secondary" className="loan-add-component" type="button" onClick={handleAddPaymentLine}>
                                + Add Component
                            </Button>
                            <Button variant="tertiary" type="button" onClick={handleApplyTypeDefaults}>
                                Add Defaults for {LOAN_TYPES.find((type) => type.value === loanType)?.label}
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
        </div>
    );
};

export default LoansManager;