import React, { useMemo, useState } from 'react';
import { useBudget } from '../../../contexts/BudgetContext';
import { calculateAnnualizedPayBreakdown, calculateDisplayPayBreakdown } from '../../../services/budgetCalculations';
import { formatWithSymbol, getCurrencySymbol } from '../../../utils/currency';
import { roundToCent, roundUpToCent } from '../../../utils/money';
import { getPaychecksPerYear, getDisplayModeLabel, formatPayFrequencyLabel } from '../../../utils/payPeriod';
import { getBillFrequencyOccurrencesPerYear, getSavingsFrequencyOccurrencesPerYear } from '../../../utils/frequency';
import { getDefaultAccountIcon } from '../../../utils/accountDefaults';
import type { Account } from '../../../types/accounts';
import type { Bill, Loan, SavingsContribution } from '../../../types/obligations';
import type { Benefit, RetirementElection } from '../../../types/payroll';
import type { ViewMode } from '../../../types/viewMode';
import { fromDisplayAmount, toDisplayAmount } from '../../../utils/displayAmounts';
import { Alert, Button, InputWithPrefix, ViewModeSelector, PageHeader } from '../../_shared';
import PaySettingsModal from '../../modals/PaySettingsModal';
import { GlossaryTerm } from '../../modals/GlossaryModal';
import '../tabViews.shared.css';
import './PayBreakdown.css';

type AllocationCategory = {
  id: string;
  name: string;
  amount: number;
  isBill?: boolean;        // If true, this is an auto-calculated sum of bills for this account
  billCount?: number;      // Number of bills in this category (if isBill is true)
  isBenefit?: boolean;     // If true, this is an auto-calculated sum of account-sourced benefits
  benefitCount?: number;   // Number of benefits in this category (if isBenefit is true)
  isRetirement?: boolean;  // If true, this is an auto-calculated sum of account-sourced retirement
  retirementCount?: number; // Number of retirement contributions in this category (if isRetirement is true)
  isLoan?: boolean;        // If true, this is an auto-calculated sum of loans for this account
  loanCount?: number;      // Number of loans in this category (if isLoan is true)
  isSavings?: boolean;     // If true, this is an auto-calculated sum of savings/investments for this account
  savingsCount?: number;   // Number of savings/investment items in this category (if isSavings is true)
};

type AllocationAccount = Account & {
  allocationCategories: AllocationCategory[];
};

type AccountFunding = {
  account: AllocationAccount;
  totalAmount: number;
  categories: AllocationCategory[];
};

type ValidationMessage = {
  type: 'error' | 'warning';
  message: string;
};

interface PayBreakdownProps {
  displayMode: ViewMode;
  onDisplayModeChange: (mode: ViewMode) => void;
  onNavigateToBills?: (accountId: string) => void;
  onNavigateToSavings?: (accountId: string) => void;
  onNavigateToRetirement?: (accountId: string) => void;
  onNavigateToLoans?: (accountId: string) => void;
}

const PayBreakdown: React.FC<PayBreakdownProps> = ({ displayMode, onDisplayModeChange, onNavigateToBills, onNavigateToSavings, onNavigateToRetirement, onNavigateToLoans }) => {
  const { budgetData, calculatePaycheckBreakdown, updateBudgetData } = useBudget();
  const [editingAccountIds, setEditingAccountIds] = useState<Set<string>>(new Set());
  const [draftAccounts, setDraftAccounts] = useState<Map<string, AllocationAccount>>(new Map());
  const [validationMessages, setValidationMessages] = useState<Map<string, ValidationMessage>>(new Map());
  const [showPaySettingsModal, setShowPaySettingsModal] = useState(false);
  const [inputValues, setInputValues] = useState<Map<string, number>>(new Map()); // Local input values to prevent conversion flicker

  if (!budgetData) return null;

  const currency = budgetData.settings?.currency || 'USD';
  const paychecksPerYear = getPaychecksPerYear(budgetData.paySettings.payFrequency);
  const payFrequencyLabel = formatPayFrequencyLabel(budgetData.paySettings.payFrequency);

  // Get per-paycheck breakdown for allocation purposes
  const paycheckBreakdown = calculatePaycheckBreakdown();
  const annualBreakdown = calculateAnnualizedPayBreakdown(paycheckBreakdown, paychecksPerYear);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const normalizedAccounts = useMemo(
    () => normalizeAccounts(budgetData.accounts, budgetData.bills, budgetData.benefits, budgetData.retirement, budgetData.loans, budgetData.savingsContributions || [], budgetData.paySettings.payFrequency, paycheckBreakdown.grossPay),
    [budgetData.accounts, budgetData.bills, budgetData.benefits, budgetData.retirement, budgetData.loans, budgetData.savingsContributions, budgetData.paySettings.payFrequency, paycheckBreakdown.grossPay]
  );
  const allocationPlan = calculateAllocationPlan(normalizedAccounts, paycheckBreakdown.netPay);
  const leftoverPerPaycheck = allocationPlan.remaining;

  const displayBreakdown = calculateDisplayPayBreakdown(annualBreakdown, displayMode, paychecksPerYear);

  const preTaxDeductionCount = (budgetData.preTaxDeductions || []).filter((deduction) => deduction.amount > 0).length;
  const preTaxBenefitCount = (budgetData.benefits || []).filter((benefit) => (benefit.deductionSource || 'paycheck') === 'paycheck' && !benefit.isTaxable && benefit.amount > 0).length;
  const retirementContributionCount = (budgetData.retirement || []).filter((election) => election.enabled !== false && election.employeeContribution > 0).length;
  const totalPreTaxItemCount = preTaxDeductionCount + preTaxBenefitCount + retirementContributionCount;
  const postTaxBenefitCount = (budgetData.benefits || []).filter((benefit) => (benefit.deductionSource || 'paycheck') === 'paycheck' && benefit.isTaxable && benefit.amount > 0).length;
  const postTaxRetirementCount = (budgetData.retirement || []).filter((election) => (election.deductionSource || 'paycheck') === 'paycheck' && election.isPreTax === false && election.enabled !== false && election.employeeContribution > 0).length;
  const postTaxDeductionCount = postTaxBenefitCount + postTaxRetirementCount;

  // Calculate percentages for visual bar
  const grossPay = displayBreakdown.grossPay;
  const preTaxPct = (displayBreakdown.preTaxDeductions / grossPay) * 100;
  const taxPct = (displayBreakdown.totalTaxes / grossPay) * 100;
  const postTaxPct = (displayBreakdown.postTaxDeductions / grossPay) * 100;
  const netPct = (displayBreakdown.netPay / grossPay) * 100;

  const startAccountEdit = (accountId: string) => {
    const account = normalizedAccounts.find(acc => acc.id === accountId);
    if (account) {
      setDraftAccounts(prev => new Map(prev).set(accountId, { ...account }));
      setEditingAccountIds(prev => new Set(prev).add(accountId));
      // Clear input values when starting fresh edit
      setInputValues(new Map());
      // Clear any existing errors when starting fresh edit
      setValidationMessages(prev => {
        const next = new Map(prev);
        next.delete(accountId);
        return next;
      });
    }
  };

  const cancelAccountEdit = (accountId: string) => {
    setDraftAccounts(prev => {
      const next = new Map(prev);
      next.delete(accountId);
      return next;
    });
    setEditingAccountIds(prev => {
      const next = new Set(prev);
      next.delete(accountId);
      return next;
    });
    setValidationMessages(prev => {
      const next = new Map(prev);
      next.delete(accountId);
      return next;
    });
    setInputValues(new Map());
  };

  const saveAccountEdit = (accountId: string) => {
    const draftAccount = draftAccounts.get(accountId);
    if (!draftAccount) return;

    const cleanedCategories = draftAccount.allocationCategories
      .map((category) => ({
        ...category,
        name: category.name.trim(),
        amount: Number.isFinite(category.amount)
          ? Math.round(Math.max(0, category.amount) * 1_000_000_000_000) / 1_000_000_000_000
          : 0,
      }))
      .filter((category) => category.name.length > 0 && category.amount > 0);

    // Calculate total allocations with the new changes
    const totalAllocations = budgetData.accounts.reduce((sum, account) => {
      if (account.id === accountId) {
        // Use the cleaned categories for this account
        return sum + cleanedCategories.reduce((catSum, cat) => catSum + cat.amount, 0);
      } else {
        // Use existing categories for other accounts
        const existingCategories = account.allocationCategories || [];
        return sum + existingCategories.reduce((catSum, cat) => catSum + cat.amount, 0);
      }
    }, 0);

    const remaining = paycheckBreakdown.netPay - totalAllocations;

    // ERROR: Attempting to allocate more than available (negative remaining)
    if (remaining < 0) {
      const overage = Math.abs(remaining);
      setValidationMessages(prev => new Map(prev).set(
        accountId,
        {
          type: 'error',
          message: `This allocation exceeds your net pay by ${formatWithSymbol(overage, currency, { minimumFractionDigits: 2 })}. Please reduce allocations to stay within ${formatWithSymbol(paycheckBreakdown.netPay, currency, { minimumFractionDigits: 2 })}.`
        }
      ));
      return; // Prevent saving
    }

    // Clear any validation messages for this account
    setValidationMessages(prev => {
      const next = new Map(prev);
      next.delete(accountId);
      return next;
    });

    const updatedAccounts = budgetData.accounts.map((account) => {
      if (account.id !== accountId) return account;
      return {
        ...account,
        allocationCategories: cleanedCategories,
      };
    });

    updateBudgetData({ accounts: updatedAccounts });
    cancelAccountEdit(accountId);
  };

  const addCategory = (accountId: string) => {
    setDraftAccounts((prev) => {
      const account = prev.get(accountId);
      if (!account) return prev;
      const next = new Map(prev);
      next.set(accountId, {
        ...account,
        allocationCategories: [
          ...account.allocationCategories,
          {
            id: crypto.randomUUID(),
            name: '',
            amount: 0,
          },
        ],
      });
      return next;
    });
  };

  const updateCategory = (accountId: string, categoryId: string, updates: Partial<AllocationCategory>) => {
    setDraftAccounts((prev) => {
      const account = prev.get(accountId);
      if (!account) return prev;
      const next = new Map(prev);
      next.set(accountId, {
        ...account,
        allocationCategories: account.allocationCategories.map((category) =>
          category.id === categoryId ? { ...category, ...updates } : category
        ),
      });
      return next;
    });
    // Clear validation messages when user makes changes
    if (validationMessages.has(accountId)) {
      setValidationMessages(prev => {
        const next = new Map(prev);
        next.delete(accountId);
        return next;
      });
    }
  };

  const removeCategory = (accountId: string, categoryId: string) => {
    setDraftAccounts((prev) => {
      const account = prev.get(accountId);
      if (!account) return prev;
      const next = new Map(prev);
      next.set(accountId, {
        ...account,
        allocationCategories: account.allocationCategories.filter((category) => category.id !== categoryId),
      });
      return next;
    });
  };

  return (
    <div className="tab-view pay-breakdown">
      <PageHeader
        title="Pay Breakdown"
        subtitle="See where your paycheck goes from gross to net"
        actions={
          <>
            <ViewModeSelector
              mode={displayMode}
              onChange={onDisplayModeChange}
              hintText={`Current setting: ${payFrequencyLabel}`}
              hintVisibleModes={['paycheck']}
              reserveHintSpace
            />
            <Button variant="secondary" onClick={() => setShowPaySettingsModal(true)}>
              ⚙️ Pay Settings
            </Button>
          </>
        }
      />

      <PaySettingsModal
        isOpen={showPaySettingsModal}
        onClose={() => setShowPaySettingsModal(false)}
      />

      {/* Visual Bar */}
      <div className="breakdown-bar">
        <h3>Your Pay Breakdown</h3>
        <div className="bar-container">
          {displayBreakdown.preTaxDeductions > 0 && (
            <div 
              className="bar-segment pretax-segment" 
              style={{ width: `${preTaxPct}%` }}
              title={`Pre-Tax: ${formatWithSymbol(displayBreakdown.preTaxDeductions, currency, { maximumFractionDigits: 0 })} (${preTaxPct.toFixed(1)}%)`}
            >
              {preTaxPct > 5 && <span>{preTaxPct.toFixed(1)}%</span>}
            </div>
          )}
          <div 
            className="bar-segment tax-segment" 
            style={{ width: `${taxPct}%` }}
            title={`Taxes: ${formatWithSymbol(displayBreakdown.totalTaxes, currency, { maximumFractionDigits: 0 })} (${taxPct.toFixed(1)}%)`}
          >
            <span>{taxPct.toFixed(1)}%</span>
          </div>
          {displayBreakdown.postTaxDeductions > 0 && (
            <div 
              className="bar-segment posttax-segment" 
              style={{ width: `${postTaxPct}%` }}
              title={`Post-Tax: ${formatWithSymbol(displayBreakdown.postTaxDeductions, currency, { maximumFractionDigits: 0 })} (${postTaxPct.toFixed(1)}%)`}
            >
              {postTaxPct > 5 && <span>{postTaxPct.toFixed(1)}%</span>}
            </div>
          )}
          <div 
            className="bar-segment net-segment" 
            style={{ width: `${netPct}%` }}
            title={`Net Pay: ${formatWithSymbol(displayBreakdown.netPay, currency, { maximumFractionDigits: 0 })} (${netPct.toFixed(1)}%)`}
          >
            <span>{netPct.toFixed(1)}%</span>
          </div>
        </div>
        <div className="bar-labels">
          {displayBreakdown.preTaxDeductions > 0 && (
            <div className="bar-label pretax-label">
              <span className="label-dot pretax-dot"></span>
              Pre-Tax Deductions
            </div>
          )}
          <div className="bar-label tax-label">
            <span className="label-dot tax-dot"></span>
            Taxes
          </div>
          {displayBreakdown.postTaxDeductions > 0 && (
            <div className="bar-label posttax-label">
              <span className="label-dot posttax-dot"></span>
              Post-Tax Deductions
            </div>
          )}
          <div className="bar-label net-label">
            <span className="label-dot net-dot"></span>
            Take Home
          </div>
        </div>
      </div>

      {/* Visual Flow */}
      <div className="visual-flow">
        <div className="flow-stage">
          <div className="stage-box gross-box">
            <h3><GlossaryTerm termId="gross-pay">Gross Pay</GlossaryTerm></h3>
            <div className="stage-amount">{formatWithSymbol(displayBreakdown.grossPay, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stage-detail">
              {budgetData.paySettings.payType === 'salary' 
                ? `${formatWithSymbol(budgetData.paySettings.annualSalary || 0, currency, { maximumFractionDigits: 0 })}/year`
                : `${getCurrencySymbol(currency)}${budgetData.paySettings.hourlyRate}/hr × ${budgetData.paySettings.hoursPerPayPeriod} hrs`
              }
            </div>
          </div>
        </div>

        {displayBreakdown.preTaxDeductions > 0 && (
          <div className="flow-stage">
            <div className="stage-box deduction-box">
              <h3><GlossaryTerm termId="pre-tax-deduction">Pre-Tax Deductions</GlossaryTerm></h3>
              <div className="stage-amount negative">-{formatWithSymbol(displayBreakdown.preTaxDeductions, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="stage-detail">
                {totalPreTaxItemCount} deduction(s)
              </div>
            </div>
          </div>
        )}

        <div className="flow-stage">
          <div className="stage-box taxable-box">
            <h3><GlossaryTerm termId="taxable-income">Taxable Income</GlossaryTerm></h3>
            <div className="stage-amount">{formatWithSymbol(displayBreakdown.taxableIncome, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stage-detail">Subject to taxes</div>
          </div>
        </div>

        <div className="flow-stage">
          <div className="stage-box taxes-box">
            <h3><GlossaryTerm termId="withholding">Total Taxes</GlossaryTerm></h3>
            <div className="stage-amount negative">-{formatWithSymbol(displayBreakdown.totalTaxes, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stage-breakdown">
              {displayBreakdown.taxLineAmounts.map(line => (
                <div key={line.id} className="breakdown-item">
                  <span>{line.label} ({budgetData.taxSettings.taxLines.find(l => l.id === line.id)?.rate ?? 0}%)</span>
                  <span>{formatWithSymbol(line.amount, currency, { maximumFractionDigits: 2 })}</span>
                </div>
              ))}
              {displayBreakdown.additionalWithholding > 0 && (
                <div className="breakdown-item">
                  <span>Additional Withholding</span>
                  <span>{formatWithSymbol(displayBreakdown.additionalWithholding, currency, { maximumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          </div>
          
        </div>

        {displayBreakdown.postTaxDeductions > 0 && (
          <div className="flow-stage">
            <div className="stage-box postax-box">
              <h3><GlossaryTerm termId="post-tax-deduction">Post-Tax Deductions</GlossaryTerm></h3>
              <div className="stage-amount negative">-{formatWithSymbol(displayBreakdown.postTaxDeductions, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="stage-detail">
                {postTaxDeductionCount} deduction(s)
              </div>
            </div>
          </div>
        )}

        <div className="flow-stage">
          <div className="stage-box net-box">
            <h3><GlossaryTerm termId="net-pay">Net Pay</GlossaryTerm> (Take Home)</h3>
            <div className="stage-amount">{formatWithSymbol(displayBreakdown.netPay, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stage-detail">{netPct.toFixed(1)}% of gross</div>
          </div>
        </div>
      </div>

      {/* Waterfall Breakdown with Per-Account Editing */}
      {budgetData.accounts.length > 0 && (
        <div className="waterfall-breakdown">
          <div className="waterfall-header">
            <h3>After-Tax <GlossaryTerm termId="allocation">Allocations</GlossaryTerm></h3>
          </div>
          
          <div className="waterfall-table">
            <div className="waterfall-row waterfall-header-row">
              <span className="waterfall-label">Net Pay</span>
              <span className="waterfall-amount">{formatWithSymbol(displayBreakdown.netPay, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            {allocationPlan.accountFunding.map((fundingItem) => {
              const accountAmount = toDisplayAmount(fundingItem.totalAmount, paychecksPerYear, displayMode);
              const isEditing = editingAccountIds.has(fundingItem.account.id);
              const displayAccount = isEditing ? draftAccounts.get(fundingItem.account.id) : fundingItem.account;
              
              if (!displayAccount) return null;
              
              return (
                <React.Fragment key={fundingItem.account.id}>
                  <div className="waterfall-row waterfall-account-row">
                    <span className="waterfall-label">
                      <span className="account-icon-small">{fundingItem.account.icon || getDefaultAccountIcon(fundingItem.account.type)}</span>
                      {fundingItem.account.name}
                    </span>
                    {!isEditing ? (
                      <Button className="allocation-secondary-btn" variant="secondary" size="small" onClick={() => startAccountEdit(fundingItem.account.id)}>Edit</Button>
                    ) : (
                      <div className="paybreakdown-account-edit-actions">
                        <Button className="allocation-secondary-btn" variant="secondary" size="small" onClick={() => cancelAccountEdit(displayAccount.id)}>Cancel</Button>
                        <Button variant="primary" size="small" onClick={() => saveAccountEdit(displayAccount.id)}>Save</Button>
                      </div>
                    )
                    }
                    <span className="waterfall-amount">{formatWithSymbol(accountAmount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  {isEditing ? (
                    <div className="allocation-edit-section">
                      <div className="edit-mode-info">
                        <span className="info-icon">ℹ️</span>
                        <span>Editing amounts for {getDisplayModeLabel(displayMode)} view</span>
                      </div>
                      {displayAccount.allocationCategories.length === 0 && (
                        <div className="waterfall-row waterfall-category-row">
                          <p className="category-empty">No allocations yet. Add allocations to allocate funds to this account.</p>
                        </div>
                      )}

                      {[...displayAccount.allocationCategories].sort((a, b) => b.amount - a.amount).map((category) => (
                        <div key={category.id} className={`waterfall-row waterfall-category-row category-edit-row ${category.isBill || category.isBenefit || category.isRetirement || category.isLoan || category.isSavings ? 'bill-category-row' : ''}`}>
                          {category.isBill || category.isBenefit || category.isRetirement || category.isLoan || category.isSavings ? (
                            <>
                              <input
                                type="text"
                                value={category.name}
                                onChange={(e) => updateCategory(displayAccount.id, category.id, { name: e.target.value })}
                                placeholder={category.isBill ? 'Bills category name' : (category.isBenefit ? 'Deductions category name' : (category.isRetirement ? 'Retirement category name' : (category.isLoan ? 'Loan Payments category name' : 'Savings category name')))}
                                className="category-name-input"
                              />
                              <div className="bill-amount-display">
                                {formatWithSymbol(toDisplayAmount(category.amount, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                {category.isBill && category.billCount && category.billCount > 0 && (
                                  <span className="bill-count-badge">{category.billCount}</span>
                                )}
                                {category.isBenefit && category.benefitCount && category.benefitCount > 0 && (
                                  <span className="bill-count-badge">{category.benefitCount}</span>
                                )}
                                {category.isRetirement && category.retirementCount && category.retirementCount > 0 && (
                                  <span className="bill-count-badge">{category.retirementCount}</span>
                                )}
                                {category.isLoan && category.loanCount && category.loanCount > 0 && (
                                  <span className="bill-count-badge">{category.loanCount}</span>
                                )}
                                {category.isSavings && category.savingsCount && category.savingsCount > 0 && (
                                  <span className="bill-count-badge">{category.savingsCount}</span>
                                )}
                              </div>
                              <div className="category-spacer"></div>
                            </>
                          ) : (
                            <>
                              <input
                                type="text"
                                value={category.name}
                                onChange={(e) => updateCategory(displayAccount.id, category.id, { name: e.target.value })}
                                placeholder="Item name"
                                className="category-name-input"
                              />
                              <InputWithPrefix
                                prefix={getCurrencySymbol(currency)}
                                type="number"
                                min="0"
                                step="0.01"
                                value={String(inputValues.has(category.id) ? inputValues.get(category.id) : toDisplayAmount(category.amount, paychecksPerYear, displayMode))}
                                onChange={(e) => setInputValues(prev => new Map(prev).set(category.id, parseFloat(e.target.value) || 0))}
                                onBlur={(e) => {
                                  const displayValue = parseFloat(e.target.value) || 0;
                                  updateCategory(displayAccount.id, category.id, { amount: fromDisplayAmount(displayValue, paychecksPerYear, displayMode) });
                                  setInputValues(prev => {
                                    const next = new Map(prev);
                                    next.delete(category.id);
                                    return next;
                                  });
                                }}
                              />
                              <Button className="category-remove-btn" variant="icon" onClick={() => removeCategory(displayAccount.id, category.id)} title="Remove item">✕</Button>
                            </>
                          )}
                        </div>
                      ))}

                      <div className="waterfall-row waterfall-category-row category-actions-row">
                        <Button className="allocation-secondary-btn" variant="secondary" size="small" onClick={() => addCategory(displayAccount.id)}>+ Add Item</Button>
                      </div>

                      {validationMessages.has(displayAccount.id) && (
                        <div className="waterfall-row waterfall-category-row validation-message-row">
                          <Alert type={validationMessages.get(displayAccount.id)?.type}>
                            {validationMessages.get(displayAccount.id)?.type === 'error' ? '🚫' : '⚠️'} {validationMessages.get(displayAccount.id)?.message}
                          </Alert>
                        </div>
                      )}
                    </div>
                  ) : (
                    fundingItem.categories.length > 0 && [...fundingItem.categories].sort((a, b) => b.amount - a.amount).map((category) => (
                      <div key={category.id} className={`waterfall-row waterfall-category-row ${category.isBill || category.isBenefit || category.isRetirement || category.isLoan || category.isSavings ? 'bill-category-view' : ''}`}>
                        {category.isBill || category.isBenefit || category.isRetirement || category.isLoan || category.isSavings ? (
                          <button
                            className="waterfall-label category-label category-button"
                            onClick={() => category.isBill
                              ? onNavigateToBills?.(fundingItem.account.id)
                              : (category.isBenefit
                                ? onNavigateToBills?.(fundingItem.account.id)
                                : (category.isRetirement
                                  ? onNavigateToRetirement?.(fundingItem.account.id)
                                  : (category.isLoan
                                    ? onNavigateToLoans?.(fundingItem.account.id)
                                    : onNavigateToSavings?.(fundingItem.account.id))))}
                          >
                            {category.name}
                            {category.isBill && category.billCount && category.billCount > 0 && (
                              <span className="bill-count-badge">{category.billCount}</span>
                            )}
                            {category.isBenefit && category.benefitCount && category.benefitCount > 0 && (
                              <span className="bill-count-badge">{category.benefitCount}</span>
                            )}
                            {category.isRetirement && category.retirementCount && category.retirementCount > 0 && (
                              <span className="bill-count-badge">{category.retirementCount}</span>
                            )}
                            {category.isLoan && category.loanCount && category.loanCount > 0 && (
                              <span className="bill-count-badge">{category.loanCount}</span>
                            )}
                            {category.isSavings && category.savingsCount && category.savingsCount > 0 && (
                              <span className="bill-count-badge">{category.savingsCount}</span>
                            )}
                          </button>
                        ) : (
                          <span className="waterfall-label category-label">
                            {category.name}
                          </span>
                        )}
                        <span className="waterfall-amount">
                          {category.amount === 0 ? '-' : formatWithSymbol(toDisplayAmount(category.amount, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))
                  )}
                </React.Fragment>
              );
            })}

            <div className={`waterfall-row waterfall-footer-row ${leftoverPerPaycheck < 0 ? 'negative-remaining' : ''}`}>
              <span className="waterfall-label"><GlossaryTerm termId="residual-amount">All that remains</GlossaryTerm> for spending</span>
              <span className={`waterfall-amount ${leftoverPerPaycheck < 0 ? 'negative-remaining' : ''}`}>{formatWithSymbol(toDisplayAmount(leftoverPerPaycheck, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {leftoverPerPaycheck < 0 && (
              <div className="waterfall-alert-row">
                <Alert type="error">
                  Your allocations exceed net pay by {formatWithSymbol(toDisplayAmount(Math.abs(leftoverPerPaycheck), paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2 })}. Reduce allocations to avoid a negative Remaining balance.
                </Alert>
              </div>
            )}
            {leftoverPerPaycheck >= 0 && leftoverPerPaycheck < (budgetData.paySettings.minLeftover || 0) && (budgetData.paySettings.minLeftover || 0) > 0 && (
              <div className="waterfall-alert-row">
                <Alert type="warning">
                  You are {formatWithSymbol(toDisplayAmount((budgetData.paySettings.minLeftover || 0) - leftoverPerPaycheck, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2 })} below your target minimum of {formatWithSymbol(toDisplayAmount(budgetData.paySettings.minLeftover || 0, paychecksPerYear, displayMode), currency, { minimumFractionDigits: 2 })}
                </Alert>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function calculateBillPerPaycheck(bill: Bill, payFrequency: string): number {
  const paychecksPerYear = getPaychecksPerYear(payFrequency);
  const billsPerYear = getBillFrequencyOccurrencesPerYear(bill.frequency, bill.customFrequencyDays);
  
  // Calculate average per paycheck: (total per year) / (paychecks per year)
  const totalPerYear = bill.amount * billsPerYear;
  return roundUpToCent(totalPerYear / paychecksPerYear);
}

function normalizeAccounts(
  accounts: Account[],
  bills: Bill[],
  benefits: Benefit[],
  retirement: RetirementElection[],
  loans: Loan[],
  savingsContributions: SavingsContribution[],
  payFrequency: string,
  grossPayPerPaycheck: number
): AllocationAccount[] {
  return accounts.map((account) => {
    // Check if there are existing auto-categories with custom names
    const existingBillCategory = (account.allocationCategories || []).find(
      cat => cat.id.startsWith('__bills_')
    );
    const existingBenefitCategory = (account.allocationCategories || []).find(
      cat => cat.id.startsWith('__benefits_')
    );
    const existingRetirementCategory = (account.allocationCategories || []).find(
      cat => cat.id.startsWith('__retirement_')
    );
    const existingSavingsCategory = (account.allocationCategories || []).find(
      cat => cat.id.startsWith('__savings_')
    );

    // Get user-defined categories
    const userCategories = (account.allocationCategories || [])
      .filter(cat => !cat.id.startsWith('__bills_') && !cat.id.startsWith('__benefits_') && !cat.id.startsWith('__retirement_') && !cat.id.startsWith('__loans_') && !cat.id.startsWith('__savings_'))
      .map((category) => ({
        id: category.id,
        name: category.name,
        amount: category.amount,
        isBill: false,
        isBenefit: false,
        isRetirement: false,
        isSavings: false,
      }));

    // Get bills for this account and calculate total
    const accountBills = bills.filter(bill => bill.accountId === account.id && bill.enabled !== false);

    // Get account-sourced benefits for this account and calculate total
    const accountBenefits = benefits.filter(
      benefit => benefit.deductionSource === 'account' && benefit.sourceAccountId === account.id
    );

    // Get account-sourced retirement contributions for this account and calculate total
    const accountRetirement = retirement.filter(
      election => election.enabled !== false && election.deductionSource === 'account' && election.sourceAccountId === account.id
    );

    // Get account-funded savings/investment contributions for this account
    const accountSavings = savingsContributions.filter(
      item => item.accountId === account.id && item.enabled !== false
    );

    const autoCategories: AllocationCategory[] = [];
    
    if (accountBills.length > 0 || accountBenefits.length > 0) {
      const billTotal = accountBills.reduce((sum, bill) => {
        const billPerPaycheck = calculateBillPerPaycheck(bill, payFrequency);
        return sum + billPerPaycheck;
      }, 0);

      const deductionsTotal = accountBenefits.reduce((sum, benefit) => {
        const amountPerPaycheck = benefit.isPercentage
          ? roundUpToCent((grossPayPerPaycheck * benefit.amount) / 100)
          : roundUpToCent(benefit.amount);
        return sum + amountPerPaycheck;
      }, 0);

      const defaultBillsTitle: string[] = [];
      if (accountBills.length > 0) {
        defaultBillsTitle.push('Bills');
      }
      if (accountBenefits.length > 0) {
        defaultBillsTitle.push('Deductions');
      }
      const defaultBillsName = defaultBillsTitle.join(' & ') || 'Bills';

      autoCategories.push({
        id: `__bills_${account.id}`,
        name: existingBillCategory?.name || existingBenefitCategory?.name || defaultBillsName,
        amount: roundUpToCent(billTotal + deductionsTotal),
        isBill: true,
        billCount: accountBills.length + accountBenefits.length,
      });
    }

    if (accountRetirement.length > 0) {
      const retirementTotal = accountRetirement.reduce((sum, election) => {
        const amountPerPaycheck = election.employeeContributionIsPercentage
          ? roundToCent((grossPayPerPaycheck * election.employeeContribution) / 100)
          : roundToCent(election.employeeContribution);
        return sum + amountPerPaycheck;
      }, 0);

      autoCategories.push({
        id: `__retirement_${account.id}`,
        name: existingRetirementCategory?.name || 'Retirement Plans',
        amount: roundUpToCent(retirementTotal),
        isRetirement: true,
        retirementCount: accountRetirement.length,
      });
    }

    if (accountSavings.length > 0) {
      const paychecksPerYear = getPaychecksPerYear(payFrequency);
      const savingsTotal = accountSavings.reduce((sum, item) => {
        const occurrencesPerYear = getSavingsFrequencyOccurrencesPerYear(item.frequency);
        const perPaycheck = occurrencesPerYear === paychecksPerYear
          ? roundUpToCent(item.amount)
          : roundUpToCent((item.amount * occurrencesPerYear) / paychecksPerYear);
        return sum + perPaycheck;
      }, 0);

      // Set a default title based on if there are savings, investments, or both
      const defaultSavingsTitle: string[] = [];
      if (accountSavings.some((s) => s.type === 'savings')) {
        defaultSavingsTitle.push('Savings');
      }
      if (accountSavings.some((s) => s.type === 'investment')) {
        defaultSavingsTitle.push('Investment');
      }
      const defaultSavingsName = defaultSavingsTitle.join(' & ');

      autoCategories.push({
        id: `__savings_${account.id}`,
        name: existingSavingsCategory?.name || defaultSavingsName + ' Contributions',
        amount: roundUpToCent(savingsTotal),
        isSavings: true,
        savingsCount: accountSavings.length,
      });
    }

    // Get loans for this account and calculate total
    const accountLoans = loans.filter(loan => loan.accountId === account.id && loan.enabled !== false);
    const existingLoanCategory = (account.allocationCategories || []).find(
      cat => cat.id.startsWith('__loans_')
    );

    if (accountLoans.length > 0) {
      const paychecksPerYear = getPaychecksPerYear(payFrequency);
      const loanTotal = accountLoans.reduce((sum, loan) => {
        const perPaycheckAmount = (loan.monthlyPayment * 12) / paychecksPerYear;
        return sum + perPaycheckAmount;
      }, 0);

      autoCategories.push({
        id: `__loans_${account.id}`,
        name: existingLoanCategory?.name || 'Loan Payments',
        amount: roundUpToCent(loanTotal),
        isLoan: true,
        loanCount: accountLoans.length,
      });
    }

    return {
      ...account,
      allocationCategories: [...userCategories, ...autoCategories],
    };
  });
}


function calculateAllocationPlan(accounts: AllocationAccount[], netPay: number): { accountFunding: AccountFunding[]; remaining: number } {
  const accountFunding: AccountFunding[] = accounts.map((account) => {
    const categories = account.allocationCategories.map((category) => ({
      id: category.id,
      name: category.name,
      amount: Math.max(0, category.amount || 0),
      isBill: category.isBill,
      billCount: category.billCount,
      isBenefit: category.isBenefit,
      benefitCount: category.benefitCount,
      isRetirement: category.isRetirement,
      retirementCount: category.retirementCount,
      isLoan: category.isLoan,
      loanCount: category.loanCount,
      isSavings: category.isSavings,
      savingsCount: category.savingsCount,
    }));

    const totalAmount = categories.reduce((sum, cat) => sum + cat.amount, 0);

    return {
      account,
      totalAmount,
      categories,
    };
  });

  const totalAllocated = accountFunding.reduce((sum, item) => sum + item.totalAmount, 0);
  const remaining = netPay - totalAllocated;

  return {
    accountFunding,
    remaining,
  };
}

export default PayBreakdown;
