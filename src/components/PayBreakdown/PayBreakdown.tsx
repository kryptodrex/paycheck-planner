import React, { useMemo, useState } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import { formatWithSymbol, getCurrencySymbol } from '../../utils/currency';
import { roundUpToCent } from '../../utils/money';
import type { Account, Bill } from '../../types/auth';
import { Alert, Button, InputWithPrefix } from '../shared';
import './PayBreakdown.css';

type AllocationCategory = {
  id: string;
  name: string;
  amount: number;
  isBill?: boolean;  // If true, this is an auto-calculated sum of bills for this account
  billCount?: number; // Number of bills in this category (if isBill is true)
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
  onNavigateToBills?: (accountId: string) => void;
}

const PayBreakdown: React.FC<PayBreakdownProps> = ({ onNavigateToBills }) => {
  const { budgetData, calculatePaycheckBreakdown, updateBudgetData } = useBudget();
  const [viewMode, setViewMode] = useState<'paycheck' | 'monthly' | 'yearly'>('paycheck');
  const [editingAccountIds, setEditingAccountIds] = useState<Set<string>>(new Set());
  const [draftAccounts, setDraftAccounts] = useState<Map<string, AllocationAccount>>(new Map());
  const [validationMessages, setValidationMessages] = useState<Map<string, ValidationMessage>>(new Map());

  if (!budgetData) return null;

  const currency = budgetData.settings?.currency || 'USD';
  const breakdown = calculatePaycheckBreakdown();
  const normalizedAccounts = useMemo(() => normalizeAccounts(budgetData.accounts, budgetData.bills, budgetData.paySettings.payFrequency), [budgetData.accounts, budgetData.bills, budgetData.paySettings.payFrequency]);
  const allocationPlan = calculateAllocationPlan(normalizedAccounts, breakdown.netPay);
  const leftoverPerPaycheck = allocationPlan.remaining;
  
  // Calculate multiplier based on view mode
  let multiplier = 1;
  const paychecksPerYear = getPaychecksPerYear(budgetData.paySettings.payFrequency);
  
  if (viewMode === 'monthly') {
    multiplier = paychecksPerYear / 12;
  } else if (viewMode === 'yearly') {
    multiplier = paychecksPerYear;
  }

  // Apply multiplier to all values and round up to nearest cent
  const displayBreakdown = {
    grossPay: roundUpToCent(breakdown.grossPay * multiplier),
    preTaxDeductions: roundUpToCent(breakdown.preTaxDeductions * multiplier),
    taxableIncome: roundUpToCent(breakdown.taxableIncome * multiplier),
    federalTax: roundUpToCent(breakdown.federalTax * multiplier),
    stateTax: roundUpToCent(breakdown.stateTax * multiplier),
    socialSecurity: roundUpToCent(breakdown.socialSecurity * multiplier),
    medicare: roundUpToCent(breakdown.medicare * multiplier),
    additionalWithholding: roundUpToCent(breakdown.additionalWithholding * multiplier),
    totalTaxes: roundUpToCent(breakdown.totalTaxes * multiplier),
    netPay: roundUpToCent(breakdown.netPay * multiplier),
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

    const remaining = breakdown.netPay - totalAllocations;

    // ERROR: Attempting to allocate more than available (negative remaining)
    if (remaining < 0) {
      const overage = Math.abs(remaining);
      setValidationMessages(prev => new Map(prev).set(
        accountId,
        {
          type: 'error',
          message: `This allocation exceeds your net pay by ${formatWithSymbol(overage, currency, { minimumFractionDigits: 2 })}. Please reduce allocations to stay within ${formatWithSymbol(breakdown.netPay, currency, { minimumFractionDigits: 2 })}.`
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
        <div className="view-mode-selector">
          <button 
            className={viewMode === 'paycheck' ? 'active' : ''}
            onClick={() => setViewMode('paycheck')}
          >
            Per Paycheck
          </button>
          <button 
            className={viewMode === 'monthly' ? 'active' : ''}
            onClick={() => setViewMode('monthly')}
          >
            Monthly
          </button>
          <button 
            className={viewMode === 'yearly' ? 'active' : ''}
            onClick={() => setViewMode('yearly')}
          >
            Yearly
          </button>
        </div>
      </div>

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
                {budgetData.preTaxDeductions.length} deduction(s)
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
              const accountAmount = roundUpToCent(fundingItem.totalAmount * multiplier);
              const isEditing = editingAccountIds.has(fundingItem.account.id);
              const displayAccount = isEditing ? draftAccounts.get(fundingItem.account.id) : fundingItem.account;
              
              if (!displayAccount) return null;
              
              return (
                <React.Fragment key={fundingItem.account.id}>
                  <div className="waterfall-row waterfall-account-row">
                    <span className="waterfall-label">
                      <span className="account-icon-small">{fundingItem.account.icon || '💰'}</span>
                      {fundingItem.account.name}
                    </span>
                    <span className="waterfall-amount">{formatWithSymbol(accountAmount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    {!isEditing && (
                      <Button variant="secondary" size="small" onClick={() => startAccountEdit(fundingItem.account.id)}>Edit</Button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="allocation-edit-section">
                      {displayAccount.allocationCategories.length === 0 && (
                        <div className="waterfall-row waterfall-category-row">
                          <p className="category-empty">No categories yet. Add categories to allocate funds to this account.</p>
                        </div>
                      )}

                      {displayAccount.allocationCategories.map((category) => (
                        <div key={category.id} className={`waterfall-row waterfall-category-row category-edit-row ${category.isBill ? 'bill-category-row' : ''}`}>
                          {category.isBill ? (
                            <>
                              <input
                                type="text"
                                value={category.name}
                                onChange={(e) => updateCategory(displayAccount.id, category.id, { name: e.target.value })}
                                placeholder="Bills category name"
                                className="category-name-input"
                              />
                              <div className="bill-amount-display">
                                {formatWithSymbol(roundUpToCent(category.amount), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                {category.billCount && category.billCount > 0 && (
                                  <span className="bill-count-badge">{category.billCount}</span>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <input
                                type="text"
                                value={category.name}
                                onChange={(e) => updateCategory(displayAccount.id, category.id, { name: e.target.value })}
                                placeholder="Category name"
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
                              <Button variant="icon" onClick={() => removeCategory(displayAccount.id, category.id)} title="Remove category">✕</Button>
                            </>
                          )}
                        </div>
                      ))}

                      <div className="waterfall-row waterfall-category-row category-actions-row">
                        <Button variant="secondary" size="small" onClick={() => addCategory(displayAccount.id)}>+ Add Category</Button>
                      </div>

                      {validationMessages.has(displayAccount.id) && (
                        <div className="waterfall-row waterfall-category-row validation-message-row">
                          <Alert type={validationMessages.get(displayAccount.id)?.type}>
                            {validationMessages.get(displayAccount.id)?.type === 'error' ? '🚫' : '⚠️'} {validationMessages.get(displayAccount.id)?.message}
                          </Alert>
                        </div>
                      )}

                      <div className="waterfall-row waterfall-category-row account-save-row">
                        <div className="account-edit-actions">
                          <Button variant="secondary" size="small" onClick={() => cancelAccountEdit(displayAccount.id)}>Cancel</Button>
                          <Button variant="primary" size="small" onClick={() => saveAccountEdit(displayAccount.id)}>Save</Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    fundingItem.categories.length > 0 && fundingItem.categories.map((category) => (
                      <div key={category.id} className={`waterfall-row waterfall-category-row ${category.isBill ? 'bill-category-view' : ''}`}>
                        <span className="waterfall-label category-label">
                          {category.name}
                          {category.isBill && category.billCount && category.billCount > 0 && (
                            <span className="bill-count-badge">{category.billCount}</span>
                          )}
                          {category.isBill && (
                          <Button variant="secondary" size="small" onClick={() => onNavigateToBills?.(fundingItem.account.id)}>View Bills</Button>
                          )}
                        </span>
                        <span className="waterfall-amount">
                          {category.amount === 0 ? '-' : formatWithSymbol(roundUpToCent(category.amount * multiplier), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))
                  )}
                </React.Fragment>
              );
            })}

            <div className="waterfall-row waterfall-footer-row">
              <span className="waterfall-label">All that remains for spending</span>
              {leftoverPerPaycheck < (budgetData.paySettings.minLeftover || 0) && (budgetData.paySettings.minLeftover || 0) > 0 && (
                <Alert type="warning">
                  You are {formatWithSymbol(roundUpToCent(((budgetData.paySettings.minLeftover || 0) - leftoverPerPaycheck) * multiplier), currency, { minimumFractionDigits: 2 })} under your minimum of {formatWithSymbol(roundUpToCent((budgetData.paySettings.minLeftover || 0) * multiplier), currency, { minimumFractionDigits: 2 })}
                </Alert>
              )}
              <span className="waterfall-amount">{formatWithSymbol(roundUpToCent(Math.max(0, leftoverPerPaycheck * multiplier)), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
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

function normalizeAccounts(accounts: Account[], bills: Bill[], payFrequency: string): AllocationAccount[] {
  return accounts.map((account) => {
    // Check if there's an existing bill category with a custom name
    const existingBillCategory = (account.allocationCategories || []).find(
      cat => cat.id.startsWith('__bills_')
    );

    // Get user-defined categories
    const userCategories = (account.allocationCategories || [])
      .filter(cat => !cat.id.startsWith('__bills_')) // Filter out any old bill categories
      .map((category) => ({
        id: category.id,
        name: category.name,
        amount: category.amount,
        isBill: false,
      }));

    // Get bills for this account and calculate total
    const accountBills = bills.filter(bill => bill.accountId === account.id);
    const billCategories: AllocationCategory[] = [];
    
    if (accountBills.length > 0) {
      const billTotal = accountBills.reduce((sum, bill) => {
        const billPerPaycheck = calculateBillPerPaycheck(bill, payFrequency);
        return sum + billPerPaycheck;
      }, 0);

      billCategories.push({
        id: `__bills_${account.id}`, // Stable ID for bill category
        name: existingBillCategory?.name || 'Bills', // Preserve custom name if it was saved
        amount: roundUpToCent(billTotal),
        isBill: true,
        billCount: accountBills.length,
      });
    }

    return {
      ...account,
      allocationCategories: [...userCategories, ...billCategories],
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
