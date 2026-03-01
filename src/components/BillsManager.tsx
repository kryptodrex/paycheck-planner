import React, { useState } from 'react';
import { useBudget } from '../contexts/BudgetContext';
import type { Bill, BillFrequency } from '../types/auth';
import './BillsManager.css';

const BillsManager: React.FC = () => {
  const { budgetData, addBill, updateBill, deleteBill, addAccount } = useBudget();
  const [showAddBill, setShowAddBill] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  // Form state for new/edit bill
  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billFrequency, setBillFrequency] = useState<BillFrequency>('monthly');
  const [billAccountId, setBillAccountId] = useState('');
  const [billCategory, setBillCategory] = useState('');
  const [billNotes, setBillNotes] = useState('');

  // Form state for new account
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<'checking' | 'savings' | 'investment' | 'other'>('checking');

  if (!budgetData) return null;

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

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    
    addAccount({
      name: accountName,
      type: accountType,
      allocation: 0,
      isRemainder: false,
      color: getColorForAccountType(accountType),
    });

    setShowAddAccount(false);
    setAccountName('');
    setAccountType('checking');
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
          <button className="btn btn-secondary" onClick={() => setShowAddAccount(true)}>
            + Add Account
          </button>
          <button className="btn btn-primary" onClick={handleAddBill}>
            + Add Bill
          </button>
        </div>
      </div>

      {budgetData.accounts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏦</div>
          <h3>No Accounts Yet</h3>
          <p>Create an account first to start tracking bills</p>
          <button className="btn btn-primary" onClick={() => setShowAddAccount(true)}>
            Create First Account
          </button>
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
              <div key={account.id} className="account-section">
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
                    <span className="total-amount">${totalMonthly.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
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
                            <span className="amount">${bill.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            <span className="frequency">{formatFrequency(bill.frequency)}</span>
                          </div>
                        </div>
                        {bill.notes && (
                          <div className="bill-notes">{bill.notes}</div>
                        )}
                        <div className="bill-actions">
                          <button className="btn-icon" onClick={() => handleEditBill(bill)} title="Edit">
                            ✏️
                          </button>
                          <button className="btn-icon" onClick={() => handleDeleteBill(bill.id)} title="Delete">
                            🗑️
                          </button>
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
      {showAddBill && (
        <div className="modal-overlay" onClick={() => setShowAddBill(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>{editingBill ? 'Edit Bill' : 'Add New Bill'}</h3>
            <form onSubmit={handleSaveBill}>
              <div className="form-group">
                <label htmlFor="billName">Bill Name *</label>
                <input
                  type="text"
                  id="billName"
                  value={billName}
                  onChange={e => setBillName(e.target.value)}
                  placeholder="e.g., Electric Bill, Netflix"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="billAmount">Amount *</label>
                  <div className="input-with-prefix">
                    <span className="prefix">$</span>
                    <input
                      type="number"
                      id="billAmount"
                      value={billAmount}
                      onChange={e => setBillAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="billFrequency">Frequency *</label>
                  <select
                    id="billFrequency"
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
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="billAccountId">Account *</label>
                  <select
                    id="billAccountId"
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
                </div>

                <div className="form-group">
                  <label htmlFor="billCategory">Category</label>
                  <input
                    type="text"
                    id="billCategory"
                    value={billCategory}
                    onChange={e => setBillCategory(e.target.value)}
                    placeholder="e.g., Utilities, Entertainment"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="billNotes">Notes</label>
                <textarea
                  id="billNotes"
                  value={billNotes}
                  onChange={e => setBillNotes(e.target.value)}
                  placeholder="Optional notes about this bill"
                  rows={2}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddBill(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingBill ? 'Update Bill' : 'Add Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddAccount && (
        <div className="modal-overlay" onClick={() => setShowAddAccount(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Add New Account</h3>
            <form onSubmit={handleAddAccount}>
              <div className="form-group">
                <label htmlFor="accountName">Account Name *</label>
                <input
                  type="text"
                  id="accountName"
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  placeholder="e.g., Main Checking, Emergency Savings"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="accountType">Account Type *</label>
                <select
                  id="accountType"
                  value={accountType}
                  onChange={e => setAccountType(e.target.value as any)}
                  required
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="investment">Investment</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddAccount(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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

function getColorForAccountType(type: string): string {
  const colors: Record<string, string> = {
    checking: '#3b82f6',
    savings: '#10b981',
    investment: '#8b5cf6',
    other: '#6b7280',
  };
  return colors[type] || colors.other;
}

export default BillsManager;
