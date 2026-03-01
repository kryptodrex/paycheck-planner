import React, { useState } from 'react';
import { useBudget } from '../contexts/BudgetContext';
import './WelcomeScreen.css';

interface WelcomeScreenProps {
  initialError?: string;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ initialError }) => {
  const { createNewBudget, loadBudget, loading } = useBudget();
  const [planYear, setPlanYear] = useState(new Date().getFullYear().toString());
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [dismissedError, setDismissedError] = useState(false);

  const handleCreateNew = () => {
    setShowNewPlanForm(true);
  };

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    const year = parseInt(planYear);
    if (year >= 2000 && year <= 2100) {
      createNewBudget(year);
    }
  };

  const handleLoadExisting = async () => {
    await loadBudget();
  };

  if (showNewPlanForm) {
    return (
      <div className="welcome-screen">
        <div className="welcome-card">
          <h1>Create New Plan</h1>
          <p className="form-description">Start planning your paychecks for a specific year</p>
          <form onSubmit={handleSubmitNew} className="new-budget-form">
            <div className="form-group">
              <label htmlFor="planYear">Plan Year</label>
              <input
                type="number"
                id="planYear"
                value={planYear}
                onChange={(e) => setPlanYear(e.target.value)}
                placeholder={new Date().getFullYear().toString()}
                min="2000"
                max="2100"
                autoFocus
                required
              />
              <small>Choose the year you want to plan for</small>
            </div>
            <div className="button-group">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                Create Plan
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowNewPlanForm(false)}
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
      {initialError && !dismissedError && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <div className="error-message">
              <strong>Session Error</strong>
              <p>{initialError}</p>
            </div>
            <button 
              className="error-close"
              onClick={() => setDismissedError(true)}
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <div className="welcome-card">
        <h1>Welcome to Paycheck Planner</h1>
        <p>Plan where every paycheck goes, from gross to net, with year-based planning</p>
        <div className="action-buttons">
          <button
            className="btn btn-primary btn-large"
            onClick={handleCreateNew}
            disabled={loading}
          >
            <span className="icon">+</span>
            Create New Plan
          </button>
          <button
            className="btn btn-secondary btn-large"
            onClick={handleLoadExisting}
            disabled={loading}
          >
            <span className="icon">📂</span>
            Open Existing Plan
          </button>
        </div>
        <div className="features">
          <div className="feature">
            <span className="feature-icon">💰</span>
            <h3>Paycheck Breakdown</h3>
            <p>See exactly where your money goes from gross pay to take-home</p>
          </div>
          <div className="feature">
            <span className="feature-icon">📊</span>
            <h3>Smart Allocations</h3>
            <p>Assign your net pay to accounts and track recurring bills</p>
          </div>
          <div className="feature">
            <span className="feature-icon">🔒</span>
            <h3>Secure & Local</h3>
            <p>Your data stays on your computer with optional encryption</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
