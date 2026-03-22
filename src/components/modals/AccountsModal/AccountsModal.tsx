import React, { useState } from 'react';
import { useBudget } from '../../../contexts/BudgetContext';
import type { Account } from '../../../types/accounts';
import { Modal, Button, FormGroup, AccountsEditor, Dropdown } from '../../_shared';
import './AccountsModal.css';
import './AccountsDeleteModal.css';

interface AccountsModalProps {
  onClose: () => void;
}

const AccountsModal: React.FC<AccountsModalProps> = ({ onClose }) => {
  const { budgetData, addAccount, updateAccount, updateBudgetData } = useBudget();
  const [deleteTargetAccountId, setDeleteTargetAccountId] = useState<string>('');
  const [deleteDialogState, setDeleteDialogState] = useState<{
    account: Account;
    linkedBills: number;
    linkedBenefits: number;
    linkedRetirement: number;
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

    const linkedBills = budgetData.bills.filter((bill) => bill.accountId === id).length;
    const linkedBenefits = budgetData.benefits.filter(
      (benefit) => benefit.sourceAccountId === id
    ).length;
    const linkedRetirement = budgetData.retirement.filter(
      (election) => election.sourceAccountId === id
    ).length;
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

  const handleConfirmDelete = (mode: 'reallocate' | 'delete-all' | 'delete-account') => {
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
        benefit.sourceAccountId === accountId
          ? { ...benefit, deductionSource: 'account' as const, sourceAccountId: deleteTargetAccountId }
          : benefit
      );
      const updatedRetirement = budgetData.retirement.map((election) =>
        election.sourceAccountId === accountId
          ? { ...election, deductionSource: 'account' as const, sourceAccountId: deleteTargetAccountId }
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
      (benefit) => benefit.sourceAccountId !== accountId
    );
    const updatedRetirement = budgetData.retirement.filter(
      (election) => election.sourceAccountId !== accountId
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

  const totalLinkedItems = deleteDialogState
    ? deleteDialogState.linkedBills + deleteDialogState.linkedBenefits + deleteDialogState.linkedRetirement
    : 0;
  const hasLinkedItems = totalLinkedItems > 0;

  return (
    <>
      <Modal
        isOpen={true}
        onClose={onClose}
        contentClassName="accounts-modal"
        header="Manage Your Accounts"
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
                  <li>{deleteDialogState.linkedBills} bill(s)</li>
                  <li>{deleteDialogState.linkedBenefits} benefit(s)</li>
                  <li>{deleteDialogState.linkedRetirement} retirement election(s)</li>
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
                This account has no linked bills, benefits, or retirement elections. Deleting it will only remove the account.
              </p>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default AccountsModal;
