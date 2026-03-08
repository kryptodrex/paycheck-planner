import React, { useState } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import type { Loan } from '../../types/auth';
import { formatWithSymbol, getCurrencySymbol } from '../../utils/currency';
import { getPaychecksPerYear, convertToDisplayMode, getDisplayModeLabel } from '../../utils/payPeriod';
import { getDefaultAccountIcon } from '../../utils/accountDefaults';
import { Modal, Button, FormGroup, InputWithPrefix, SectionItemCard, ViewModeSelector, PageHeader, RadioGroup, ProgressBar } from '../shared';
import { GlossaryTerm } from '../Glossary';
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
  insurancePayment?: string;
  insuranceEndBalance?: string;
  insuranceEndBalancePercent?: string;
  termMonths?: string;
  accountId?: string;
  startDate?: string;
};

type LoanTermUnit = 'months' | 'years';

type AmortizationRow = {
  paymentNumber: number;
  paymentDate: string;
  beginningBalance: number;
  paymentAmount: number;
  principal: number;
  interest: number;
  pmiPayment: number;
  endingBalance: number;
};

const LOAN_TYPES = [
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'auto', label: 'Auto Loan' },
  { value: 'student', label: 'Student Loan' },
  { value: 'personal', label: 'Personal Loan' },
  { value: 'credit-card', label: 'Credit Card' },
  { value: 'other', label: 'Other' },
] as const;

const INSURANCE_ELIGIBLE_LOAN_TYPES: Loan['type'][] = ['mortgage', 'auto', 'student', 'other'];

const roundToCent = (value: number): number => Math.round(value * 100) / 100;

const isInsuranceEligibleLoanType = (type: Loan['type']): boolean => INSURANCE_ELIGIBLE_LOAN_TYPES.includes(type);

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
  const [loanInsuranceEnabled, setLoanInsuranceEnabled] = useState(false);
  const [loanInsurancePayment, setLoanInsurancePayment] = useState('');
  const [loanInsuranceEndBalanceMode, setLoanInsuranceEndBalanceMode] = useState<'amount' | 'percent'>('amount');
  const [loanInsuranceEndBalance, setLoanInsuranceEndBalance] = useState('');
  const [loanInsuranceEndBalancePercent, setLoanInsuranceEndBalancePercent] = useState('');
  const [loanAccountId, setLoanAccountId] = useState('');
  const [loanStartDate, setLoanStartDate] = useState('');
  const [loanTermMonths, setLoanTermMonths] = useState('');
  const [loanTermUnit, setLoanTermUnit] = useState<LoanTermUnit>('months');
  const [loanNotes, setLoanNotes] = useState('');
  const [loanFieldErrors, setLoanFieldErrors] = useState<LoanFieldErrors>({});
  const [scheduleLoan, setScheduleLoan] = useState<Loan | null>(null);

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
    setLoanInsurancePayment('');
    setLoanInsuranceEndBalance('');
    setLoanAccountId(budgetData.accounts[0]?.id || '');
    setLoanStartDate(new Date().toISOString().split('T')[0]);
    setLoanTermMonths('');
    setLoanTermUnit('months');
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
    const hasInsurance = (loan.insurancePayment ?? 0) > 0;
    setLoanInsuranceEnabled(hasInsurance);
    setLoanInsurancePayment(loan.insurancePayment?.toString() || '');
    if (typeof loan.insuranceEndBalancePercent === 'number') {
      setLoanInsuranceEndBalanceMode('percent');
      setLoanInsuranceEndBalancePercent(loan.insuranceEndBalancePercent.toString());
      setLoanInsuranceEndBalance('');
    } else {
      setLoanInsuranceEndBalanceMode('amount');
      setLoanInsuranceEndBalance(loan.insuranceEndBalance?.toString() || '');
      setLoanInsuranceEndBalancePercent('');
    }
    setLoanAccountId(loan.accountId);
    setLoanStartDate(loan.startDate.split('T')[0]);
    if (loan.termMonths) {
      const isFullYears = loan.termMonths >= 12 && loan.termMonths % 12 === 0;
      setLoanTermUnit(isFullYears ? 'years' : 'months');
      setLoanTermMonths(isFullYears ? (loan.termMonths / 12).toString() : loan.termMonths.toString());
    } else {
      setLoanTermUnit('months');
      setLoanTermMonths('');
    }
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
    const parsedInsurancePayment = loanInsuranceEnabled && loanInsurancePayment ? parseFloat(loanInsurancePayment) : undefined;
    const parsedInsuranceEndBalance = loanInsuranceEnabled && loanInsuranceEndBalanceMode === 'amount' && loanInsuranceEndBalance ? parseFloat(loanInsuranceEndBalance) : undefined;
    const parsedInsuranceEndBalancePercent = loanInsuranceEnabled && loanInsuranceEndBalanceMode === 'percent' && loanInsuranceEndBalancePercent ? parseFloat(loanInsuranceEndBalancePercent) : undefined;
    const parsedTermValue = loanTermMonths ? parseFloat(loanTermMonths) : undefined;
    const parsedTermMonths = parsedTermValue
      ? Math.round(loanTermUnit === 'years' ? parsedTermValue * 12 : parsedTermValue)
      : undefined;
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

    if (loanInsuranceEnabled) {
      if (!loanInsurancePayment || !Number.isFinite(parsedInsurancePayment) || (parsedInsurancePayment ?? 0) < 0) {
        errors.insurancePayment = 'Please enter a valid monthly insurance amount.';
      }

      if (loanInsuranceEndBalanceMode === 'amount') {
        if (loanInsuranceEndBalance && (!Number.isFinite(parsedInsuranceEndBalance) || (parsedInsuranceEndBalance ?? 0) < 0)) {
          errors.insuranceEndBalance = 'Please enter a valid insurance cutoff balance.';
        }
      } else {
        if (loanInsuranceEndBalancePercent && (!Number.isFinite(parsedInsuranceEndBalancePercent) || (parsedInsuranceEndBalancePercent ?? 0) < 0 || (parsedInsuranceEndBalancePercent ?? 0) > 100)) {
          errors.insuranceEndBalancePercent = 'Please enter a valid percentage between 0 and 100.';
        }
      }
    }

    if (loanTermMonths && (!Number.isFinite(parsedTermValue) || (parsedTermValue ?? 0) <= 0)) {
      errors.termMonths = `Please enter a valid loan term in ${loanTermUnit}.`;
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
      insurancePayment: isInsuranceEligibleLoanType(loanType) ? parsedInsurancePayment : undefined,
      insuranceEndBalance: isInsuranceEligibleLoanType(loanType) && loanInsuranceEndBalanceMode === 'amount' ? parsedInsuranceEndBalance : undefined,
      insuranceEndBalancePercent: isInsuranceEligibleLoanType(loanType) && loanInsuranceEndBalanceMode === 'percent' ? parsedInsuranceEndBalancePercent : undefined,
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

  const getMonthlyInsurancePayment = (loan: Loan, balance: number = loan.currentBalance): number => {
    if (!isInsuranceEligibleLoanType(loan.type)) return 0;

    const insurancePayment = loan.insurancePayment ?? 0;
    if (insurancePayment <= 0) return 0;

    let endBalanceThreshold = 0;
    if (typeof loan.insuranceEndBalance === 'number') {
      endBalanceThreshold = loan.insuranceEndBalance;
    } else if (typeof loan.insuranceEndBalancePercent === 'number') {
      endBalanceThreshold = (loan.principal * loan.insuranceEndBalancePercent) / 100;
    }

    if (endBalanceThreshold > 0 && balance <= endBalanceThreshold) {
      return 0;
    }

    return insurancePayment;
  };

  const getCurrentPaymentSplit = (loan: Loan): { principal: number; interest: number; insurance: number; total: number } => {
    if (loan.currentBalance <= 0 || loan.monthlyPayment <= 0) {
      return { principal: 0, interest: 0, insurance: 0, total: 0 };
    }

    const monthlyRate = loan.interestRate / 100 / 12;
    const interest = roundToCent(loan.currentBalance * monthlyRate);
    const principal = roundToCent(Math.max(0, Math.min(loan.monthlyPayment - interest, loan.currentBalance)));
    const insurance = roundToCent(getMonthlyInsurancePayment(loan));

    return {
      principal,
      interest,
      insurance,
      total: roundToCent(principal + interest + insurance),
    };
  };

  const buildAmortizationSchedule = (loan: Loan): AmortizationRow[] => {
    const schedule: AmortizationRow[] = [];

    if (loan.currentBalance <= 0 || loan.monthlyPayment <= 0) return schedule;

    const monthlyRate = loan.interestRate / 100 / 12;
    // Allow up to 1200 months (100 years) to prevent infinite loops, but will exit early when balance reaches zero
    const maxScheduleLength = 1200;
    let balance = loan.currentBalance;
    const startDate = new Date();

    for (let i = 1; i <= maxScheduleLength && balance > 0; i += 1) {
      const beginningBalance = balance;
      const interest = roundToCent(balance * monthlyRate);
      let principal = roundToCent(loan.monthlyPayment - interest);

      if (principal <= 0) {
        break;
      }

      if (principal > balance) {
        principal = roundToCent(balance);
      }

      const pmiPayment = roundToCent(getMonthlyInsurancePayment(loan, balance));
      const paymentAmount = roundToCent(principal + interest + pmiPayment);
      const nextBalance = roundToCent(Math.max(0, balance - principal));

      const paymentDate = new Date(startDate);
      paymentDate.setMonth(paymentDate.getMonth() + i);

      schedule.push({
        paymentNumber: i,
        paymentDate: paymentDate.toLocaleDateString(),
        beginningBalance,
        paymentAmount,
        principal,
        interest,
        pmiPayment,
        endingBalance: nextBalance,
      });

      balance = nextBalance;
    }

    return schedule;
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
        subtitle="Track your loans, mortgages, and other debts with payment and amortization details"
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
          <div className="empty-state loans-empty-state">
            <div className="empty-icon">🏦</div>
            <h3>No Loans Yet</h3>
            <p>Add your loans or debts to start tracking your payoff progress</p>
          </div>
        ) : (
          <>
            {(budgetData.accounts ?? []).map(account => {
              const accountLoans = loansByAccount[account.id] || [];
              const totalMonthly = accountLoans
                .filter(loan => isLoanEnabled(loan))
                .reduce((sum, loan) => sum + loan.monthlyPayment + getMonthlyInsurancePayment(loan), 0);
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
                        const rawPercentPaid = loan.principal > 0 ? ((loan.principal - loan.currentBalance) / loan.principal) * 100 : 0;
                        const percentPaidValue = Math.max(0, Math.min(100, Number.isFinite(rawPercentPaid) ? rawPercentPaid : 0));
                        const percentPaid = percentPaidValue.toFixed(1);
                        const paymentSplit = getCurrentPaymentSplit(loan);
                        const displayMonthlyTotal = toDisplayAmount(loan.monthlyPayment + paymentSplit.insurance);
                        
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
                                {formatWithSymbol(displayMonthlyTotal, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span className="amount-label">/ {getDisplayModeLabel(displayMode)}</span>
                              </div>
                            </div>

                            <div className="loan-details">
                              <ProgressBar
                                percentage={percentPaidValue}
                                details={
                                  <>
                                    <span>{percentPaid}% paid</span>
                                    <span>
                                      {formatWithSymbol(loan.currentBalance, currency)} of {formatWithSymbol(loan.principal, currency)}
                                    </span>
                                  </>
                                }
                              />
                              <div className="loan-payment-split">
                                <span className="payment-split-title"><GlossaryTerm termId="loan-payment-split">Payment Split</GlossaryTerm> (Monthly)</span>
                                <div className="payment-split-row">
                                  <span><GlossaryTerm termId="loan-principal">Principal</GlossaryTerm></span>
                                  <span>{formatWithSymbol(paymentSplit.principal, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="payment-split-row">
                                  <span><GlossaryTerm termId="interest-rate-apr">Interest</GlossaryTerm></span>
                                  <span>{formatWithSymbol(paymentSplit.interest, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                {paymentSplit.insurance > 0 && (
                                  <div className="payment-split-row">
                                    <span><GlossaryTerm termId="mortgage-insurance">Insurance (PMI/GAP)</GlossaryTerm></span>
                                    <span>{formatWithSymbol(paymentSplit.insurance, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                )}
                                <div className="payment-split-row total">
                                  <span>Total</span>
                                  <span>{formatWithSymbol(paymentSplit.total, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              </div>
                              <div className="loan-stats">
                                <div className="loan-stat">
                                  <span className="stat-label"><GlossaryTerm termId="interest-rate-apr">Interest Rate</GlossaryTerm></span>
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
                                onClick={() => setScheduleLoan(loan)}
                                title="View payment plan"
                                className="payment-plan-btn"
                              >
                                📊 Payment Plan
                              </Button>
                              <Button
                                variant="icon"
                                onClick={() => handleToggleLoanEnabled(loan)}
                                title={isLoanEnabled(loan) ? 'Disable loan' : 'Enable loan'}
                              >
                                {isLoanEnabled(loan) ? '⏸️' : '▶️'}
                              </Button>
                              <Button
                                variant="icon"
                                onClick={() => handleEditLoan(loan)}
                                title="Edit loan"
                              >
                                ✏️
                              </Button>
                              <Button
                                variant="icon"
                                onClick={() => handleDeleteLoan(loan.id)}
                                title="Delete loan"
                              >
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

        <FormGroup label={<><GlossaryTerm termId="loan-principal">Original Principal Amount</GlossaryTerm></>} required error={loanFieldErrors.principal}>
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

        <FormGroup label={<><GlossaryTerm termId="loan-balance">Current Balance</GlossaryTerm></>} required error={loanFieldErrors.currentBalance}>
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

        <FormGroup label={<><GlossaryTerm termId="interest-rate-apr">Annual Interest Rate (%)</GlossaryTerm></>} required error={loanFieldErrors.interestRate}>
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

        <FormGroup label={<><GlossaryTerm termId="loan-payment-split">Monthly Payment</GlossaryTerm></>} required error={loanFieldErrors.monthlyPayment}>
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

        {isInsuranceEligibleLoanType(loanType) && (
          <>
            <FormGroup label={<><GlossaryTerm termId="mortgage-insurance">Mortgage Insurance (PMI/GAP/etc.)</GlossaryTerm></>} helperText="Add optional insurance to this loan">
              <RadioGroup
                name="insurance-enabled"
                value={loanInsuranceEnabled ? 'enabled' : 'disabled'}
                options={[
                  {
                    value: 'disabled',
                    label: 'No Insurance',
                  },
                  {
                    value: 'enabled',
                    label: 'Add Insurance',
                  },
                ]}
                onChange={(value) => {
                  const enabled = value === 'enabled';
                  setLoanInsuranceEnabled(enabled);
                  if (!enabled) {
                    setLoanInsurancePayment('');
                    setLoanInsuranceEndBalance('');
                    setLoanInsuranceEndBalancePercent('');
                  }
                }}
                layout="row"
              />
            </FormGroup>

            {loanInsuranceEnabled && (
              <>
                <FormGroup label="Monthly Insurance Amount" helperText="Amount added to monthly payment while insurance is active" error={loanFieldErrors.insurancePayment}>
                  <InputWithPrefix
                    prefix={getCurrencySymbol(currency)}
                    type="number"
                    value={loanInsurancePayment}
                    onChange={(e) => {
                      setLoanInsurancePayment(e.target.value);
                      if (loanFieldErrors.insurancePayment) {
                        setLoanFieldErrors(prev => ({ ...prev, insurancePayment: undefined }));
                      }
                    }}
                    placeholder="150"
                    min="0"
                    step="1"
                    className={loanFieldErrors.insurancePayment ? 'field-error' : ''}
                  />
                </FormGroup>

                <FormGroup label="Insurance Threshold" helperText="When insurance stops">
                  <div className="insurance-end-balance-row">
                    {loanInsuranceEndBalanceMode === 'amount' ? (
                      <InputWithPrefix
                        prefix={getCurrencySymbol(currency)}
                        type="number"
                        value={loanInsuranceEndBalance}
                        onChange={(e) => {
                          setLoanInsuranceEndBalance(e.target.value);
                          if (loanFieldErrors.insuranceEndBalance) {
                            setLoanFieldErrors(prev => ({ ...prev, insuranceEndBalance: undefined }));
                          }
                        }}
                        placeholder="300000"
                        min="0"
                        step="100"
                        className={loanFieldErrors.insuranceEndBalance ? 'field-error' : ''}
                      />
                    ) : (
                      <InputWithPrefix
                        prefix=""
                        suffix="%"
                        type="number"
                        value={loanInsuranceEndBalancePercent}
                        onChange={(e) => {
                          setLoanInsuranceEndBalancePercent(e.target.value);
                          if (loanFieldErrors.insuranceEndBalancePercent) {
                            setLoanFieldErrors(prev => ({ ...prev, insuranceEndBalancePercent: undefined }));
                          }
                        }}
                        placeholder="80"
                        min="0"
                        max="100"
                        step="1"
                        className={loanFieldErrors.insuranceEndBalancePercent ? 'field-error' : ''}
                      />
                    )}
                    <select
                      value={loanInsuranceEndBalanceMode}
                      onChange={(e) => {
                        const mode = e.target.value as 'amount' | 'percent';
                        setLoanInsuranceEndBalanceMode(mode);
                        if (mode === 'amount') {
                          setLoanInsuranceEndBalancePercent('');
                        } else {
                          setLoanInsuranceEndBalance('');
                        }
                      }}
                      aria-label="Insurance threshold mode"
                    >
                      <option value="amount">Amount</option>
                      <option value="percent">% of Loan</option>
                    </select>
                  </div>
                </FormGroup>
              </>
            )}
          </>
        )}

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

        <FormGroup
          label={<><GlossaryTerm termId="loan-term">Loan Term</GlossaryTerm></>}
          helperText="Optional: Enter duration in months or years"
          error={loanFieldErrors.termMonths}
        >
          <div className="loan-term-input-row">
            <input
              type="number"
              value={loanTermMonths}
              onChange={(e) => {
                setLoanTermMonths(e.target.value);
                if (loanFieldErrors.termMonths) {
                  setLoanFieldErrors(prev => ({ ...prev, termMonths: undefined }));
                }
              }}
              placeholder={loanTermUnit === 'years' ? '30' : '360'}
              min="0"
              step={loanTermUnit === 'years' ? '0.5' : '1'}
              className={loanFieldErrors.termMonths ? 'field-error' : ''}
            />
            <select
              value={loanTermUnit}
              onChange={(e) => setLoanTermUnit(e.target.value as LoanTermUnit)}
              aria-label="Loan term unit"
            >
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>
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

      <Modal
        isOpen={Boolean(scheduleLoan)}
        onClose={() => setScheduleLoan(null)}
        contentClassName="loan-schedule-modal"
        header={scheduleLoan ? `${scheduleLoan.name} Payment Schedule` : 'Payment Schedule'}
        footer={
          <Button variant="secondary" onClick={() => setScheduleLoan(null)}>
            Close
          </Button>
        }
      >
        {scheduleLoan && (() => {
          const schedule = buildAmortizationSchedule(scheduleLoan);
          return (
            <div className="loan-schedule-content">
              <p className="loan-schedule-description">
                This <GlossaryTerm termId="amortization-schedule">amortization schedule</GlossaryTerm> shows how each monthly payment reduces your loan balance over time. 
                Early payments go mostly toward <GlossaryTerm termId="interest-rate-apr">interest</GlossaryTerm>, while later payments pay down more <GlossaryTerm termId="loan-principal">principal</GlossaryTerm>. 
                The <strong>Beginning Balance</strong> is what you owe at the start of each month, and the <strong>Ending Balance</strong> is what remains after your payment. 
                <GlossaryTerm termId="mortgage-insurance">Insurance (PMI/GAP)</GlossaryTerm> is included while active and will drop off automatically when your balance reaches the specified threshold.
              </p>
              {schedule.length === 0 ? (
                <div className="loan-schedule-empty">
                  Unable to generate schedule. Monthly payment may be too low to reduce principal.
                </div>
              ) : (
                <div className="loan-schedule-table-wrapper">
                  <table className="loan-schedule-table">
                    <thead>
                      <tr>
                        <th>Payment #</th>
                        <th>Payment Date</th>
                        <th><GlossaryTerm termId="loan-balance">Beginning Balance</GlossaryTerm></th>
                        <th>Payment Amount</th>
                        <th><GlossaryTerm termId="loan-principal">Principal</GlossaryTerm></th>
                        <th><GlossaryTerm termId="interest-rate-apr">Interest</GlossaryTerm></th>
                        <th><GlossaryTerm termId="loan-balance">Ending Balance</GlossaryTerm></th>
                        <th><GlossaryTerm termId="mortgage-insurance">Insurance Payment</GlossaryTerm></th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map(row => (
                        <tr key={`${scheduleLoan.id}-${row.paymentNumber}`}>
                          <td>{row.paymentNumber}</td>
                          <td>{row.paymentDate}</td>
                          <td>{formatWithSymbol(row.beginningBalance, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td>{formatWithSymbol(row.paymentAmount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td>{formatWithSymbol(row.principal, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td>{formatWithSymbol(row.interest, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td>{formatWithSymbol(row.endingBalance, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td>{formatWithSymbol(row.pmiPayment, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default LoansManager;
