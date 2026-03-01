import React, { useState } from 'react';
import { useBudget } from '../contexts/BudgetContext';
import './WelcomeScreen.css';

const WelcomeScreen: React.FC = () => {
  const { createNewBudget, loadBudget, loading } = useBudget();
  const [budgetName, setBudgetName] = useState('My Budget');
  const [showNewBudgetForm, setShowNewBudgetForm] = useState(false);

  const handleCreateNew = () => {
    setShowNewBudgetForm(true);
  };

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (budgetName.trim()) {
      createNewBudget(budgetName.trim());
    }
  };

  const handleLoadExisting = async () => {
    await loadBudget();
  };

  if (showNewBudgetForm) {
    return (
      <div className="welcome-screen">
        <div className="welcome-card">
          <h1>Create New Budget</h1>
          <form onSubmit={handleSubmitNew} className="new-budget-form">
            <div className="form-group">
              <label htmlFor="budgetName">Budget Name</label>
              <input
                type="text"
                id="budgetName"
                value={budgetName}
                onChange={(e) => setBudgetName(e.target.value)}
                placeholder="Enter budget name"
                autoFocus
                required
              />
            </div>
            <div className="button-group">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                Create Budget
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowNewBudgetForm(false)}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-card">
        <h1>Welcome to Paycheck Planner</h1>
        <p>Manage your finances locally with encrypted storage</p>
        <div className="action-buttons">
          <button
            className="btn btn-primary btn-large"
            onClick={handleCreateNew}
            disabled={loading}
          >
            <span className="icon">+</span>
            Create New Budget
          </button>
          <button
            className="btn btn-secondary btn-large"
            onClick={handleLoadExisting}
            disabled={loading}
          >
            <span className="icon">📂</span>
            Open Existing Budget
          </button>
        </div>
        <div className="features">
          <div className="feature">
            <span className="feature-icon">🔒</span>
            <h3>Encrypted Storage</h3>
            <p>Your data is encrypted and stored securely on your computer</p>
          </div>
          <div className="feature">
            <span className="feature-icon">💾</span>
            <h3>Local Storage</h3>
            <p>Save your budget files anywhere - iCloud, Google Drive, or local folders</p>
          </div>
          <div className="feature">
            <span className="feature-icon">🔓</span>
            <h3>No Login Required</h3>
            <p>Everything runs locally - no account or internet connection needed</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
