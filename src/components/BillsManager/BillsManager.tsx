import React, { useEffect, useState } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import type { Benefit, Bill, BillFrequency } from '../../types/auth';
import type { ViewMode } from '../../types/viewMode';
import { formatWithSymbol, getCurrencySymbol } from '../../utils/currency';
import { roundUpToCent } from '../../utils/money';
import { calculateGrossPayPerPaycheck, getDisplayModeLabel, getPaychecksPerYear, formatPayFrequencyLabel } from '../../utils/payPeriod';
import { getDefaultAccountIcon } from '../../utils/accountDefaults';
import { convertBillToMonthly, formatBillFrequency } from '../../utils/billFrequency';
import { monthlyToDisplayAmount } from '../../utils/displayAmounts';
import { Button, FormGroup, InputWithPrefix, Modal, PageHeader, RadioGroup, SectionItemCard, ViewModeSelector } from '../shared';
import './BillsManager.css';

interface BillsManagerProps {
  scrollToAccountId?: string;
  displayMode: ViewMode;
  onDisplayModeChange: (mode: ViewMode) => void;
}

type BillFieldErrors = {
  name?: string;
  amount?: string;
  accountId?: string;
};

type BenefitFieldErrors = {
  name?: string;
  amount?: string;
  sourceAccountId?: string;
};

const BillsManager: React.FC<BillsManagerProps> = ({ scrollToAccountId, displayMode, onDisplayModeChange }) => {
  const { budgetData, addBill, updateBill, deleteBill, addBenefit, updateBenefit, deleteBenefit } = useBudget();

  const [showAddBill, setShowAddBill] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  const [showAddBenefit, setShowAddBenefit] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState<Benefit | null>(null);

  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billFrequency, setBillFrequency] = useState<BillFrequency>('monthly');
  const [billAccountId, setBillAccountId] = useState('');
  const [billNotes, setBillNotes] = useState('');
  const [billFieldErrors, setBillFieldErrors] = useState<BillFieldErrors>({});

  const [benefitName, setBenefitName] = useState('');
  const [benefitAmount, setBenefitAmount] = useState('');
  const [benefitIsPercentage, setBenefitIsPercentage] = useState(false);
  const [benefitIsTaxable, setBenefitIsTaxable] = useState(false);
  const [benefitSource, setBenefitSource] = useState<'paycheck' | 'account'>('paycheck');
  const [benefitSourceAccountId, setBenefitSourceAccountId] = useState('');
  const [benefitFieldErrors, setBenefitFieldErrors] = useState<BenefitFieldErrors>({});

  useEffect(() => {
    if (scrollToAccountId) {
      const element = document.getElementById(`account-${scrollToAccountId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [scrollToAccountId]);

  if (!budgetData) return null;

  const currency = budgetData.settings?.currency || 'USD';
  const paychecksPerYear = getPaychecksPerYear(budgetData.paySettings.payFrequency);
  const payFrequencyLabel = formatPayFrequencyLabel(budgetData.paySettings.payFrequency);
  const grossPayPerPaycheck = calculateGrossPayPerPaycheck(budgetData.paySettings);
  const isBillEnabled = (bill: Bill) => bill.enabled !== false;

  const displayAmount = (monthlyAmount: number): number => monthlyToDisplayAmount(monthlyAmount, paychecksPerYear, displayMode);

  const getBenefitPerPaycheck = (benefit: Benefit): number => {
    if (benefit.isPercentage) {
      return roundUpToCent((grossPayPerPaycheck * benefit.amount) / 100);
    }
    return roundUpToCent(benefit.amount);
  };

  const getBenefitMonthly = (benefit: Benefit): number => {
    return roundUpToCent((getBenefitPerPaycheck(benefit) * paychecksPerYear) / 12);
  };

  const billsByAccount = budgetData.bills.reduce((acc, bill) => {
    if (!acc[bill.accountId]) {
      acc[bill.accountId] = [];
    }
    acc[bill.accountId].push(bill);
    return acc;
  }, {} as Record<string, Bill[]>);

  const accountBenefitsByAccount = budgetData.benefits.reduce((acc, benefit) => {
    if (benefit.deductionSource !== 'account' || !benefit.sourceAccountId) {
      return acc;
    }
    if (!acc[benefit.sourceAccountId]) {
      acc[benefit.sourceAccountId] = [];
    }
    acc[benefit.sourceAccountId].push(benefit);
    return acc;
  }, {} as Record<string, Benefit[]>);

  const paycheckBenefits = [...budgetData.benefits]
    .filter((benefit) => (benefit.deductionSource || 'paycheck') === 'paycheck')
    .sort((a, b) => getBenefitPerPaycheck(b) - getBenefitPerPaycheck(a));

  const paycheckBenefitsTotalMonthly = paycheckBenefits.reduce((sum, benefit) => sum + getBenefitMonthly(benefit), 0);

  const accountRows = budgetData.accounts
    .map((account) => {
      const accountBills = billsByAccount[account.id] || [];
      const accountBenefits = accountBenefitsByAccount[account.id] || [];
      const billsTotalMonthly = accountBills.reduce((sum, bill) => {
        if (!isBillEnabled(bill)) return sum;
        return sum + convertBillToMonthly(bill.amount, bill.frequency);
      }, 0);
      const benefitsTotalMonthly = accountBenefits.reduce((sum, benefit) => sum + getBenefitMonthly(benefit), 0);
      return {
        account,
        accountBills,
        accountBenefits,
        totalMonthly: roundUpToCent(billsTotalMonthly + benefitsTotalMonthly),
      };
    })
    .filter(({ accountBills, accountBenefits }) => accountBills.length > 0 || accountBenefits.length > 0)
    .sort((a, b) => b.totalMonthly - a.totalMonthly);

  const hasAnyItems = budgetData.bills.length > 0 || budgetData.benefits.length > 0;

  const handleAddBill = () => {
    setEditingBill(null);
    setBillName('');
    setBillAmount('');
    setBillFrequency('monthly');
    setBillAccountId(budgetData.accounts[0]?.id || '');
    setBillNotes('');
    setBillFieldErrors({});
    setShowAddBill(true);
  };

  const handleEditBill = (bill: Bill) => {
    setEditingBill(bill);
    setBillName(bill.name);
    setBillAmount(bill.amount.toString());
    setBillFrequency(bill.frequency);
    setBillAccountId(bill.accountId);
    setBillNotes(bill.notes || '');
    setBillFieldErrors({});
    setShowAddBill(true);
  };

  const handleSaveBill = () => {
    const trimmedBillName = billName.trim();
    const parsedBillAmount = parseFloat(billAmount);
    const errors: BillFieldErrors = {};

    if (!trimmedBillName) {
      errors.name = 'Bill name is required.';
    }
    if (!Number.isFinite(parsedBillAmount) || parsedBillAmount <= 0) {
      errors.amount = 'Please enter a valid amount greater than zero.';
    }
    if (!billAccountId) {
      errors.accountId = 'Please select an account.';
    }

    if (Object.keys(errors).length > 0) {
      setBillFieldErrors(errors);
      return;
    }

    const billData = {
      name: trimmedBillName,
      amount: parsedBillAmount,
      frequency: billFrequency,
      accountId: billAccountId,
      enabled: editingBill ? editingBill.enabled !== false : true,
      notes: billNotes.trim() || undefined,
    };

    if (editingBill) {
      updateBill(editingBill.id, billData);
    } else {
      addBill(billData);
    }

    setShowAddBill(false);
    setEditingBill(null);
    setBillFieldErrors({});
  };

  const handleDeleteBill = (id: string) => {
    if (window.confirm('Are you sure you want to delete this bill?')) {
      deleteBill(id);
    }
  };

  const handleToggleBillEnabled = (bill: Bill) => {
    updateBill(bill.id, { enabled: !isBillEnabled(bill) });
  };

  const handleAddBenefit = () => {
    setEditingBenefit(null);
    setBenefitName('');
    setBenefitAmount('');
    setBenefitIsPercentage(false);
    setBenefitIsTaxable(false);
    setBenefitSource('paycheck');
    setBenefitSourceAccountId('');
    setBenefitFieldErrors({});
    setShowAddBenefit(true);
  };

  const handleEditBenefit = (benefit: Benefit) => {
    setEditingBenefit(benefit);
    setBenefitName(benefit.name);
    setBenefitAmount(benefit.amount.toString());
    setBenefitIsPercentage(benefit.isPercentage || false);
    setBenefitSource(benefit.deductionSource || 'paycheck');
    setBenefitSourceAccountId(benefit.sourceAccountId || '');
    setBenefitIsTaxable((benefit.deductionSource || 'paycheck') === 'account' ? true : benefit.isTaxable);
    setBenefitFieldErrors({});
    setShowAddBenefit(true);
  };

  const handleSaveBenefit = () => {
    const name = benefitName.trim();
    const parsedAmount = parseFloat(benefitAmount);
    const isAccountSource = benefitSource === 'account';
    const errors: BenefitFieldErrors = {};

    if (!name) {
      errors.name = 'Deduction name is required.';
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      errors.amount = 'Please enter a valid deduction amount.';
    }
    if (isAccountSource && !benefitSourceAccountId) {
      errors.sourceAccountId = 'Please select an account for this deduction source.';
    }

    if (Object.keys(errors).length > 0) {
      setBenefitFieldErrors(errors);
      return;
    }

    const payload = {
      name,
      amount: parsedAmount,
      isTaxable: isAccountSource ? true : benefitIsTaxable,
      isPercentage: benefitIsPercentage,
      deductionSource: benefitSource,
      sourceAccountId: isAccountSource ? benefitSourceAccountId : undefined,
    };

    if (editingBenefit) {
      updateBenefit(editingBenefit.id, payload);
    } else {
      addBenefit(payload);
    }

    setShowAddBenefit(false);
    setEditingBenefit(null);
    setBenefitFieldErrors({});
  };

  const handleDeleteBenefit = (id: string) => {
    if (window.confirm('Are you sure you want to delete this deduction?')) {
      deleteBenefit(id);
    }
  };

  return (
    <div className="bills-manager">
      <PageHeader
        title="Bills & Expenses"
        subtitle="Manage recurring bills, expenses, and paycheck deductions"
        actions={
          <>
            <ViewModeSelector
              mode={displayMode}
              onChange={onDisplayModeChange}
              hintText={`Current setting: ${payFrequencyLabel}`}
              hintVisibleModes={['paycheck']}
              reserveHintSpace
            />
            <Button variant="secondary" onClick={handleAddBenefit}>+ Add Deduction</Button>
            <Button variant="primary" onClick={handleAddBill}>+ Add Bill</Button>
          </>
        }
      />

      {budgetData.accounts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏦</div>
          <h3>No Accounts Set Up</h3>
          <p>Accounts are created during the initial setup wizard. Run the setup wizard to create your first account.</p>
        </div>
      ) : !hasAnyItems ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No Bills or Deductions Yet</h3>
          <p>Add recurring bills or paycheck/account deductions to get started</p>
          <div className="empty-state-actions">
            <Button variant="secondary" onClick={handleAddBenefit}>Add Deduction</Button>
            <Button variant="primary" onClick={handleAddBill}>Add First Bill</Button>
          </div>
        </div>
      ) : (
        <div className="bills-by-account">
          {paycheckBenefits.length > 0 && (
            <div id="account-paycheck" className="account-section">
              <div className="account-header">
                <div className="account-info">
                  <span className="account-icon">🧾</span>
                  <div>
                    <h3>Paycheck Deductions</h3>
                    <span className="account-type">paycheck source</span>
                  </div>
                </div>
                <div className="account-total">
                  <span className="total-label">{getDisplayModeLabel(displayMode)} Total</span>
                  <span className="total-amount">{formatWithSymbol(displayAmount(paycheckBenefitsTotalMonthly), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="bills-list">
                {paycheckBenefits.map((benefit) => {
                  const perPaycheck = getBenefitPerPaycheck(benefit);
                  const inDisplayMode = displayAmount(getBenefitMonthly(benefit));
                  return (
                    <SectionItemCard key={benefit.id} className="bill-item benefit-deduction-item">
                      <div className="bill-main">
                        <div className="bill-info">
                          <h4>{benefit.name}</h4>
                          <div className="bill-frequency-amount">
                            Deducted per paycheck: {benefit.isPercentage ? `${benefit.amount}%` : formatWithSymbol(perPaycheck, currency, { minimumFractionDigits: 2 })}
                          </div>
                          <span className={`benefit-tax-badge ${benefit.isTaxable ? 'post-tax' : 'pre-tax'}`}>
                            {benefit.isTaxable ? 'Post-Tax' : 'Pre-Tax'}
                          </span>
                        </div>
                        <div className="bill-end">
                          <div className="bill-amount">
                            <span className="amount">{formatWithSymbol(inDisplayMode, currency, { minimumFractionDigits: 2 })}</span>
                            <span className="frequency">{getDisplayModeLabel(displayMode)}</span>
                          </div>
                          <div className="bill-actions">
                            <Button variant="icon" onClick={() => handleEditBenefit(benefit)} title="Edit">✏️</Button>
                            <Button variant="icon" onClick={() => handleDeleteBenefit(benefit.id)} title="Delete">🗑️</Button>
                          </div>
                        </div>
                      </div>
                    </SectionItemCard>
                  );
                })}
              </div>
            </div>
          )}

          {accountRows.map(({ account, accountBills, accountBenefits, totalMonthly }) => (
            <div key={account.id} id={`account-${account.id}`} className="account-section">
              <div className="account-header">
                <div className="account-info">
                  <span className="account-icon">{account.icon || getDefaultAccountIcon(account.type)}</span>
                  <div>
                    <h3>{account.name}</h3>
                    <span className="account-type">{account.type}</span>
                  </div>
                </div>
                <div className="account-total">
                  <span className="total-label">{getDisplayModeLabel(displayMode)} Total</span>
                  <span className="total-amount">{formatWithSymbol(displayAmount(totalMonthly), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="bills-list">
                {[...accountBenefits]
                  .sort((a, b) => getBenefitPerPaycheck(b) - getBenefitPerPaycheck(a))
                  .map((benefit) => {
                    const perPaycheck = getBenefitPerPaycheck(benefit);
                    const inDisplayMode = displayAmount(getBenefitMonthly(benefit));
                    return (
                      <SectionItemCard key={benefit.id} className="bill-item benefit-deduction-item">
                        <div className="bill-main">
                          <div className="bill-info">
                            <h4>{benefit.name}</h4>
                            <div className="bill-frequency-amount">
                              From account per paycheck: {benefit.isPercentage ? `${benefit.amount}%` : formatWithSymbol(perPaycheck, currency, { minimumFractionDigits: 2 })}
                            </div>
                            <span className="benefit-tax-badge post-tax">Post-Tax</span>
                          </div>
                          <div className="bill-end">
                            <div className="bill-amount">
                              <span className="amount">{formatWithSymbol(inDisplayMode, currency, { minimumFractionDigits: 2 })}</span>
                              <span className="frequency">{getDisplayModeLabel(displayMode)}</span>
                            </div>
                            <div className="bill-actions">
                              <Button variant="icon" onClick={() => handleEditBenefit(benefit)} title="Edit">✏️</Button>
                              <Button variant="icon" onClick={() => handleDeleteBenefit(benefit.id)} title="Delete">🗑️</Button>
                            </div>
                          </div>
                        </div>
                      </SectionItemCard>
                    );
                  })}

                {accountBills
                  .sort((a, b) => {
                    const aEnabled = isBillEnabled(a);
                    const bEnabled = isBillEnabled(b);
                    if (aEnabled !== bEnabled) return aEnabled ? -1 : 1;
                    return b.amount - a.amount;
                  })
                  .map((bill) => (
                    <SectionItemCard key={bill.id} className={`bill-item ${isBillEnabled(bill) ? '' : 'bill-disabled'}`}>
                      <div className="bill-main">
                        <div className="bill-info">
                          <h4>{bill.name}</h4>
                          <div className="bill-frequency-amount">
                            Paid {formatBillFrequency(bill.frequency)}: {formatWithSymbol(bill.amount, currency, { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="bill-end">
                          <div className="bill-amount">
                            <span className="amount">{formatWithSymbol(displayAmount(convertBillToMonthly(bill.amount, bill.frequency)), currency, { minimumFractionDigits: 2 })}</span>
                            <span className="frequency">{getDisplayModeLabel(displayMode)}</span>
                          </div>
                          <div className="bill-actions">
                            <Button variant="icon" onClick={() => handleToggleBillEnabled(bill)} title={isBillEnabled(bill) ? 'Disable bill' : 'Enable bill'}>
                              {isBillEnabled(bill) ? '⏸️' : '▶️'}
                            </Button>
                            <Button variant="icon" onClick={() => handleEditBill(bill)} title="Edit">✏️</Button>
                            <Button variant="icon" onClick={() => handleDeleteBill(bill.id)} title="Delete">🗑️</Button>
                          </div>
                        </div>
                      </div>
                      {bill.notes && <div className="bill-notes">{bill.notes}</div>}
                    </SectionItemCard>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showAddBill}
        onClose={() => {
          setShowAddBill(false);
          setBillFieldErrors({});
        }}
        header={editingBill ? 'Edit Bill' : 'Add New Bill'}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowAddBill(false);
                setBillFieldErrors({});
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" onClick={handleSaveBill}>
              {editingBill ? 'Update Bill' : 'Add Bill'}
            </Button>
          </>
        }
      >
        <FormGroup label="Bill Name" required error={billFieldErrors.name}>
          <input
            type="text"
            value={billName}
            onChange={(e) => {
              setBillName(e.target.value);
              if (billFieldErrors.name) {
                setBillFieldErrors((prev) => ({ ...prev, name: undefined }));
              }
            }}
            placeholder="e.g., Electric Bill, Netflix"
            className={billFieldErrors.name ? 'field-error' : ''}
            required
          />
        </FormGroup>

        <div className="form-row">
          <FormGroup label="Amount" required error={billFieldErrors.amount}>
            <InputWithPrefix
              prefix={getCurrencySymbol(currency)}
              type="number"
              value={billAmount}
              onChange={(e) => {
                setBillAmount(e.target.value);
                if (billFieldErrors.amount) {
                  setBillFieldErrors((prev) => ({ ...prev, amount: undefined }));
                }
              }}
              placeholder="0.00"
              step="0.01"
              min="0"
              className={billFieldErrors.amount ? 'field-error' : ''}
              required
            />
          </FormGroup>

          <FormGroup label="Frequency" required>
            <select value={billFrequency} onChange={(e) => setBillFrequency(e.target.value as BillFrequency)} required>
              <option value="weekly">Weekly</option>
              <option value="bi-weekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="semi-annual">Semi-annual</option>
              <option value="yearly">Yearly</option>
            </select>
          </FormGroup>
        </div>

        <FormGroup label="Paid from Account" required error={billFieldErrors.accountId}>
          <select
            value={billAccountId}
            onChange={(e) => {
              setBillAccountId(e.target.value);
              if (billFieldErrors.accountId) {
                setBillFieldErrors((prev) => ({ ...prev, accountId: undefined }));
              }
            }}
            className={billFieldErrors.accountId ? 'field-error' : ''}
            required
          >
            {budgetData.accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.icon || getDefaultAccountIcon(account.type)} {account.name}
              </option>
            ))}
          </select>
        </FormGroup>

        <FormGroup label="Notes">
          <textarea
            value={billNotes}
            onChange={(e) => setBillNotes(e.target.value)}
            placeholder="Optional notes about this bill"
            rows={2}
          />
        </FormGroup>
      </Modal>

      <Modal
        isOpen={showAddBenefit}
        onClose={() => {
          setShowAddBenefit(false);
          setBenefitFieldErrors({});
        }}
        header={editingBenefit ? 'Edit Deduction' : 'Add Deduction'}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => {
              setShowAddBenefit(false);
              setBenefitFieldErrors({});
            }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" onClick={handleSaveBenefit}>
              {editingBenefit ? 'Update Deduction' : 'Add Deduction'}
            </Button>
          </>
        }
      >
        <FormGroup label="Deduction Name" required error={benefitFieldErrors.name}>
          <input
            type="text"
            value={benefitName}
            className={benefitFieldErrors.name ? 'field-error' : ''}
            onChange={(e) => {
              setBenefitName(e.target.value);
              if (benefitFieldErrors.name) {
                setBenefitFieldErrors((prev) => ({ ...prev, name: undefined }));
              }
            }}
            placeholder="e.g., Health Insurance, HSA"
            required
          />
        </FormGroup>

        <FormGroup label="Deduction Source" error={benefitFieldErrors.sourceAccountId}>
          <select
            className={benefitFieldErrors.sourceAccountId ? 'field-error' : ''}
            value={benefitSource === 'account' ? benefitSourceAccountId : 'paycheck'}
            onChange={(e) => {
              if (e.target.value === 'paycheck') {
                setBenefitSource('paycheck');
                setBenefitSourceAccountId('');
              } else {
                setBenefitSource('account');
                setBenefitSourceAccountId(e.target.value);
                setBenefitIsTaxable(true);
              }
              if (benefitFieldErrors.sourceAccountId) {
                setBenefitFieldErrors((prev) => ({ ...prev, sourceAccountId: undefined }));
              }
            }}
          >
            <option value="paycheck">Deduct from Paycheck</option>
            {budgetData.accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.icon || getDefaultAccountIcon(account.type)} {account.name}
              </option>
            ))}
          </select>
        </FormGroup>

        <div className="form-row">
          <FormGroup label="Amount" required error={benefitFieldErrors.amount}>
            <InputWithPrefix
              prefix={!benefitIsPercentage ? getCurrencySymbol(currency) : ''}
              suffix={benefitIsPercentage ? '%' : ''}
              type="number"
              value={benefitAmount}
              className={benefitFieldErrors.amount ? 'field-error' : ''}
              onChange={(e) => {
                setBenefitAmount(e.target.value);
                if (benefitFieldErrors.amount) {
                  setBenefitFieldErrors((prev) => ({ ...prev, amount: undefined }));
                }
              }}
              placeholder={benefitIsPercentage ? '0' : '0.00'}
              step={benefitIsPercentage ? '0.1' : '0.01'}
              min="0"
              required
            />
          </FormGroup>

          <FormGroup label="Type">
            <select value={benefitIsPercentage ? 'percentage' : 'amount'} onChange={(e) => setBenefitIsPercentage(e.target.value === 'percentage')}>
              <option value="amount">Fixed Amount</option>
              <option value="percentage">Percentage of Gross</option>
            </select>
          </FormGroup>
        </div>

        {benefitSource === 'paycheck' ? (
          <FormGroup label="Tax Treatment">
            <RadioGroup
              name="benefitTaxTreatment"
              value={benefitIsTaxable ? 'post-tax' : 'pre-tax'}
              onChange={(value) => setBenefitIsTaxable(value === 'post-tax')}
              layout="column"
              options={[
                { value: 'pre-tax', label: 'Pre-Tax', description: 'Reduces taxable income' },
                { value: 'post-tax', label: 'Post-Tax', description: 'Deducted after taxes' },
              ]}
            />
          </FormGroup>
        ) : (
          <p className="benefit-source-note">
            Account-based deductions are treated as post-tax and will be grouped under the selected account in Pay Breakdown.
          </p>
        )}
      </Modal>
    </div>
  );
};

export default BillsManager;
