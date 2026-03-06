import React, { useState, useEffect } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import { FileStorageService } from '../../services/fileStorage';
import type { RecentFile } from '../../services/fileStorage';
import { Button, FormGroup } from '../shared';
import './WelcomeScreen.css';

interface WelcomeScreenProps {
  initialError?: string;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ initialError }) => {
  const { createNewBudget, createDemoBudget, loadBudget, loading } = useBudget();
  const [planYear, setPlanYear] = useState(new Date().getFullYear().toString());
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [dismissedError, setDismissedError] = useState(false);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  // Load recent files on mount
  useEffect(() => {
    setRecentFiles(FileStorageService.getRecentFiles());
  }, []);

  const handleCreateNew = () => {
    setShowNewPlanForm(true);
  };

  const handleTryDemo = () => {
    createDemoBudget();
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

  const handleOpenRecent = async (filePath: string) => {
    try {
      await loadBudget(filePath);
    } catch (error) {
      console.error('Error opening recent file:', error);
      // Remove the file from recent files if it failed to load
      FileStorageService.removeRecentFile(filePath);
      setRecentFiles(FileStorageService.getRecentFiles());
      alert('Failed to open file: ' + (error as Error).message);
    }
  };

  const handleRemoveRecent = (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the file
    FileStorageService.removeRecentFile(filePath);
    setRecentFiles(FileStorageService.getRecentFiles());
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (showNewPlanForm) {
    return (
      <div className="welcome-screen">
        <div className="welcome-card">
          <h1>Create New Plan</h1>
          <p className="form-description">Start planning your paychecks for a specific year</p>
          <form onSubmit={handleSubmitNew} className="new-budget-form">
            <FormGroup label="Plan Year" required helperText="Choose the year you want to plan for">
              <input
                type="number"
                value={planYear}
                onChange={(e) => setPlanYear(e.target.value)}
                placeholder={new Date().getFullYear().toString()}
                min="2000"
                max="2100"
                autoFocus
                required
              />
            </FormGroup>
            <div className="button-group">
              <Button type="submit" variant="primary" disabled={loading}>
                Create Plan
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowNewPlanForm(false)}
                disabled={loading}
              >
                Cancel
              </Button>
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
          <Button
            variant="primary"
            size="large"
            onClick={handleCreateNew}
            disabled={loading}
            className="btn-large btn-large-main"
          >
            <span className="icon">+</span>
            Create New Plan
          </Button>
          <Button
            variant="secondary"
            size="large"
            onClick={handleLoadExisting}
            disabled={loading}
            className="btn-large btn-large-main"
          >
            <span className="icon">📂</span>
            Open Existing Plan
          </Button>
          <Button
            variant="secondary"
            size="large"
            onClick={handleTryDemo}
            disabled={loading}
            className="btn-large btn-large-demo"
          >
            <span className="icon">✨</span>
            Try Demo
          </Button>
        </div>

        {recentFiles.length > 0 && (
          <div className="recent-files">
            <h3>Recent Plans</h3>
            <div className="recent-files-list">
              {recentFiles.map((file) => (
                <div
                  key={file.filePath}
                  className={`recent-file-item ${loading ? 'disabled' : ''}`}
                  onClick={() => !loading && handleOpenRecent(file.filePath)}
                >
                  <div className="recent-file-info">
                    <div className="recent-file-name">{file.fileName}</div>
                    <div className="recent-file-date">{formatDate(file.lastOpened)}</div>
                  </div>
                  <button
                    className="recent-file-remove"
                    onClick={(e) => handleRemoveRecent(file.filePath, e)}
                    title="Remove from recent"
                    disabled={loading}
                    type="button"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeScreen;
