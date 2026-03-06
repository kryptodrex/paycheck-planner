import React, { useMemo, useState } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import { formatWithSymbol, getCurrencySymbol } from '../../utils/currency';
import { roundUpToCent } from '../../utils/money';
import type { Account, Bill, Benefit, RetirementElection } from '../../types/auth';
import { Alert, Button, InputWithPrefix } from '../shared';
import PaySettingsModal from '../PaySettingsModal';
import './PayBreakdown.css';

const getDefaultIconForType = (type: Account['type']): string => {
  switch (type) {
    case 'checking':
      return '💳';
    case 'savings':
      return '💰';
    case 'investment':
      return '📈';
    case 'other':
      return '💵';
    default:
      return '💰';
  }
};

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
  displayMode: 'paycheck' | 'monthly' | 'yearly';
  onDisplayModeChange: (mode: 'paycheck' | 'monthly' | 'yearly') => void;
  onNavigateToBills?: (accountId: string) => void;
  onNavigateToBenefits?: (accountId: string) => void;
  onNavigateToRetirement?: (accountId: string) => void;
}

const PayBreakdown: React.FC<PayBreakdownProps> = ({ displayMode, onDisplayModeChange, onNavigateToBills, onNavigateToBenefits, onNavigateToRetirement }) => {
  const { budgetData, calculatePaycheckBreakdown, updateBudgetData } = useBudget();
  const [editingAccountIds, setEditingAccountIds] = useState<Set<string>>(new Set());
  const [draftAccounts, setDraftAccounts] = useState<Map<string, AllocationAccount>>(new Map());
  const [validationMessages, setValidationMessages] = useState<Map<string, ValidationMessage>>(new Map());
  const [showPaySettingsModal, setShowPaySettingsModal] = useState(false);

  if (!budgetData) return null;

  const currency = budgetData.settings?.currency || 'USD';
  const paychecksPerYear = getPaychecksPerYear(budgetData.paySettings.payFrequency);
  
  // Calculate yearly breakdown from configured salary/hourly rate
  const yearlyBreakdown = useMemo(() => {
    const { paySettings, benefits = [] } = budgetData;
    
    // Calculate yearly gross pay
    let yearlyGrossPay = 0;
    if (paySettings.payType === 'salary') {
      yearlyGrossPay = paySettings.annualSalary || 0;
    } else {
      yearlyGrossPay = (paySettings.hourlyRate || 0) * (paySettings.hoursPerPayPeriod || 0) * paychecksPerYear;
    }

    // Get per-paycheck breakdown to get tax rates and deduction information
    const paycheckBreakdown = calculatePaycheckBreakdown();
    
    // Calculate yearly values by scaling the per-paycheck percentages
    const yearlyGrossPayCalc = yearlyGrossPay;
    const yearlyPreTax = roundUpToCent(paycheckBreakdown.preTaxDeductions * paychecksPerYear);
    const yearlyTaxableIncome = roundUpToCent(yearlyGrossPayCalc - yearlyPreTax);
    
    // Use the per-paycheck breakdown to get the tax calculation rates and apply them to yearly
    const yearlyFederalTax = roundUpToCent(paycheckBreakdown.federalTax * paychecksPerYear);
    const yearlyStateTax = roundUpToCent(paycheckBreakdown.stateTax * paychecksPerYear);
    const yearlySocialSecurity = roundUpToCent(paycheckBreakdown.socialSecurity * paychecksPerYear);
    const yearlyMedicare = roundUpToCent(paycheckBreakdown.medicare * paychecksPerYear);
    const yearlyAdditionalWithholding = roundUpToCent(paycheckBreakdown.additionalWithholding * paychecksPerYear);
    const yearlyTotalTaxes = roundUpToCent(yearlyFederalTax + yearlyStateTax + yearlySocialSecurity + yearlyMedicare + yearlyAdditionalWithholding);
    
    // Calculate post-tax paycheck deductions only (account-sourced benefits are handled in account allocations)
    let yearlyPostTaxDeductions = 0;
    (benefits || []).forEach((benefit) => {
      if ((benefit.deductionSource || 'paycheck') === 'paycheck' && benefit.isTaxable) {
        if (benefit.isPercentage) {
          yearlyPostTaxDeductions += roundUpToCent((yearlyGrossPayCalc * benefit.amount) / 100);
        } else {
          yearlyPostTaxDeductions += roundUpToCent(benefit.amount * paychecksPerYear);
        }
      }
    });
    
    const yearlyNetPayBeforeTax = roundUpToCent(yearlyGrossPayCalc - yearlyPreTax - yearlyTotalTaxes);
    const yearlyNetPay = roundUpToCent(Math.max(0, yearlyNetPayBeforeTax - yearlyPostTaxDeductions));

    return {
      grossPay: yearlyGrossPayCalc,
      preTaxDeductions: yearlyPreTax,
      taxableIncome: yearlyTaxableIncome,
      federalTax: yearlyFederalTax,
      stateTax: yearlyStateTax,
      socialSecurity: yearlySocialSecurity,
      medicare: yearlyMedicare,
      additionalWithholding: yearlyAdditionalWithholding,
      totalTaxes: yearlyTotalTaxes,
      postTaxDeductions: yearlyPostTaxDeductions,
      netPay: yearlyNetPay,
    };
  }, [budgetData, paychecksPerYear]);

  // Get per-paycheck breakdown for allocation purposes
  const paycheckBreakdown = calculatePaycheckBreakdown();
  const normalizedAccounts = useMemo(
    () => normalizeAccounts(budgetData.accounts, budgetData.bills, budgetData.benefits, budgetData.retirement, budgetData.paySettings.payFrequency, paycheckBreakdown.grossPay),
    [budgetData.accounts, budgetData.bills, budgetData.benefits, budgetData.retirement, budgetData.paySettings.payFrequency, paycheckBreakdown.grossPay]
  );
  const allocationPlan = calculateAllocationPlan(normalizedAccounts, paycheckBreakdown.netPay);
  const leftoverPerPaycheck = allocationPlan.remaining;

  // Calculate display breakdown based on view mode
  const displayDivisor = displayMode === 'paycheck' ? paychecksPerYear : (displayMode === 'monthly' ? 12 : 1);
  const displayBreakdown = {
    grossPay: roundUpToCent(yearlyBreakdown.grossPay / displayDivisor),
    preTaxDeductions: roundUpToCent(yearlyBreakdown.preTaxDeductions / displayDivisor),
    taxableIncome: roundUpToCent(yearlyBreakdown.taxableIncome / displayDivisor),
    federalTax: roundUpToCent(yearlyBreakdown.federalTax / displayDivisor),
    stateTax: roundUpToCent(yearlyBreakdown.stateTax / displayDivisor),
    socialSecurity: roundUpToCent(yearlyBreakdown.socialSecurity / displayDivisor),
    medicare: roundUpToCent(yearlyBreakdown.medicare / displayDivisor),
    additionalWithholding: roundUpToCent(yearlyBreakdown.additionalWithholding / displayDivisor),
    totalTaxes: roundUpToCent(yearlyBreakdown.totalTaxes / displayDivisor),
    postTaxDeductions: roundUpToCent(yearlyBreakdown.postTaxDeductions / displayDivisor),
    netPay: roundUpToCent(yearlyBreakdown.netPay / displayDivisor),
  };

  const preTaxDeductionCount = (budgetData.preTaxDeductions || []).filter((deduction) => deduction.amount > 0).length;
  const preTaxBenefitCount = (budgetData.benefits || []).filter((benefit) => (benefit.deductionSource || 'paycheck') === 'paycheck' && !benefit.isTaxable && benefit.amount > 0).length;
  const retirementContributionCount = (budgetData.retirement || []).filter((election) => election.employeeContribution > 0).length;
  const totalPreTaxItemCount = preTaxDeductionCount + preTaxBenefitCount + retirementContributionCount;
  const postTaxDeductionCount = (budgetData.benefits || []).filter((benefit) => (benefit.deductionSource || 'paycheck') === 'paycheck' && benefit.isTaxable && benefit.amount > 0).length;

  // Helper function to convert per-paycheck values to display values based on display mode
  const toDisplayAmount = (paycheckAmount: number) => {
    if (displayMode === 'paycheck') return paycheckAmount;
    if (displayMode === 'monthly') return paycheckAmount * (paychecksPerYear / 12);
    return paycheckAmount * paychecksPerYear;
  };

  // Calculate percentages for visual bar
  const grossPay = displayBreakdown.grossPay;
  const preTaxPct = (displayBreakdown.preTaxDeductions / grossPay) * 100;
  const taxPct = (displayBreakdown.totalTaxes / grossPay) * 100;
  const netPct = (displayBreakdown.netPay / grossPay) * 100;

  const startAccountEdit = (accountId: string) => {
    const account = normalizedAccounts.find(acc => acc.id === accountId);
    if (account) {
      setDraftAccounts(prev => new Map(prev).set(accountId, { ...account }));
      setEditingAccountIds(prev => new Set(prev).add(accountId));
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
  };

  const saveAccountEdit = (accountId: string) => {
    const draftAccount = draftAccounts.get(accountId);
    if (!draftAccount) return;

    const cleanedCategories = draftAccount.allocationCategories
      .map((category) => ({
        ...category,
        name: category.name.trim(),
        amount: Number.isFinite(category.amount) ? roundUpToCent(Math.max(0, category.amount)) : 0,
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
    <div className="pay-breakdown">
      <div className="breakdown-header">
        <div>
          <h2>Pay Breakdown</h2>
          <p>See where your paycheck goes from gross to net</p>
        </div>
        <div className="breakdown-header-actions">
          <Button variant="secondary" onClick={() => setShowPaySettingsModal(true)}>
            ⚙️ Pay Settings
          </Button>
          <div className="view-mode-selector">
            <button 
              className={displayMode === 'paycheck' ? 'active' : ''}
              onClick={() => onDisplayModeChange('paycheck')}
            >
              Per Paycheck
            </button>
            <button 
              className={displayMode === 'monthly' ? 'active' : ''}
              onClick={() => onDisplayModeChange('monthly')}
            >
              Monthly
            </button>
            <button 
              className={displayMode === 'yearly' ? 'active' : ''}
              onClick={() => onDisplayModeChange('yearly')}
            >
              Yearly
            </button>
          </div>
        </div>
      </div>

      <PaySettingsModal
        isOpen={showPaySettingsModal}
        onClose={() => setShowPaySettingsModal(false)}
      />

      {/* Visual Flow */}
      <div className="visual-flow">
        <div className="flow-stage">
          <div className="stage-label">START</div>
          <div className="stage-box gross-box">
            <h3>Gross Pay</h3>
            <div className="stage-amount">{formatWithSymbol(displayBreakdown.grossPay, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stage-detail">
              {budgetData.paySettings.payType === 'salary' 
                ? `${formatWithSymbol(budgetData.paySettings.annualSalary || 0, currency, { maximumFractionDigits: 0 })}/year`
                : `${getCurrencySymbol(currency)}${budgetData.paySettings.hourlyRate}/hr × ${budgetData.paySettings.hoursPerPayPeriod} hrs`
              }
            </div>
          </div>
          <div className="stage-arrow">↓</div>
        </div>

        {displayBreakdown.preTaxDeductions > 0 && (
          <div className="flow-stage">
            <div className="stage-box deduction-box">
              <h3>Pre-Tax Deductions</h3>
              <div className="stage-amount negative">-{formatWithSymbol(displayBreakdown.preTaxDeductions, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="stage-detail">
                {totalPreTaxItemCount} deduction(s)
              </div>
            </div>
            <div className="stage-arrow">↓</div>
          </div>
        )}

        <div className="flow-stage">
          <div className="stage-box taxable-box">
            <h3>Taxable Income</h3>
            <div className="stage-amount">{formatWithSymbol(displayBreakdown.taxableIncome, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stage-detail">Subject to taxes</div>
          </div>
          <div className="stage-arrow">↓</div>
        </div>

        <div className="flow-stage">
          <div className="stage-box taxes-box">
            <h3>Total Taxes</h3>
            <div className="stage-amount negative">-{formatWithSymbol(displayBreakdown.totalTaxes, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stage-breakdown">
              <div className="breakdown-item">
                <span>Federal Tax ({budgetData.taxSettings.federalTaxRate}%)</span>
                <span>{formatWithSymbol(displayBreakdown.federalTax, currency, { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="breakdown-item">
                <span>State Tax ({budgetData.taxSettings.stateTaxRate}%)</span>
                <span>{formatWithSymbol(displayBreakdown.stateTax, currency, { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="breakdown-item">
                <span>Social Security (6.2%)</span>
                <span>{formatWithSymbol(displayBreakdown.socialSecurity, currency, { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="breakdown-item">
                <span>Medicare (1.45%)</span>
                <span>{formatWithSymbol(displayBreakdown.medicare, currency, { maximumFractionDigits: 2 })}</span>
              </div>
              {displayBreakdown.additionalWithholding > 0 && (
                <div className="breakdown-item">
                  <span>Additional Withholding</span>
                  <span>{formatWithSymbol(displayBreakdown.additionalWithholding, currency, { maximumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>
          </div>
          <div className="stage-arrow">↓</div>
        </div>

        {displayBreakdown.postTaxDeductions > 0 && (
          <div className="flow-stage">
            <div className="stage-box postax-box">
              <h3>Post-Tax Deductions</h3>
              <div className="stage-amount negative">-{formatWithSymbol(displayBreakdown.postTaxDeductions, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="stage-detail">
                {postTaxDeductionCount} deduction(s)
              </div>
            </div>
            <div className="stage-arrow">↓</div>
          </div>
        )}

        <div className="flow-stage">
          <div className="stage-label">RESULT</div>
          <div className="stage-box net-box">
            <h3>Net Pay (Take Home)</h3>
            <div className="stage-amount">{formatWithSymbol(displayBreakdown.netPay, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stage-detail">{netPct.toFixed(1)}% of gross</div>
          </div>
        </div>
      </div>

      {/* Visual Bar */}
      <div className="breakdown-bar">
        <h3>Visual Breakdown</h3>
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
          <div className="bar-label net-label">
            <span className="label-dot net-dot"></span>
            Take Home
          </div>
        </div>
      </div>

      {/* Waterfall Breakdown with Per-Account Editing */}
      {budgetData.accounts.length > 0 && (
        <div className="waterfall-breakdown">
          <div className="waterfall-header">
            <h3>After-Tax Allocations</h3>
          </div>
          
          <div className="waterfall-table">
            <div className="waterfall-row waterfall-header-row">
              <span className="waterfall-label">Net Pay</span>
              <span className="waterfall-amount">{formatWithSymbol(displayBreakdown.netPay, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            {allocationPlan.accountFunding.map((fundingItem) => {
              const accountAmount = roundUpToCent(toDisplayAmount(fundingItem.totalAmount));
              const isEditing = editingAccountIds.has(fundingItem.account.id);
              const displayAccount = isEditing ? draftAccounts.get(fundingItem.account.id) : fundingItem.account;
              
              if (!displayAccount) return null;
              
              return (
                <React.Fragment key={fundingItem.account.id}>
                  <div className="waterfall-row waterfall-account-row">
                    <span className="waterfall-label">
                      <span className="account-icon-small">{fundingItem.account.icon || getDefaultIconForType(fundingItem.account.type)}</span>
                      {fundingItem.account.name}
                    </span>
                    {!isEditing ? (
                      <Button variant="secondary" size="small" onClick={() => startAccountEdit(fundingItem.account.id)}>Edit</Button>
                    ) : (
                      <div className="paybreakdown-account-edit-actions">
                        <Button variant="secondary" size="small" onClick={() => cancelAccountEdit(displayAccount.id)}>Cancel</Button>
                        <Button variant="primary" size="small" onClick={() => saveAccountEdit(displayAccount.id)}>Save</Button>
                      </div>
                    )
                    }
                    <span className="waterfall-amount">{formatWithSymbol(accountAmount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  {isEditing ? (
                    <div className="allocation-edit-section">
                      {displayAccount.allocationCategories.length === 0 && (
                        <div className="waterfall-row waterfall-category-row">
                          <p className="category-empty">No allocations yet. Add allocations to allocate funds to this account.</p>
                        </div>
                      )}

                      {displayAccount.allocationCategories.map((category) => (
                        <div key={category.id} className={`waterfall-row waterfall-category-row category-edit-row ${category.isBill || category.isBenefit || category.isRetirement ? 'bill-category-row' : ''}`}>
                          {category.isBill || category.isBenefit || category.isRetirement ? (
                            <>
                              <input
                                type="text"
                                value={category.name}
                                onChange={(e) => updateCategory(displayAccount.id, category.id, { name: e.target.value })}
                                placeholder={category.isBill ? 'Bills category name' : (category.isBenefit ? 'Benefits category name' : 'Retirement category name')}
                                className="category-name-input"
                              />
                              <div className="bill-amount-display">
                                {formatWithSymbol(roundUpToCent(category.amount), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                {category.isBill && category.billCount && category.billCount > 0 && (
                                  <span className="bill-count-badge">{category.billCount}</span>
                                )}
                                {category.isBenefit && category.benefitCount && category.benefitCount > 0 && (
                                  <span className="bill-count-badge">{category.benefitCount}</span>
                                )}
                                {category.isRetirement && category.retirementCount && category.retirementCount > 0 && (
                                  <span className="bill-count-badge">{category.retirementCount}</span>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <input
                                type="text"
                                value={category.name}
                                onChange={(e) => updateCategory(displayAccount.id, category.id, { name: e.target.value })}
                                placeholder="Allocation name"
                                className="category-name-input"
                              />
                              <InputWithPrefix
                                prefix={getCurrencySymbol(currency)}
                                type="number"
                                min="0"
                                step="1"
                                value={String(category.amount)}
                                onChange={(e) => updateCategory(displayAccount.id, category.id, { amount: parseFloat(e.target.value) || 0 })}
                              />
                              <Button variant="icon" onClick={() => removeCategory(displayAccount.id, category.id)} title="Remove allocation">✕</Button>
                            </>
                          )}
                        </div>
                      ))}

                      <div className="waterfall-row waterfall-category-row category-actions-row">
                        <Button variant="secondary" size="small" onClick={() => addCategory(displayAccount.id)}>+ Add Allocation</Button>
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
                    fundingItem.categories.length > 0 && fundingItem.categories.map((category) => (
                      <div key={category.id} className={`waterfall-row waterfall-category-row ${category.isBill || category.isBenefit || category.isRetirement ? 'bill-category-view' : ''}`}>
                        {category.isBill || category.isBenefit || category.isRetirement ? (
                          <button
                            className="waterfall-label category-label category-button"
                            onClick={() => category.isBill ? onNavigateToBills?.(fundingItem.account.id) : (category.isBenefit ? onNavigateToBenefits?.(fundingItem.account.id) : onNavigateToRetirement?.(fundingItem.account.id))}
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
                          </button>
                        ) : (
                          <span className="waterfall-label category-label">
                            {category.name}
                          </span>
                        )}
                        <span className="waterfall-amount">
                          {category.amount === 0 ? '-' : formatWithSymbol(roundUpToCent(toDisplayAmount(category.amount)), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))
                  )}
                </React.Fragment>
              );
            })}

            <div className="waterfall-row waterfall-footer-row">
              <span className="waterfall-label">All that remains for spending</span>
              <span className="waterfall-amount">{formatWithSymbol(roundUpToCent(Math.max(0, toDisplayAmount(leftoverPerPaycheck))), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {leftoverPerPaycheck < (budgetData.paySettings.minLeftover || 0) && (budgetData.paySettings.minLeftover || 0) > 0 && (
              <div className="waterfall-alert-row">
                <Alert type="warning">
                  You are {formatWithSymbol(roundUpToCent(toDisplayAmount((budgetData.paySettings.minLeftover || 0) - leftoverPerPaycheck)), currency, { minimumFractionDigits: 2 })} below your target minimum of {formatWithSymbol(roundUpToCent(toDisplayAmount(budgetData.paySettings.minLeftover || 0)), currency, { minimumFractionDigits: 2 })}
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
  const billsPerYear = getBillsPerYear(bill.frequency, bill.customFrequencyDays);
  
  // Calculate average per paycheck: (total per year) / (paychecks per year)
  const totalPerYear = bill.amount * billsPerYear;
  return roundUpToCent(totalPerYear / paychecksPerYear);
}

function getBillsPerYear(frequency: string, customDays?: number): number {
  switch (frequency) {
    case 'weekly': return 52;
    case 'bi-weekly': return 26;
    case 'monthly': return 12;
    case 'quarterly': return 4;
    case 'semi-annual': return 2;
    case 'yearly': return 1;
    case 'custom': return customDays ? 365 / customDays : 1;
    default: return 1;
  }
}

function normalizeAccounts(
  accounts: Account[],
  bills: Bill[],
  benefits: Benefit[],
  retirement: RetirementElection[],
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

    // Get user-defined categories
    const userCategories = (account.allocationCategories || [])
      .filter(cat => !cat.id.startsWith('__bills_') && !cat.id.startsWith('__benefits_') && !cat.id.startsWith('__retirement_'))
      .map((category) => ({
        id: category.id,
        name: category.name,
        amount: category.amount,
        isBill: false,
        isBenefit: false,
        isRetirement: false,
      }));

    // Get bills for this account and calculate total
    const accountBills = bills.filter(bill => bill.accountId === account.id);

    // Get account-sourced benefits for this account and calculate total
    const accountBenefits = benefits.filter(
      benefit => benefit.deductionSource === 'account' && benefit.sourceAccountId === account.id
    );

    // Get account-sourced retirement contributions for this account and calculate total
    const accountRetirement = retirement.filter(
      election => election.deductionSource === 'account' && election.sourceAccountId === account.id
    );

    const autoCategories: AllocationCategory[] = [];
    
    if (accountBills.length > 0) {
      const billTotal = accountBills.reduce((sum, bill) => {
        const billPerPaycheck = calculateBillPerPaycheck(bill, payFrequency);
        return sum + billPerPaycheck;
      }, 0);

      autoCategories.push({
        id: `__bills_${account.id}`,
        name: existingBillCategory?.name || 'Bills',
        amount: roundUpToCent(billTotal),
        isBill: true,
        billCount: accountBills.length,
      });
    }

    if (accountBenefits.length > 0) {
      const benefitsTotal = accountBenefits.reduce((sum, benefit) => {
        const amountPerPaycheck = benefit.isPercentage
          ? roundUpToCent((grossPayPerPaycheck * benefit.amount) / 100)
          : roundUpToCent(benefit.amount);
        return sum + amountPerPaycheck;
      }, 0);

      autoCategories.push({
        id: `__benefits_${account.id}`,
        name: existingBenefitCategory?.name || 'Benefits',
        amount: roundUpToCent(benefitsTotal),
        isBenefit: true,
        benefitCount: accountBenefits.length,
      });
    }

    if (accountRetirement.length > 0) {
      const retirementTotal = accountRetirement.reduce((sum, election) => {
        const amountPerPaycheck = election.employeeContributionIsPercentage
          ? roundUpToCent((grossPayPerPaycheck * election.employeeContribution) / 100)
          : roundUpToCent(election.employeeContribution);
        return sum + amountPerPaycheck;
      }, 0);

      autoCategories.push({
        id: `__retirement_${account.id}`,
        name: existingRetirementCategory?.name || 'Retirement',
        amount: roundUpToCent(retirementTotal),
        isRetirement: true,
        retirementCount: accountRetirement.length,
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
      amount: roundUpToCent(Math.max(0, category.amount || 0)),
      isBill: category.isBill,
      billCount: category.billCount,
      isBenefit: category.isBenefit,
      benefitCount: category.benefitCount,
      isRetirement: category.isRetirement,
      retirementCount: category.retirementCount,
    }));

    const totalAmount = roundUpToCent(categories.reduce((sum, cat) => sum + cat.amount, 0));

    return {
      account,
      totalAmount,
      categories,
    };
  });

  const totalAllocated = roundUpToCent(accountFunding.reduce((sum, item) => sum + item.totalAmount, 0));
  const remaining = roundUpToCent(Math.max(0, netPay - totalAllocated));

  return {
    accountFunding,
    remaining,
  };
}

function getPaychecksPerYear(frequency: string): number {
  switch (frequency) {
    case 'weekly': return 52;
    case 'bi-weekly': return 26;
    case 'semi-monthly': return 24;
    case 'monthly': return 12;
    default: return 26;
  }
}

export default PayBreakdown;
