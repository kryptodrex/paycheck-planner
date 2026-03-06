import React, { useState, useEffect } from 'react';
import { AccountsService } from '../../services/accountsService';
import type { Account } from '../../types/auth';
import { Modal, Button, FormGroup } from '../shared';
import './AccountsManager.css';

interface AccountsManagerProps {
  onClose: () => void;
}

const AccountsManager: React.FC<AccountsManagerProps> = ({ onClose }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<Account['type']>('checking');

  // Load accounts from global storage
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = () => {
    setAccounts(AccountsService.getAccounts());
  };

  const handleStartEdit = (account: Account) => {
    setEditingId(account.id);
    setEditingName(account.name);
  };

  const handleSaveEdit = (account: Account) => {
    if (!editingName.trim()) {
      setEditingId(null);
      return;
    }

    AccountsService.updateAccount(account.id, { name: editingName.trim() });
    loadAccounts();
    setEditingId(null);
  };

  const handleAddAccount = () => {
    if (!newAccountName.trim()) {
      return;
    }

    AccountsService.addAccount(newAccountName.trim(), newAccountType);
    loadAccounts();
    setNewAccountName('');
    setNewAccountType('checking');
  };

  const handleDeleteAccount = (id: string) => {
    if (accounts.length <= 1) {
      alert('You must have at least one account');
      return;
    }

    if (confirm('Are you sure you want to delete this account? It will be removed from all plans.')) {
      const success = AccountsService.deleteAccount(id);
      if (success) {
        loadAccounts();
      }
    }
  };

  return (
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
        {/* Add New Account Section */}
        <div className="add-account-section">
          <h3>Add New Account</h3>
          <div className="add-account-form">
            <FormGroup>
              <input
                type="text"
                className="account-name-input"
                placeholder="Account name (e.g., Emergency Fund)"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddAccount();
                  }
                }}
              />
            </FormGroup>
            <FormGroup>
              <select
                className="account-type-select"
                value={newAccountType}
                onChange={(e) => setNewAccountType(e.target.value as Account['type'])}
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
                <option value="investment">Investment</option>
                <option value="other">Other</option>
              </select>
            </FormGroup>
            <Button
              variant="primary"
              onClick={handleAddAccount}
              disabled={!newAccountName.trim()}
            >
              Add Account
            </Button>
          </div>
        </div>

        {/* Existing Accounts List */}
        <div className="accounts-list">
          <h3>Your Accounts</h3>
          {accounts.map((account) => (
            <div key={account.id} className="account-item">
              <div className="account-details">
                {editingId === account.id ? (
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
                        setEditingId(null);
                      }
                    }}
                    onBlur={() => handleSaveEdit(account)}
                  />
                ) : (
                  <div className="account-name-display">
                    <h4>{account.name}</h4>
                    <span className="account-type">{account.type}</span>
                  </div>
                )}
              </div>

              <div className="account-actions">
                {editingId !== account.id && (
                  <>
                    <Button
                      variant="icon"
                      onClick={() => handleStartEdit(account)}
                      title="Edit name"
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
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="info-box-manager">
          <strong>Info:</strong> These accounts are available across all your plans. Deleting an account will remove it from all plans.
        </div>
      </Modal>
    );
};

export default AccountsManager;
