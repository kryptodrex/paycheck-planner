import React, { useState } from 'react';
import { useBudget } from '../../../contexts/BudgetContext';
import type { Account } from '../../../types/accounts';
import type { BudgetData } from '../../../types/budget';
import { Modal, Button, FormGroup, AccountsEditor, Dropdown } from '../../_shared';
import './AccountsModal.css';
import './AccountsDeleteModal.css';
import { Sheet } from 'lucide-react';

interface AccountsModalProps {
  onClose: () => void;
}

type LinkedDataKey = 'bills' | 'benefits' | 'retirement' | 'savingsContributions' | 'loans';

type LinkedSummary = {
  key: LinkedDataKey;
  label: string;
  count: number;
};

type LinkedCollectionConfig = {
  key: LinkedDataKey;
  label: string;
  getItems: (data: BudgetData) => Array<unknown>;
  isLinkedToAccount: (item: unknown, accountId: string) => boolean;
  reassignAccount: (item: unknown, targetAccountId: string) => unknown;
};

const LINKED_ACCOUNT_COLLECTIONS: LinkedCollectionConfig[] = [
  {
    key: 'bills',
    label: 'bill(s)',
    getItems: (data) => data.bills,
    isLinkedToAccount: (item, accountId) => (item as BudgetData['bills'][number]).accountId === accountId,
    reassignAccount: (item, targetAccountId) => ({
      ...(item as BudgetData['bills'][number]),
      accountId: targetAccountId,
    }),
  },
  {
    key: 'benefits',
    label: 'deduction(s)',
    getItems: (data) => data.benefits,
    isLinkedToAccount: (item, accountId) => (item as BudgetData['benefits'][number]).sourceAccountId === accountId,
    reassignAccount: (item, targetAccountId) => ({
      ...(item as BudgetData['benefits'][number]),
      deductionSource: 'account' as const,
      sourceAccountId: targetAccountId,
    }),
  },
  {
    key: 'retirement',
    label: 'retirement election(s)',
    getItems: (data) => data.retirement,
    isLinkedToAccount: (item, accountId) => (item as BudgetData['retirement'][number]).sourceAccountId === accountId,
    reassignAccount: (item, targetAccountId) => ({
      ...(item as BudgetData['retirement'][number]),
      deductionSource: 'account' as const,
      sourceAccountId: targetAccountId,
    }),
  },
  {
    key: 'savingsContributions',
    label: 'savings contribution(s)',
    getItems: (data) => data.savingsContributions ?? [],
    isLinkedToAccount: (item, accountId) => (item as NonNullable<BudgetData['savingsContributions']>[number]).accountId === accountId,
    reassignAccount: (item, targetAccountId) => ({
      ...(item as NonNullable<BudgetData['savingsContributions']>[number]),
      accountId: targetAccountId,
    }),
  },
  {
    key: 'loans',
    label: 'loan(s)',
    getItems: (data) => data.loans,
    isLinkedToAccount: (item, accountId) => (item as BudgetData['loans'][number]).accountId === accountId,
    reassignAccount: (item, targetAccountId) => ({
      ...(item as BudgetData['loans'][number]),
      accountId: targetAccountId,
    }),
  },
];

const getLinkedSummaries = (data: BudgetData, accountId: string): LinkedSummary[] => {
  return LINKED_ACCOUNT_COLLECTIONS.map((config) => {
    const count = config.getItems(data).filter((item) => config.isLinkedToAccount(item, accountId)).length;
    return {
      key: config.key,
      label: config.label,
      count,
    };
  });
};

const buildLinkedCollectionUpdates = (
  data: BudgetData,
  accountId: string,
  mode: 'reallocate' | 'delete-all' | 'delete-account',
  targetAccountId?: string,
): Partial<Pick<BudgetData, LinkedDataKey>> => {
  return LINKED_ACCOUNT_COLLECTIONS.reduce((updates, config) => {
    const nextCollection = config.getItems(data).map((item) => {
      if (!config.isLinkedToAccount(item, accountId)) {
        return item;
      }
      if (mode !== 'reallocate' || !targetAccountId) {
        return null;
      }
      return config.reassignAccount(item, targetAccountId);
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    (updates as Record<LinkedDataKey, Array<unknown>>)[config.key] = nextCollection;
    return updates;
  }, {} as Partial<Pick<BudgetData, LinkedDataKey>>);
};

const AccountsModal: React.FC<AccountsModalProps> = ({ onClose }) => {
  const { budgetData, addAccount, updateAccount, updateBudgetData } = useBudget();
  const [deleteTargetAccountId, setDeleteTargetAccountId] = useState<string>('');
  const [deleteDialogState, setDeleteDialogState] = useState<{
    account: Account;
    linkedSummaries: LinkedSummary[];
  } | null>(null);

  const accounts = budgetData?.accounts ?? [];

  const handleAddAccount = (newAccount: Omit<Account, 'id'>) => {
    addAccount({
      ...newAccount,
      allocationCategories: newAccount.allocationCategories || [],
    });
  };

  const handleUpdateAccount = (id: string, updates: Partial<Account>) => {
    updateAccount(id, updates);
  };

  const handleMoveAccount = (fromIndex: number, toIndex: number) => {
    const newAccounts = [...accounts];
    [newAccounts[fromIndex], newAccounts[toIndex]] = [newAccounts[toIndex], newAccounts[fromIndex]];
    updateBudgetData({ accounts: newAccounts });
  };

  const handleDeleteAccount = (id: string) => {
    if (accounts.length <= 1) {
      return;
    }

    if (!budgetData) return;

    const accountToDelete = budgetData.accounts.find((account) => account.id === id);
    if (!accountToDelete) return;

    const linkedSummaries = getLinkedSummaries(budgetData, id);
    const fallbackAccount = accounts.find((account) => account.id !== id);
    setDeleteTargetAccountId(fallbackAccount?.id || '');
    setDeleteDialogState({
      account: accountToDelete,
      linkedSummaries,
    });
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogState(null);
    setDeleteTargetAccountId('');
  };

  const handleConfirmDelete = (mode: 'reallocate' | 'delete-all' | 'delete-account') => {
    if (!budgetData || !deleteDialogState) return;

    const accountId = deleteDialogState.account.id;
    const updatedAccounts = budgetData.accounts.filter((account) => account.id !== accountId);

    if (mode === 'reallocate') {
      if (!deleteTargetAccountId || deleteTargetAccountId === accountId) {
        return;
      }
      const linkedCollectionUpdates = buildLinkedCollectionUpdates(
        budgetData,
        accountId,
        mode,
        deleteTargetAccountId,
      );

      updateBudgetData({
        accounts: updatedAccounts,
        ...linkedCollectionUpdates,
      });
      handleCloseDeleteDialog();
      return;
    }

    const linkedCollectionUpdates = buildLinkedCollectionUpdates(
      budgetData,
      accountId,
      mode,
    );

    updateBudgetData({
      accounts: updatedAccounts,
      ...linkedCollectionUpdates,
    });
    handleCloseDeleteDialog();
  };

  if (!budgetData) return null;

  const totalLinkedItems = deleteDialogState
    ? deleteDialogState.linkedSummaries.reduce((sum, summary) => sum + summary.count, 0)
    : 0;
  const hasLinkedItems = totalLinkedItems > 0;

  return (
    <>
      <Modal
        isOpen={true}
        onClose={onClose}
        contentClassName="accounts-modal"
        header="Manage Your Accounts"
        headerIcon={<Sheet className="ui-icon" aria-hidden="true" />}
        footer={
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        }
      >
        <AccountsEditor
          accounts={accounts}
          onAdd={handleAddAccount}
          onUpdate={handleUpdateAccount}
          onDelete={handleDeleteAccount}
          onMove={handleMoveAccount}
          showToggleButton={true}
          infoMessage="These accounts are specific to this plan, so any changes will only affect this plan file."
        />
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
                {hasLinkedItems ? (
                  <Button
                    variant="primary"
                    onClick={() => handleConfirmDelete('reallocate')}
                    disabled={!deleteTargetAccountId || deleteTargetAccountId === deleteDialogState.account.id}
                  >
                    Re-allocate and Delete
                  </Button>
                ) : (
                  <Button variant="danger" onClick={() => handleConfirmDelete('delete-account')}>
                    Delete Account
                  </Button>
                )}
              </div>
              {hasLinkedItems && (
                <div className="account-delete-footer-danger">
                  <Button className="account-delete-danger-btn" variant="danger" onClick={() => handleConfirmDelete('delete-all')}>
                    Delete All Linked Items
                  </Button>
                </div>
              )}
            </div>
          }
        >
          <div className="account-delete-content">
            {hasLinkedItems ? (
              <>
                <p>
                  This account is linked to existing data. Choose whether to move linked items to another account or delete them.
                </p>
                <ul className="account-delete-summary">
                  {deleteDialogState.linkedSummaries.map((summary) => (
                    <li key={summary.key}>{summary.count} {summary.label}</li>
                  ))}
                </ul>

                <FormGroup label="Move linked items to" required>
                  <Dropdown
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
                  </Dropdown>
                </FormGroup>
              </>
            ) : (
              <p>
                This account has no linked items. Deleting it will only remove the account.
              </p>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default AccountsModal;
