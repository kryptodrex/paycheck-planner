import React, { useState, useEffect } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import type { Bill, BillFrequency } from '../../types/auth';
import { formatWithSymbol, getCurrencySymbol } from '../../utils/currency';
import { roundUpToCent } from '../../utils/money';
import { getPaychecksPerYear, convertToDisplayMode, getDisplayModeLabel } from '../../utils/payPeriod';
import { getDefaultAccountIcon } from '../../utils/accountDefaults';
import { convertBillToMonthly, formatBillFrequency } from '../../utils/billFrequency';
import { Modal, Button, FormGroup, InputWithPrefix, SectionItemCard, ViewModeSelector, PageHeader } from '../shared';
import './BillsManager.css';

interface BillsManagerProps {
  scrollToAccountId?: string;
  displayMode: 'paycheck' | 'monthly' | 'yearly';
  onDisplayModeChange: (mode: 'paycheck' | 'monthly' | 'yearly') => void;
}

type BillFieldErrors = {
  name?: string;
  amount?: string;
  accountId?: string;
};

const BillsManager: React.FC<BillsManagerProps> = ({ scrollToAccountId, displayMode, onDisplayModeChange }) => {
  const { budgetData, addBill, updateBill, deleteBill } = useBudget();
  const [showAddBill, setShowAddBill] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  // Scroll to account when scrollToAccountId changes
  useEffect(() => {
    if (scrollToAccountId) {
      const element = document.getElementById(`account-${scrollToAccountId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [scrollToAccountId]);

  // Form state for new/edit bill
  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billFrequency, setBillFrequency] = useState<BillFrequency>('monthly');
  const [billAccountId, setBillAccountId] = useState('');
  const [billNotes, setBillNotes] = useState('');
  const [billFieldErrors, setBillFieldErrors] = useState<BillFieldErrors>({});

  if (!budgetData) return null;

  const currency = budgetData.settings?.currency || 'USD';
  const isBillEnabled = (bill: Bill) => bill.enabled !== false;

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
    if (confirm('Are you sure you want to delete this bill?')) {
      deleteBill(id);
    }
  };

  const handleToggleBillEnabled = (bill: Bill) => {
    updateBill(bill.id, { enabled: !isBillEnabled(bill) });
  };

  // Group bills by account
  const billsByAccount = budgetData.bills.reduce((acc, bill) => {
    if (!acc[bill.accountId]) {
      acc[bill.accountId] = [];
    }
    acc[bill.accountId].push(bill);
    return acc;
  }, {} as Record<string, Bill[]>);

  const paychecksPerYear = getPaychecksPerYear(budgetData.paySettings.payFrequency);

  // Convert monthly amount to display mode
  const toDisplayAmount = (monthlyAmount: number): number => {
    // First convert monthly to per-paycheck, then use convertToDisplayMode
    const perPaycheckAmount = (monthlyAmount * 12) / paychecksPerYear;
    return convertToDisplayMode(perPaycheckAmount, paychecksPerYear, displayMode);
  };

  return (
    <div className="bills-manager">
      <PageHeader
        title="Bills & Expenses"
        subtitle="Manage your recurring bills and expenses"
        actions={
          <>
            <ViewModeSelector mode={displayMode} onChange={onDisplayModeChange} />
            <Button variant="primary" onClick={handleAddBill}>
              + Add Bill
            </Button>
          </>
        }
      />

      {budgetData.accounts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏦</div>
          <h3>No Accounts Set Up</h3>
          <p>Accounts are created during the initial setup wizard. Run the setup wizard to create your first account.</p>
        </div>
      ) : budgetData.bills.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No Bills Yet</h3>
          <p>Add your first recurring bill or expense to get started</p>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleAddBill}>
            Add First Bill
          </button>
        </div>
      ) : (
        <div className="bills-by-account">
          {budgetData.accounts
            .map(account => {
              const accountBills = billsByAccount[account.id] || [];
              const totalMonthly = roundUpToCent(accountBills.reduce((sum, bill) => {
                if (!isBillEnabled(bill)) return sum;
                return sum + convertBillToMonthly(bill.amount, bill.frequency);
              }, 0));
              return { account, accountBills, totalMonthly };
            })
            .sort((a, b) => b.totalMonthly - a.totalMonthly)
            .map(({ account, accountBills, totalMonthly }) => {

              return (
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
                      <span className="total-amount">{formatWithSymbol(toDisplayAmount(totalMonthly), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {accountBills.length > 0 ? (
                    <div className="bills-list">
                      {accountBills
                        .sort((a, b) => {
                          const aEnabled = isBillEnabled(a);
                          const bEnabled = isBillEnabled(b);
                          if (aEnabled !== bEnabled) return aEnabled ? -1 : 1;
                          return b.amount - a.amount;
                        })
                        .map(bill => (
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
                                  <span className="amount">{formatWithSymbol(toDisplayAmount(convertBillToMonthly(bill.amount, bill.frequency)), currency, { minimumFractionDigits: 2 })}</span>
                                  <span className="frequency">{getDisplayModeLabel(displayMode)}</span>
                                </div>
                                <div className="bill-actions">
                                  <Button
                                    variant="icon"
                                    onClick={() => handleToggleBillEnabled(bill)}
                                    title={isBillEnabled(bill) ? 'Disable bill' : 'Enable bill'}
                                  >
                                    {isBillEnabled(bill) ? '⏸️' : '▶️'}
                                  </Button>
                                  <Button
                                    variant="icon"
                                    onClick={() => handleEditBill(bill)}
                                    title="Edit"
                                  >
                                    ✏️
                                  </Button>
                                  <Button
                                    variant="icon"
                                    onClick={() => handleDeleteBill(bill.id)}
                                    title="Delete"
                                  >
                                    🗑️
                                  </Button>
                                </div>
                              </div>
                            </div>
                            {bill.notes && (
                              <div className="bill-notes">{bill.notes}</div>
                            )}
                          </SectionItemCard>
                        ))}
                    </div>
                  ) : (
                    <div className="no-bills-message">
                      No bills assigned to this account yet
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Add/Edit Bill Modal */}
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
              onChange={e => {
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
            <div style={{ flex: 1 }}>
              <FormGroup label="Amount" required error={billFieldErrors.amount}>
                <InputWithPrefix
                  prefix={getCurrencySymbol(currency)}
                  type="number"
                  value={billAmount}
                  onChange={e => {
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
            </div>

            <div style={{ flex: 1, marginLeft: '1rem' }}>
              <FormGroup label="Frequency" required>
                <select
                  value={billFrequency}
                  onChange={e => setBillFrequency(e.target.value as BillFrequency)}
                  required
                >
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="semi-annual">Semi-annual</option>
                  <option value="yearly">Yearly</option>
                </select>
              </FormGroup>
            </div>
          </div>

          <div className="form-row">
            <div style={{ flex: 1 }}>
              <FormGroup label="Paid from Account" required error={billFieldErrors.accountId}>
                <select
                  value={billAccountId}
                  onChange={e => {
                    setBillAccountId(e.target.value);
                    if (billFieldErrors.accountId) {
                      setBillFieldErrors((prev) => ({ ...prev, accountId: undefined }));
                    }
                  }}
                  className={billFieldErrors.accountId ? 'field-error' : ''}
                  required
                >
                  {budgetData.accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.icon || getDefaultAccountIcon(account.type)} {account.name}
                    </option>
                  ))}
                </select>
              </FormGroup>
            </div>
          </div>

          <FormGroup label="Notes">
            <textarea
              value={billNotes}
              onChange={e => setBillNotes(e.target.value)}
              placeholder="Optional notes about this bill"
              rows={2}
            />
          </FormGroup>
      </Modal>
    </div>
  );
};

export default BillsManager;
