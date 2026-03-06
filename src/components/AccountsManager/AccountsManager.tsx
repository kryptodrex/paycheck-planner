import React, { useState, useEffect } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import type { Account } from '../../types/auth';
import { Modal, Button, FormGroup, InfoBox } from '../shared';
import './AccountsManager.css';

interface AccountsManagerProps {
  onClose: () => void;
}

const getDefaultColorForType = (type: Account['type']): string => {
  switch (type) {
    case 'checking':
      return '#667eea';
    case 'savings':
      return '#f093fb';
    case 'investment':
      return '#4facfe';
    case 'other':
      return '#43e97b';
    default:
      return '#667eea';
  }
};

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

const AccountsManager: React.FC<AccountsManagerProps> = ({ onClose }) => {
  const { budgetData, addAccount, updateAccount, updateBudgetData } = useBudget();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingIcon, setEditingIcon] = useState('');
  const [editingType, setEditingType] = useState<Account['type']>('checking');
  const [showAddAccountForm, setShowAddAccountForm] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<Account['type']>('checking');
  const [newAccountIcon, setNewAccountIcon] = useState(getDefaultIconForType('checking'));
  const [deleteTargetAccountId, setDeleteTargetAccountId] = useState<string>('');
  const [deleteDialogState, setDeleteDialogState] = useState<{
    account: Account;
    linkedBills: number;
    linkedBenefits: number;
    linkedRetirement: number;
  } | null>(null);

  const accounts = budgetData?.accounts ?? [];

  useEffect(() => {
    if (editingId && !accounts.some((account) => account.id === editingId)) {
      setEditingId(null);
      setEditingName('');
    }
  }, [accounts, editingId]);

  const handleStartEdit = (account: Account) => {
    setEditingId(account.id);
    setEditingName(account.name);
    setEditingIcon(account.icon || getDefaultIconForType(account.type));
    setEditingType(account.type);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingIcon('');
    setEditingType('checking');
  };

  const handleSaveEdit = (account: Account) => {
    if (!editingName.trim()) {
      handleCancelEdit();
      return;
    }

    updateAccount(account.id, { 
      name: editingName.trim(),
      icon: editingIcon.trim() || getDefaultIconForType(editingType),
      type: editingType,
      color: getDefaultColorForType(editingType)
    });
    handleCancelEdit();
  };

  const handleAddAccount = () => {
    if (!newAccountName.trim()) {
      return;
    }

    addAccount({
      name: newAccountName.trim(),
      type: newAccountType,
      color: getDefaultColorForType(newAccountType),
      icon: newAccountIcon.trim() || getDefaultIconForType(newAccountType),
      allocationCategories: [],
    });
    setNewAccountName('');
    setNewAccountType('checking');
    setNewAccountIcon(getDefaultIconForType('checking'));
    setShowAddAccountForm(false);
  };

  const handleDeleteAccount = (id: string) => {
    if (accounts.length <= 1) {
      alert('You must have at least one account');
      return;
    }

    if (!budgetData) return;

    const accountToDelete = budgetData.accounts.find((account) => account.id === id);
    if (!accountToDelete) return;

    const linkedBills = budgetData.bills.filter((bill) => bill.accountId === id).length;
    const linkedBenefits = budgetData.benefits.filter(
      (benefit) => benefit.deductionSource === 'account' && benefit.sourceAccountId === id
    ).length;
    const linkedRetirement = budgetData.retirement.filter(
      (election) => election.deductionSource === 'account' && election.sourceAccountId === id
    ).length;
    const totalLinkedItems = linkedBills + linkedBenefits + linkedRetirement;

    if (totalLinkedItems === 0) {
      if (confirm('Are you sure you want to delete this account?')) {
        updateBudgetData({
          accounts: budgetData.accounts.filter((account) => account.id !== id),
        });
      }
      return;
    }

    const fallbackAccount = accounts.find((account) => account.id !== id);
    setDeleteTargetAccountId(fallbackAccount?.id || '');
    setDeleteDialogState({
      account: accountToDelete,
      linkedBills,
      linkedBenefits,
      linkedRetirement,
    });
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogState(null);
    setDeleteTargetAccountId('');
  };

  const handleConfirmDelete = (mode: 'reallocate' | 'delete-all') => {
    if (!budgetData || !deleteDialogState) return;

    const accountId = deleteDialogState.account.id;
    const updatedAccounts = budgetData.accounts.filter((account) => account.id !== accountId);

    if (mode === 'reallocate') {
      if (!deleteTargetAccountId || deleteTargetAccountId === accountId) {
        return;
      }

      const updatedBills = budgetData.bills.map((bill) =>
        bill.accountId === accountId ? { ...bill, accountId: deleteTargetAccountId } : bill
      );
      const updatedBenefits = budgetData.benefits.map((benefit) =>
        benefit.deductionSource === 'account' && benefit.sourceAccountId === accountId
          ? { ...benefit, sourceAccountId: deleteTargetAccountId }
          : benefit
      );
      const updatedRetirement = budgetData.retirement.map((election) =>
        election.deductionSource === 'account' && election.sourceAccountId === accountId
          ? { ...election, sourceAccountId: deleteTargetAccountId }
          : election
      );

      updateBudgetData({
        accounts: updatedAccounts,
        bills: updatedBills,
        benefits: updatedBenefits,
        retirement: updatedRetirement,
      });
      handleCloseDeleteDialog();
      return;
    }

    const updatedBills = budgetData.bills.filter((bill) => bill.accountId !== accountId);
    const updatedBenefits = budgetData.benefits.filter(
      (benefit) => !(benefit.deductionSource === 'account' && benefit.sourceAccountId === accountId)
    );
    const updatedRetirement = budgetData.retirement.filter(
      (election) => !(election.deductionSource === 'account' && election.sourceAccountId === accountId)
    );

    updateBudgetData({
      accounts: updatedAccounts,
      bills: updatedBills,
      benefits: updatedBenefits,
      retirement: updatedRetirement,
    });
    handleCloseDeleteDialog();
  };

  if (!budgetData) return null;

  return (
    <>
      <Modal
        isOpen={true}
        onClose={onClose}
        contentClassName="accounts-manager"
        header="Manage Accounts"
        footer={
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        }
      >
        <Button
          variant="primary"
          className="add-account-toggle-btn"
          onClick={() => setShowAddAccountForm((prev) => !prev)}
        >
          {showAddAccountForm ? 'Hide Add Account Options' : '+ Add New Account'}
        </Button>

        {showAddAccountForm && (
          <div className="add-account-section">
            <h3>Add New Account</h3>
            <div className="add-account-form">
              <div className="add-account-row">
                <div className="add-account-field add-account-icon-field">
                  <label className="add-account-label">Icon</label>
                  <input
                    type="text"
                    className="account-icon-input"
                    placeholder="💰"
                    value={newAccountIcon}
                    onChange={(e) => setNewAccountIcon(e.target.value)}
                    maxLength={2}
                    title="Icon (emoji)"
                  />
                </div>
                <div className="add-account-field add-account-name-field">
                  <label className="add-account-label">Account Name</label>
                  <input
                    type="text"
                    className="account-name-input"
                    placeholder="e.g., Emergency Fund, Checking"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddAccount();
                      }
                    }}
                  />
                </div>
                <div className="add-account-field add-account-type-field">
                  <label className="add-account-label">Type</label>
                  <select
                    className="account-type-select"
                    value={newAccountType}
                    onChange={(e) => {
                      const newType = e.target.value as Account['type'];
                      setNewAccountType(newType);
                      setNewAccountIcon(getDefaultIconForType(newType));
                    }}
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                    <option value="investment">Investment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <Button
                variant="primary"
                onClick={handleAddAccount}
                disabled={!newAccountName.trim()}
              >
                Add Account
              </Button>
            </div>
          </div>
        )}

        {/* Existing Accounts List */}
        <div className="accounts-list">
          <h3>Your Accounts</h3>
          {accounts.map((account) => (
            <div key={account.id} className="account-item">
              <div className="account-details">
                {editingId === account.id ? (
                  <>
                    <div className="account-edit-form">
                      <input
                        type="text"
                        className="account-icon-input"
                        value={editingIcon}
                        onChange={(e) => setEditingIcon(e.target.value)}
                        placeholder="💰"
                        maxLength={2}
                      />
                      <input
                        autoFocus
                        type="text"
                        className="account-name-input"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit(account);
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                      />
                      <select
                        className="account-type-select"
                        value={editingType}
                        onChange={(e) => {
                          const newType = e.target.value as Account['type'];
                          setEditingType(newType);
                          if (!editingIcon || editingIcon === getDefaultIconForType(account.type)) {
                            setEditingIcon(getDefaultIconForType(newType));
                          }
                        }}
                      >
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                        <option value="investment">Investment</option>
                        <option value="other">Other</option>
                      </select>
                      <div className="account-edit-actions">
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => handleSaveEdit(account)}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="account-name-display">
                    <span className="account-icon-display">{account.icon || getDefaultIconForType(account.type)}</span>
                    <div className="account-info-text">
                      <h4>{account.name}</h4>
                      <span className="account-type">{account.type}</span>
                    </div>
                  </div>
                )}
              </div>

              {editingId !== account.id && (
                <div className="account-actions">
                  <Button
                    variant="icon"
                    onClick={() => handleStartEdit(account)}
                    title="Edit account"
                  >
                    ✎
                  </Button>
                  <Button
                    variant="icon"
                    onClick={() => handleDeleteAccount(account.id)}
                    title="Delete account"
                  >
                    🗑
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        <InfoBox>
          <strong>Info:</strong> These accounts are specific to this plan. Changes will only affect this plan file.
        </InfoBox>
      </Modal>

      {deleteDialogState && (
        <Modal
          isOpen={true}
          onClose={handleCloseDeleteDialog}
          header={`Delete "${deleteDialogState.account.name}"?`}
          contentClassName="account-delete-modal"
          footer={
            <div className="account-delete-footer">
              <div className="account-delete-footer-main">
                <Button variant="secondary" onClick={handleCloseDeleteDialog}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleConfirmDelete('reallocate')}
                  disabled={!deleteTargetAccountId || deleteTargetAccountId === deleteDialogState.account.id}
                >
                  Re-allocate and Delete
                </Button>
              </div>
              <div className="account-delete-footer-danger">
                <Button variant="danger" onClick={() => handleConfirmDelete('delete-all')}>
                  Delete All Linked Items
                </Button>
              </div>
            </div>
          }
        >
          <div className="account-delete-content">
            <p>
              This account is linked to existing data. Choose whether to move linked items to another account or delete them.
            </p>
            <ul className="account-delete-summary">
              <li>{deleteDialogState.linkedBills} bill(s)</li>
              <li>{deleteDialogState.linkedBenefits} benefit(s)</li>
              <li>{deleteDialogState.linkedRetirement} retirement election(s)</li>
            </ul>

            <FormGroup label="Move linked items to" required>
              <select
                value={deleteTargetAccountId}
                onChange={(e) => setDeleteTargetAccountId(e.target.value)}
              >
                {accounts
                  .filter((account) => account.id !== deleteDialogState.account.id)
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
              </select>
            </FormGroup>
          </div>
        </Modal>
      )}
    </>
  );
};

export default AccountsManager;
