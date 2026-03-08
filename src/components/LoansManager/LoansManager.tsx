import React, { useState } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import type { Loan } from '../../types/auth';
import { formatWithSymbol, getCurrencySymbol } from '../../utils/currency';
import { getPaychecksPerYear, convertToDisplayMode, getDisplayModeLabel } from '../../utils/payPeriod';
import { getDefaultAccountIcon } from '../../utils/accountDefaults';
import { Modal, Button, FormGroup, InputWithPrefix, SectionItemCard, ViewModeSelector, PageHeader } from '../shared';
import './LoansManager.css';

interface LoansManagerProps {
  displayMode: 'paycheck' | 'monthly' | 'yearly';
  onDisplayModeChange: (mode: 'paycheck' | 'monthly' | 'yearly') => void;
}

type LoanFieldErrors = {
  name?: string;
  type?: string;
  principal?: string;
  currentBalance?: string;
  interestRate?: string;
  monthlyPayment?: string;
  accountId?: string;
  startDate?: string;
};

const LOAN_TYPES = [
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'auto', label: 'Auto Loan' },
  { value: 'student', label: 'Student Loan' },
  { value: 'personal', label: 'Personal Loan' },
  { value: 'credit-card', label: 'Credit Card' },
  { value: 'other', label: 'Other' },
] as const;

const LoansManager: React.FC<LoansManagerProps> = ({ displayMode, onDisplayModeChange }) => {
  const { budgetData, addLoan, updateLoan, deleteLoan } = useBudget();
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);

  // Form state for new/edit loan
  const [loanName, setLoanName] = useState('');
  const [loanType, setLoanType] = useState<Loan['type']>('personal');
  const [loanPrincipal, setLoanPrincipal] = useState('');
  const [loanCurrentBalance, setLoanCurrentBalance] = useState('');
  const [loanInterestRate, setLoanInterestRate] = useState('');
  const [loanMonthlyPayment, setLoanMonthlyPayment] = useState('');
  const [loanAccountId, setLoanAccountId] = useState('');
  const [loanStartDate, setLoanStartDate] = useState('');
  const [loanTermMonths, setLoanTermMonths] = useState('');
  const [loanNotes, setLoanNotes] = useState('');
  const [loanFieldErrors, setLoanFieldErrors] = useState<LoanFieldErrors>({});

  if (!budgetData) return null;

  const currency = budgetData.settings?.currency || 'USD';
  const isLoanEnabled = (loan: Loan) => loan.enabled !== false;

  const handleAddLoan = () => {
    setEditingLoan(null);
    setLoanName('');
    setLoanType('personal');
    setLoanPrincipal('');
    setLoanCurrentBalance('');
    setLoanInterestRate('');
    setLoanMonthlyPayment('');
    setLoanAccountId(budgetData.accounts[0]?.id || '');
    setLoanStartDate(new Date().toISOString().split('T')[0]);
    setLoanTermMonths('');
    setLoanNotes('');
    setLoanFieldErrors({});
    setShowAddLoan(true);
  };

  const handleEditLoan = (loan: Loan) => {
    setEditingLoan(loan);
    setLoanName(loan.name);
    setLoanType(loan.type);
    setLoanPrincipal(loan.principal.toString());
    setLoanCurrentBalance(loan.currentBalance.toString());
    setLoanInterestRate(loan.interestRate.toString());
    setLoanMonthlyPayment(loan.monthlyPayment.toString());
    setLoanAccountId(loan.accountId);
    setLoanStartDate(loan.startDate.split('T')[0]);
    setLoanTermMonths(loan.termMonths?.toString() || '');
    setLoanNotes(loan.notes || '');
    setLoanFieldErrors({});
    setShowAddLoan(true);
  };

  const handleSaveLoan = () => {
    const trimmedLoanName = loanName.trim();
    const parsedPrincipal = parseFloat(loanPrincipal);
    const parsedCurrentBalance = parseFloat(loanCurrentBalance);
    const parsedInterestRate = parseFloat(loanInterestRate);
    const parsedMonthlyPayment = parseFloat(loanMonthlyPayment);
    const parsedTermMonths = loanTermMonths ? parseInt(loanTermMonths) : undefined;
    const errors: LoanFieldErrors = {};

    if (!trimmedLoanName) {
      errors.name = 'Loan name is required.';
    }

    if (!Number.isFinite(parsedPrincipal) || parsedPrincipal <= 0) {
      errors.principal = 'Please enter a valid principal amount greater than zero.';
    }

    if (!Number.isFinite(parsedCurrentBalance) || parsedCurrentBalance < 0) {
      errors.currentBalance = 'Please enter a valid current balance.';
    }

    if (!Number.isFinite(parsedInterestRate) || parsedInterestRate < 0) {
      errors.interestRate = 'Please enter a valid interest rate.';
    }

    if (!Number.isFinite(parsedMonthlyPayment) || parsedMonthlyPayment <= 0) {
      errors.monthlyPayment = 'Please enter a valid monthly payment greater than zero.';
    }

    if (!loanAccountId) {
      errors.accountId = 'Please select an account.';
    }

    if (!loanStartDate) {
      errors.startDate = 'Please enter a start date.';
    }

    if (Object.keys(errors).length > 0) {
      setLoanFieldErrors(errors);
      return;
    }

    const loanData = {
      name: trimmedLoanName,
      type: loanType,
      principal: parsedPrincipal,
      currentBalance: parsedCurrentBalance,
      interestRate: parsedInterestRate,
      monthlyPayment: parsedMonthlyPayment,
      accountId: loanAccountId,
      startDate: new Date(loanStartDate).toISOString(),
      termMonths: parsedTermMonths,
      enabled: editingLoan ? editingLoan.enabled !== false : true,
      notes: loanNotes.trim() || undefined,
    };

    if (editingLoan) {
      updateLoan(editingLoan.id, loanData);
    } else {
      addLoan(loanData);
    }

    setShowAddLoan(false);
    setEditingLoan(null);
    setLoanFieldErrors({});
  };

  const handleDeleteLoan = (id: string) => {
    if (confirm('Are you sure you want to delete this loan?')) {
      deleteLoan(id);
    }
  };

  const handleToggleLoanEnabled = (loan: Loan) => {
    updateLoan(loan.id, { enabled: !isLoanEnabled(loan) });
  };

  // Group loans by account
  const loansList = budgetData.loans ?? [];
  const loansByAccount = loansList.reduce((acc, loan) => {
    if (!acc[loan.accountId]) {
      acc[loan.accountId] = [];
    }
    acc[loan.accountId].push(loan);
    return acc;
  }, {} as Record<string, Loan[]>);

  const paychecksPerYear = getPaychecksPerYear(budgetData.paySettings.payFrequency);

  // Convert monthly payment to display mode
  const toDisplayAmount = (monthlyAmount: number): number => {
    const perPaycheckAmount = (monthlyAmount * 12) / paychecksPerYear;
    return convertToDisplayMode(perPaycheckAmount, paychecksPerYear, displayMode);
  };

  // Calculate remaining months
  const getRemainingMonths = (loan: Loan): number | null => {
    if (loan.currentBalance <= 0 || loan.monthlyPayment <= 0) return null;
    
    const monthlyRate = loan.interestRate / 100 / 12;
    if (monthlyRate === 0) {
      return Math.ceil(loan.currentBalance / loan.monthlyPayment);
    }
    
    // Use loan payment formula to calculate remaining months
    const months = Math.log(loan.monthlyPayment / (loan.monthlyPayment - loan.currentBalance * monthlyRate)) / Math.log(1 + monthlyRate);
    return Math.ceil(months);
  };

  return (
    <div className="loans-manager">
      <PageHeader
        title="Loans & Debts"
        subtitle="Track your loans, mortgages, and other debts"
        actions={
          <>
            <ViewModeSelector
              mode={displayMode}
              onChange={onDisplayModeChange}
            />
            <Button variant="primary" onClick={handleAddLoan}>
              + Add Loan
            </Button>
          </>
        }
      />

      <div className="loans-content">
        {(budgetData.accounts ?? []).length === 0 ? (
          <div className="empty-state">
            <p>No accounts available. Please add an account first in the Accounts settings.</p>
          </div>
        ) : loansList.length === 0 ? (
          <div className="empty-state">
            <p>No loans yet. Click "Add Loan" to track your first debt or loan.</p>
          </div>
        ) : (
          <>
            {(budgetData.accounts ?? []).map(account => {
              const accountLoans = loansByAccount[account.id] || [];
              const totalMonthly = accountLoans
                .filter(loan => isLoanEnabled(loan))
                .reduce((sum, loan) => sum + loan.monthlyPayment, 0);
              return { account, accountLoans, totalMonthly };
            })
              .filter(({ accountLoans }) => accountLoans.length > 0)
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
                        if (aEnabled !== bEnabled) return aEnabled ? -1 : 1;
                        return b.currentBalance - a.currentBalance;
                      })
                      .map(loan => {
                        const remainingMonths = getRemainingMonths(loan);
                        const remainingYears = remainingMonths ? (remainingMonths / 12).toFixed(1) : null;
                        const percentPaid = ((loan.principal - loan.currentBalance) / loan.principal * 100).toFixed(1);
                        
                        return (
                          <SectionItemCard key={loan.id} className={`loan-item ${isLoanEnabled(loan) ? '' : 'loan-disabled'}`}>
                            <div className="loan-header">
                              <div className="loan-title">
                                <h4>
                                  {loan.name}
                                  <span className="loan-type-badge">{LOAN_TYPES.find(t => t.value === loan.type)?.label}</span>
                                </h4>
                              </div>
                              <div className="loan-amount">
                                {formatWithSymbol(toDisplayAmount(loan.monthlyPayment), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span className="amount-label">/ {getDisplayModeLabel(displayMode)}</span>
                              </div>
                            </div>

                            <div className="loan-details">
                              <div className="loan-progress">
                                <div className="progress-bar-container">
                                  <div className="progress-bar" style={{ width: `${percentPaid}%` }} />
                                </div>
                                <div className="progress-info">
                                  <span>{percentPaid}% paid</span>
                                  <span>
                                    {formatWithSymbol(loan.currentBalance, currency)} of {formatWithSymbol(loan.principal, currency)}
                                  </span>
                                </div>
                              </div>
                              <div className="loan-stats">
                                <div className="loan-stat">
                                  <span className="stat-label">Interest Rate</span>
                                  <span className="stat-value">{loan.interestRate}%</span>
                                </div>
                                {remainingYears && (
                                  <div className="loan-stat">
                                    <span className="stat-label">Time Remaining</span>
                                    <span className="stat-value">{remainingYears} years</span>
                                  </div>
                                )}
                                <div className="loan-stat">
                                  <span className="stat-label">Started</span>
                                  <span className="stat-value">{new Date(loan.startDate).toLocaleDateString()}</span>
                                </div>
                              </div>
                              {loan.notes && (
                                <div className="loan-notes">
                                  <span className="notes-label">Notes:</span> {loan.notes}
                                </div>
                              )}
                            </div>

                            <div className="loan-actions">
                              <Button
                                variant="secondary"
                                size="small"
                                onClick={() => handleToggleLoanEnabled(loan)}
                                title={isLoanEnabled(loan) ? 'Disable loan' : 'Enable loan'}
                              >
                                {isLoanEnabled(loan) ? '✓ Enabled' : '✗ Disabled'}
                              </Button>
                              <Button
                                variant="secondary"
                                size="small"
                                onClick={() => handleEditLoan(loan)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="danger"
                                size="small"
                                onClick={() => handleDeleteLoan(loan.id)}
                              >
                                Delete
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

      {/* Add/Edit Loan Modal */}
      <Modal
        isOpen={showAddLoan}
        onClose={() => {
          setShowAddLoan(false);
          setEditingLoan(null);
          setLoanFieldErrors({});
        }}
        header={editingLoan ? 'Edit Loan' : 'Add New Loan'}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddLoan(false);
                setEditingLoan(null);
                setLoanFieldErrors({});
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveLoan}>
              {editingLoan ? 'Save Changes' : 'Add Loan'}
            </Button>
          </>
        }
      >
        <FormGroup label="Loan Name" required error={loanFieldErrors.name}>
          <input
            type="text"
            value={loanName}
            onChange={(e) => {
              setLoanName(e.target.value);
              if (loanFieldErrors.name) {
                setLoanFieldErrors(prev => ({ ...prev, name: undefined }));
              }
            }}
            placeholder="e.g., Home Mortgage, Car Loan"
            className={loanFieldErrors.name ? 'field-error' : ''}
          />
        </FormGroup>

        <FormGroup label="Loan Type" required>
          <select
            value={loanType}
            onChange={(e) => setLoanType(e.target.value as Loan['type'])}
          >
            {LOAN_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </FormGroup>

        <FormGroup label="Original Principal Amount" required error={loanFieldErrors.principal}>
          <InputWithPrefix
            prefix={getCurrencySymbol(currency)}
            type="number"
            value={loanPrincipal}
            onChange={(e) => {
              setLoanPrincipal(e.target.value);
              if (loanFieldErrors.principal) {
                setLoanFieldErrors(prev => ({ ...prev, principal: undefined }));
              }
            }}
            placeholder="50000"
            min="0"
            step="100"
            className={loanFieldErrors.principal ? 'field-error' : ''}
          />
        </FormGroup>

        <FormGroup label="Current Balance" required error={loanFieldErrors.currentBalance}>
          <InputWithPrefix
            prefix={getCurrencySymbol(currency)}
            type="number"
            value={loanCurrentBalance}
            onChange={(e) => {
              setLoanCurrentBalance(e.target.value);
              if (loanFieldErrors.currentBalance) {
                setLoanFieldErrors(prev => ({ ...prev, currentBalance: undefined }));
              }
            }}
            placeholder="45000"
            min="0"
            step="100"
            className={loanFieldErrors.currentBalance ? 'field-error' : ''}
          />
        </FormGroup>

        <FormGroup label="Annual Interest Rate (%)" required error={loanFieldErrors.interestRate}>
          <input
            type="number"
            value={loanInterestRate}
            onChange={(e) => {
              setLoanInterestRate(e.target.value);
              if (loanFieldErrors.interestRate) {
                setLoanFieldErrors(prev => ({ ...prev, interestRate: undefined }));
              }
            }}
            placeholder="4.5"
            min="0"
            step="0.1"
            className={loanFieldErrors.interestRate ? 'field-error' : ''}
          />
        </FormGroup>

        <FormGroup label="Monthly Payment" required error={loanFieldErrors.monthlyPayment}>
          <InputWithPrefix
            prefix={getCurrencySymbol(currency)}
            type="number"
            value={loanMonthlyPayment}
            onChange={(e) => {
              setLoanMonthlyPayment(e.target.value);
              if (loanFieldErrors.monthlyPayment) {
                setLoanFieldErrors(prev => ({ ...prev, monthlyPayment: undefined }));
              }
            }}
            placeholder="350"
            min="0"
            step="10"
            className={loanFieldErrors.monthlyPayment ? 'field-error' : ''}
          />
        </FormGroup>

        <FormGroup label="Payment Account" required error={loanFieldErrors.accountId}>
          <select
            value={loanAccountId}
            onChange={(e) => {
              setLoanAccountId(e.target.value);
              if (loanFieldErrors.accountId) {
                setLoanFieldErrors(prev => ({ ...prev, accountId: undefined }));
              }
            }}
            className={loanFieldErrors.accountId ? 'field-error' : ''}
          >
            <option value="">Select an account</option>
            {budgetData.accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.icon || getDefaultAccountIcon(account.type)} {account.name}
              </option>
            ))}
          </select>
        </FormGroup>

        <FormGroup label="Loan Start Date" required error={loanFieldErrors.startDate}>
          <input
            type="date"
            value={loanStartDate}
            onChange={(e) => {
              setLoanStartDate(e.target.value);
              if (loanFieldErrors.startDate) {
                setLoanFieldErrors(prev => ({ ...prev, startDate: undefined }));
              }
            }}
            className={loanFieldErrors.startDate ? 'field-error' : ''}
          />
        </FormGroup>

        <FormGroup label="Loan Term (months)" helperText="Optional: Total duration of the loan in months">
          <input
            type="number"
            value={loanTermMonths}
            onChange={(e) => setLoanTermMonths(e.target.value)}
            placeholder="360 (for 30-year mortgage)"
            min="0"
            step="1"
          />
        </FormGroup>

        <FormGroup label="Notes" helperText="Optional notes about this loan">
          <textarea
            value={loanNotes}
            onChange={(e) => setLoanNotes(e.target.value)}
            placeholder="Any additional information..."
            rows={3}
          />
        </FormGroup>
      </Modal>
    </div>
  );
};

export default LoansManager;
