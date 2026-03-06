import React, { useState } from 'react';
import type { Account } from '../../../types/auth';
import { Button, InfoBox } from '../';
import './AccountsEditor.css';

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

interface AccountsEditorProps {
  accounts: Account[];
  onAdd: (account: Omit<Account, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Account>) => void;
  onDelete: (id: string) => void;
  showToggleButton?: boolean;
  infoMessage?: string;
  listLabel?: string;
  listSubtitle?: string;
  minAccounts?: number;
}

const AccountsEditor: React.FC<AccountsEditorProps> = ({
  accounts,
  onAdd,
  onUpdate,
  onDelete,
  showToggleButton = true,
  infoMessage,
  listLabel = 'Your Accounts',
  listSubtitle,
  minAccounts = 1,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingIcon, setEditingIcon] = useState('');
  const [editingType, setEditingType] = useState<Account['type']>('checking');
  const [showAddAccountForm, setShowAddAccountForm] = useState(!showToggleButton);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<Account['type']>('checking');
  const [newAccountIcon, setNewAccountIcon] = useState(getDefaultIconForType('checking'));

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

    onUpdate(account.id, {
      name: editingName.trim(),
      icon: editingIcon.trim() || getDefaultIconForType(editingType),
      type: editingType,
      color: getDefaultColorForType(editingType),
    });
    handleCancelEdit();
  };

  const handleAddAccount = () => {
    if (!newAccountName.trim()) {
      return;
    }

    onAdd({
      name: newAccountName.trim(),
      type: newAccountType,
      color: getDefaultColorForType(newAccountType),
      icon: newAccountIcon.trim() || getDefaultIconForType(newAccountType),
      allocationCategories: [],
    });
    setNewAccountName('');
    setNewAccountType('checking');
    setNewAccountIcon(getDefaultIconForType('checking'));
    if (showToggleButton) {
      setShowAddAccountForm(false);
    }
  };

  const handleDeleteAccount = (id: string) => {
    if (accounts.length <= minAccounts) {
      alert(`You must have at least ${minAccounts} account${minAccounts > 1 ? 's' : ''}`);
      return;
    }

    if (confirm('Are you sure you want to delete this account?')) {
      onDelete(id);
    }
  };

  return (
    <div className="accounts-editor">
      {showToggleButton && (
        <Button
          variant="primary"
          className="add-account-toggle-btn"
          onClick={() => setShowAddAccountForm((prev) => !prev)}
        >
          {showAddAccountForm ? 'Hide Add Account Options' : '+ Add New Account'}
        </Button>
      )}

      {showAddAccountForm && (
        <div className="add-account-section">
          {showToggleButton && <h3>Add New Account</h3>}
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

      <div className="accounts-list">
        <h3>{listLabel}</h3>
        {listSubtitle && <p className="accounts-list-subtitle">{listSubtitle}</p>}
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
                      <Button variant="secondary" size="small" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                      <Button variant="primary" size="small" onClick={() => handleSaveEdit(account)}>
                        Save
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="account-name-display">
                  <span className="account-icon-display">
                    {account.icon || getDefaultIconForType(account.type)}
                  </span>
                  <div className="account-info-text">
                    <h4>{account.name}</h4>
                    <span className="account-type">{account.type}</span>
                  </div>
                </div>
              )}
            </div>

            {editingId !== account.id && (
              <div className="account-actions">
                <Button variant="icon" onClick={() => handleStartEdit(account)} title="Edit account">
                  ✎
                </Button>
                <Button variant="icon" onClick={() => handleDeleteAccount(account.id)} title="Delete account">
                  🗑
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {infoMessage && (
        <InfoBox>
          <p>{infoMessage}</p>
        </InfoBox>
      )}
    </div>
  );
};

export default AccountsEditor;
