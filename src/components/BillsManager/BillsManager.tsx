import React, { useState, useEffect } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import type { Bill, BillFrequency } from '../../types/auth';
import { formatWithSymbol, getCurrencySymbol } from '../../utils/currency';
import { Modal, Button, FormGroup, InputWithPrefix } from '../shared';
import './BillsManager.css';

interface BillsManagerProps {
  scrollToAccountId?: string;
}

const BillsManager: React.FC<BillsManagerProps> = ({ scrollToAccountId }) => {
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
  const [billCategory, setBillCategory] = useState('');
  const [billNotes, setBillNotes] = useState('');

  if (!budgetData) return null;

  const currency = budgetData.settings?.currency || 'USD';

  const handleAddBill = () => {
    setEditingBill(null);
    setBillName('');
    setBillAmount('');
    setBillFrequency('monthly');
    setBillAccountId(budgetData.accounts[0]?.id || '');
    setBillCategory('');
    setBillNotes('');
    setShowAddBill(true);
  };

  const handleEditBill = (bill: Bill) => {
    setEditingBill(bill);
    setBillName(bill.name);
    setBillAmount(bill.amount.toString());
    setBillFrequency(bill.frequency);
    setBillAccountId(bill.accountId);
    setBillCategory(bill.category || '');
    setBillNotes(bill.notes || '');
    setShowAddBill(true);
  };

  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    
    const billData = {
      name: billName,
      amount: parseFloat(billAmount),
      frequency: billFrequency,
      accountId: billAccountId,
      category: billCategory || undefined,
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

  return (
    <div className="bills-manager">
      <div className="bills-header">
        <div>
          <h2>Bills & Expenses</h2>
          <p>Manage your recurring bills and expenses</p>
        </div>
        <div className="header-actions">
          <Button variant="primary" onClick={handleAddBill}>
            + Add Bill
          </Button>
        </div>
      </div>

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
          <button className="btn btn-primary" onClick={handleAddBill}>
            Add First Bill
          </button>
        </div>
      ) : (
        <div className="bills-by-account">
          {budgetData.accounts.map(account => {
            const accountBills = billsByAccount[account.id] || [];
            const totalMonthly = accountBills.reduce((sum, bill) => {
              return sum + convertToMonthly(bill.amount, bill.frequency);
            }, 0);

            return (
              <div key={account.id} id={`account-${account.id}`} className="account-section">
                <div className="account-header">
                  <div className="account-info">
                    <span className="account-icon">{account.icon || '💳'}</span>
                    <div>
                      <h3>{account.name}</h3>
                      <span className="account-type">{account.type}</span>
                    </div>
                  </div>
                  <div className="account-total">
                    <span className="total-label">Monthly Total</span>
                    <span className="total-amount">{formatWithSymbol(totalMonthly, currency, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {accountBills.length > 0 ? (
                  <div className="bills-list">
                    {accountBills.map(bill => (
                      <div key={bill.id} className="bill-item">
                        <div className="bill-main">
                          <div className="bill-info">
                            <h4>{bill.name}</h4>
                            {bill.category && <span className="bill-category">{bill.category}</span>}
                          </div>
                          <div className="bill-amount">
                            <span className="amount">{formatWithSymbol(bill.amount, currency, { minimumFractionDigits: 2 })}</span>
                            <span className="frequency">{formatFrequency(bill.frequency)}</span>
                          </div>
                        </div>
                        {bill.notes && (
                          <div className="bill-notes">{bill.notes}</div>
                        )}
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
      >
        <h3>{editingBill ? 'Edit Bill' : 'Add New Bill'}</h3>
        <form onSubmit={handleSaveBill}>
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
              <FormGroup label="Account" required>
                <select
                  value={billAccountId}
                  onChange={e => setBillAccountId(e.target.value)}
                  required
                >
                  {budgetData.accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </FormGroup>
            </div>

            <div style={{ flex: 1, marginLeft: '1rem' }}>
              <FormGroup label="Category">
                <input
                  type="text"
                  value={billCategory}
                  onChange={e => setBillCategory(e.target.value)}
                  placeholder="e.g., Utilities, Entertainment"
                />
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

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setShowAddBill(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingBill ? 'Update Bill' : 'Add Bill'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// Helper functions
function convertToMonthly(amount: number, frequency: BillFrequency): number {
  switch (frequency) {
    case 'weekly': return amount * 52 / 12;
    case 'bi-weekly': return amount * 26 / 12;
    case 'monthly': return amount;
    case 'quarterly': return amount * 4 / 12;
    case 'semi-annual': return amount * 2 / 12;
    case 'yearly': return amount / 12;
    default: return amount;
  }
}

function formatFrequency(frequency: BillFrequency): string {
  switch (frequency) {
    case 'bi-weekly': return 'Bi-weekly';
    case 'semi-annual': return 'Semi-annual';
    default: return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  }
}

export default BillsManager;
