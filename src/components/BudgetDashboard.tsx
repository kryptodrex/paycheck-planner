import React, { useEffect } from 'react';
import { useBudget } from '../contexts/BudgetContext';
import './BudgetDashboard.css';

interface BudgetDashboardProps {
  onResetSetup?: () => void;  // Callback to go back and reset
}

const BudgetDashboard: React.FC<BudgetDashboardProps> = ({ onResetSetup }) => {
  const { budgetData, saveBudget, addCategory, addTransaction, loading, createNewBudget, loadBudget } = useBudget();

  // Listen for menu events from the Electron application menu bar
  useEffect(() => {
    // Check if we're in Electron and have access to the menu listener
    if (!window.electronAPI?.onMenuEvent) {
      console.log('Menu events not available (not running in Electron)');
      return;
    }

    // Set up listeners for each menu action
    const unsubscribeNew = window.electronAPI.onMenuEvent('new-budget', () => {
      console.log('Menu: New Budget clicked');
      createNewBudget('New Budget');
    });

    const unsubscribeOpen = window.electronAPI.onMenuEvent('open-budget', () => {
      console.log('Menu: Open Budget clicked');
      loadBudget();
    });

    const unsubscribeEncryption = window.electronAPI.onMenuEvent('change-encryption', () => {
      console.log('Menu: Change Encryption clicked');
      onResetSetup?.();
    });

    const unsubscribePreferences = window.electronAPI.onMenuEvent('preferences', () => {
      console.log('Menu: Preferences clicked');
      onResetSetup?.();
    });

    // Clean up listeners on unmount
    return () => {
      unsubscribeNew();
      unsubscribeOpen();
      unsubscribeEncryption();
      unsubscribePreferences();
    };
  }, [createNewBudget, loadBudget, onResetSetup]);

  if (!budgetData) return null;

  const totalIncome = budgetData.transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = budgetData.transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpenses;

  const handleAddCategory = () => {
    const name = prompt('Category Name:');
    const budgetStr = prompt('Monthly Budget:');
    
    if (name && budgetStr) {
      const budget = parseFloat(budgetStr);
      if (!isNaN(budget)) {
        addCategory({
          name,
          budget,
          color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        });
      }
    }
  };

  const handleAddTransaction = () => {
    const description = prompt('Description:');
    const amountStr = prompt('Amount:');
    const type = confirm('Is this income? (Cancel for expense)') ? 'income' : 'expense';
    const categoryId = budgetData.categories[0]?.id || '';

    if (description && amountStr) {
      const amount = parseFloat(amountStr);
      if (!isNaN(amount)) {
        addTransaction({
          description,
          amount,
          type,
          categoryId,
          date: new Date().toISOString(),
        });
      }
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>{budgetData.name}</h1>
        <button className="btn btn-primary" onClick={saveBudget} disabled={loading}>
          {loading ? 'Saving...' : '💾 Save'}
        </button>
      </header>

      <div className="summary-cards">
        <div className="summary-card income">
          <h3>Total Income</h3>
          <p className="amount">${totalIncome.toFixed(2)}</p>
        </div>
        <div className="summary-card expense">
          <h3>Total Expenses</h3>
          <p className="amount">${totalExpenses.toFixed(2)}</p>
        </div>
        <div className="summary-card balance">
          <h3>Balance</h3>
          <p className="amount">${balance.toFixed(2)}</p>
        </div>
      </div>

      <div className="sections">
        <section className="categories-section">
          <div className="section-header">
            <h2>Categories</h2>
            <button className="btn btn-primary" onClick={handleAddCategory}>
              + Add Category
            </button>
          </div>
          <div className="categories-grid">
            {budgetData.categories.length === 0 ? (
              <p className="empty-message">No categories yet. Add one to get started!</p>
            ) : (
              budgetData.categories.map((category) => {
                const spent = budgetData.transactions
                  .filter((t) => t.categoryId === category.id && t.type === 'expense')
                  .reduce((sum, t) => sum + t.amount, 0);
                const percentage = (spent / category.budget) * 100;

                return (
                  <div key={category.id} className="category-card">
                    <div className="category-header">
                      <span
                        className="category-color"
                        style={{ backgroundColor: category.color }}
                      ></span>
                      <h3>{category.name}</h3>
                    </div>
                    <div className="category-budget">
                      <span className="spent">${spent.toFixed(2)}</span>
                      <span className="separator">/</span>
                      <span className="total">${category.budget.toFixed(2)}</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(percentage, 100)}%`,
                          backgroundColor: category.color,
                        }}
                      ></div>
                    </div>
                    <p className="percentage">{percentage.toFixed(1)}% used</p>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="transactions-section">
          <div className="section-header">
            <h2>Recent Transactions</h2>
            <button className="btn btn-primary" onClick={handleAddTransaction}>
              + Add Transaction
            </button>
          </div>
          <div className="transactions-list">
            {budgetData.transactions.length === 0 ? (
              <p className="empty-message">No transactions yet. Add one to track your spending!</p>
            ) : (
              budgetData.transactions
                .slice()
                .reverse()
                .slice(0, 10)
                .map((transaction) => (
                  <div key={transaction.id} className="transaction-item">
                    <div className="transaction-info">
                      <span className="transaction-description">{transaction.description}</span>
                      <span className="transaction-date">
                        {new Date(transaction.date).toLocaleDateString()}
                      </span>
                    </div>
                    <span className={`transaction-amount ${transaction.type}`}>
                      {transaction.type === 'income' ? '+' : '-'}$
                      {transaction.amount.toFixed(2)}
                    </span>
                  </div>
                ))
            )}
          </div>
        </section>
      </div>

      <footer className="dashboard-footer">
        <div className="footer-status">
          <span>{budgetData.settings.encryptionEnabled ? '🔒 Encrypted' : '📄 Unencrypted'}</span>
          <span>•</span>
          <span>File: {budgetData.settings.filePath || 'Not saved yet'}</span>
          <span>•</span>
          <span>Updated: {new Date(budgetData.updatedAt).toLocaleString()}</span>
        </div>
      </footer>
    </div>
  );
};

export default BudgetDashboard;
