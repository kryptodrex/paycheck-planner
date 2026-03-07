import React, { useState, useEffect } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import type { Bill, BillFrequency, Account } from '../../types/auth';
import { formatWithSymbol, getCurrencySymbol } from '../../utils/currency';
import { roundUpToCent } from '../../utils/money';
import { Modal, Button, FormGroup, InputWithPrefix, SectionItemCard, ViewModeSelector, PageHeader } from '../shared';
import './BillsManager.css';

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

interface BillsManagerProps {
  scrollToAccountId?: string;
  displayMode: 'paycheck' | 'monthly' | 'yearly';
  onDisplayModeChange: (mode: 'paycheck' | 'monthly' | 'yearly') => void;
}

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

  if (!budgetData) return null;

  const currency = budgetData.settings?.currency || 'USD';

  const handleAddBill = () => {
    setEditingBill(null);
    setBillName('');
    setBillAmount('');
    setBillFrequency('monthly');
    setBillAccountId(budgetData.accounts[0]?.id || '');
    setBillNotes('');
    setShowAddBill(true);
  };

  const handleEditBill = (bill: Bill) => {
    setEditingBill(bill);
    setBillName(bill.name);
    setBillAmount(bill.amount.toString());
    setBillFrequency(bill.frequency);
    setBillAccountId(bill.accountId);
    setBillNotes(bill.notes || '');
    setShowAddBill(true);
  };

  const handleSaveBill = () => {
    const billData = {
      name: billName,
      amount: parseFloat(billAmount),
      frequency: billFrequency,
      accountId: billAccountId,
      notes: billNotes || undefined,
    };

    if (editingBill) {
      updateBill(editingBill.id, billData);
    } else {
      addBill(billData);
    }

    setShowAddBill(false);
    setEditingBill(null);
  };

  const handleDeleteBill = (id: string) => {
    if (confirm('Are you sure you want to delete this bill?')) {
      deleteBill(id);
    }
  };

  // Group bills by account
  const billsByAccount = budgetData.bills.reduce((acc, bill) => {
    if (!acc[bill.accountId]) {
      acc[bill.accountId] = [];
    }
    acc[bill.accountId].push(bill);
    return acc;
  }, {} as Record<string, Bill[]>);

  // Get paychecks per year based on pay frequency
  const getPaychecksPerYear = (): number => {
    const freq = budgetData.paySettings.payFrequency;
    switch (freq) {
      case 'weekly': return 52;
      case 'bi-weekly': return 26;
      case 'semi-monthly': return 24;
      case 'monthly': return 12;
      default: return 26;
    }
  };

  const paychecksPerYear = getPaychecksPerYear();

  // Convert monthly amount to display mode
  const toDisplayAmount = (monthlyAmount: number): number => {
    if (displayMode === 'paycheck') {
      return roundUpToCent(monthlyAmount * 12 / paychecksPerYear);
    }
    if (displayMode === 'yearly') {
      return roundUpToCent(monthlyAmount * 12);
    }
    return monthlyAmount; // Already in monthly
  };

  // Get display mode label
  const getDisplayLabel = (): string => {
    if (displayMode === 'paycheck') return 'Per Paycheck';
    if (displayMode === 'yearly') return 'Yearly';
    return 'Monthly';
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
                return sum + convertToMonthly(bill.amount, bill.frequency);
              }, 0));
              return { account, accountBills, totalMonthly };
            })
            .sort((a, b) => b.totalMonthly - a.totalMonthly)
            .map(({ account, accountBills, totalMonthly }) => {

              return (
                <div key={account.id} id={`account-${account.id}`} className="account-section">
                  <div className="account-header">
                    <div className="account-info">
                      <span className="account-icon">{account.icon || getDefaultIconForType(account.type)}</span>
                      <div>
                        <h3>{account.name}</h3>
                        <span className="account-type">{account.type}</span>
                      </div>
                    </div>
                    <div className="account-total">
                      <span className="total-label">{getDisplayLabel()} Total</span>
                      <span className="total-amount">{formatWithSymbol(toDisplayAmount(totalMonthly), currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {accountBills.length > 0 ? (
                    <div className="bills-list">
                      {accountBills
                        .sort((a, b) => b.amount - a.amount)
                        .map(bill => (
                          <SectionItemCard key={bill.id} className="bill-item">
                            <div className="bill-main">
                              <div className="bill-info">
                                <h4>{bill.name}</h4>
                                <div className="bill-frequency-amount">
                                  Paid {formatFrequency(bill.frequency)}: {formatWithSymbol(bill.amount, currency, { minimumFractionDigits: 2 })}
                                </div>
                              </div>
                              <div className="bill-end">
                                <div className="bill-amount">
                                  <span className="amount">{formatWithSymbol(toDisplayAmount(convertToMonthly(bill.amount, bill.frequency)), currency, { minimumFractionDigits: 2 })}</span>
                                  <span className="frequency">{getDisplayLabel()}</span>
                                </div>
                                <div className="bill-actions">
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
        onClose={() => setShowAddBill(false)}
        header={editingBill ? 'Edit Bill' : 'Add New Bill'}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setShowAddBill(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" onClick={handleSaveBill}>
              {editingBill ? 'Update Bill' : 'Add Bill'}
            </Button>
          </>
        }
      >
        <FormGroup label="Bill Name" required>
            <input
              type="text"
              value={billName}
              onChange={e => setBillName(e.target.value)}
              placeholder="e.g., Electric Bill, Netflix"
              required
            />
          </FormGroup>

          <div className="form-row">
            <div style={{ flex: 1 }}>
              <FormGroup label="Amount" required>
                <InputWithPrefix
                  prefix={getCurrencySymbol(currency)}
                  type="number"
                  value={billAmount}
                  onChange={e => setBillAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
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
              <FormGroup label="Paid from Account" required>
                <select
                  value={billAccountId}
                  onChange={e => setBillAccountId(e.target.value)}
                  required
                >
                  {budgetData.accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.icon || getDefaultIconForType(account.type)} {account.name}
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

// Helper functions
function convertToMonthly(amount: number, frequency: BillFrequency): number {
  let monthly = amount;
  switch (frequency) {
    case 'weekly': monthly = amount * 52 / 12; break;
    case 'bi-weekly': monthly = amount * 26 / 12; break;
    case 'monthly': monthly = amount; break;
    case 'quarterly': monthly = amount * 4 / 12; break;
    case 'semi-annual': monthly = amount * 2 / 12; break;
    case 'yearly': monthly = amount / 12; break;
    default: monthly = amount;
  }
  return roundUpToCent(monthly);
}

function formatFrequency(frequency: BillFrequency): string {
  switch (frequency) {
    case 'bi-weekly': return 'Bi-weekly';
    case 'semi-annual': return 'Semi-annual';
    default: return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  }
}

export default BillsManager;
