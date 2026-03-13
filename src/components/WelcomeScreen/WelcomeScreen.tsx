import React, { useState } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import { FileStorageService } from '../../services/fileStorage';
import type { RecentFile } from '../../services/fileStorage';
import { Button, FormGroup, Modal } from '../shared';
import Settings from '../Settings';
import './WelcomeScreen.css';

interface WelcomeScreenProps {
  initialError?: string;
}

interface MissingRecentFileState {
  filePath: string;
  fileName: string;
}

const DEMO_LAUNCH_DELAY_MS = 2200;

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ initialError }) => {
  const { createNewBudget, createDemoBudget, loadBudget, loading } = useBudget();
  const [planYear, setPlanYear] = useState(new Date().getFullYear().toString());
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [dismissedError, setDismissedError] = useState(false);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(() => FileStorageService.getRecentFiles());
  const [showSettings, setShowSettings] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [missingRecentFile, setMissingRecentFile] = useState<MissingRecentFileState | null>(null);
  const [relinkMismatchMessage, setRelinkMismatchMessage] = useState<string | null>(null);
  const [relinkLoading, setRelinkLoading] = useState(false);
  const isBusy = loading || demoLoading;

  const handleCreateNew = () => {
    setShowNewPlanForm(true);
  };

  const handleTryDemo = async () => {
    if (isBusy) return;

    setDemoLoading(true);
    try {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, DEMO_LAUNCH_DELAY_MS);
      });
      createDemoBudget();
    } finally {
      setDemoLoading(false);
    }
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
    if (window.electronAPI?.fileExists) {
      try {
        const exists = await window.electronAPI.fileExists(filePath);
        if (!exists) {
          setMissingRecentFile({
            filePath,
            fileName: filePath.split(/[\\/]/).pop() || filePath,
          });
          setRelinkMismatchMessage(null);
          return;
        }
      } catch (error) {
        console.warn('Unable to verify whether recent file exists:', error);
      }
    }

    try {
      await loadBudget(filePath);
    } catch (error) {
      console.error('Error opening recent file:', error);
      const message = (error as Error).message || 'Unknown error';
      const isFileNotFound = /not found|enoent|no such file/i.test(message);

      if (isFileNotFound) {
        setMissingRecentFile({
          filePath,
          fileName: filePath.split(/[\\/]/).pop() || filePath,
        });
        setRelinkMismatchMessage(null);
        return;
      }

      alert('Failed to open file: ' + message);
    }
  };

  const handleCloseMissingRecentModal = () => {
    if (relinkLoading) return;
    setMissingRecentFile(null);
    setRelinkMismatchMessage(null);
  };

  const handleRemoveMissingRecent = () => {
    if (!missingRecentFile || relinkLoading) return;
    FileStorageService.removeRecentFile(missingRecentFile.filePath);
    setRecentFiles(FileStorageService.getRecentFiles());
    setMissingRecentFile(null);
    setRelinkMismatchMessage(null);
  };

  const handleRelinkMissingRecent = async () => {
    if (!missingRecentFile || relinkLoading) return;

    setRelinkLoading(true);
    try {
      const expectedPlanId = FileStorageService.getKnownPlanIdForFile(missingRecentFile.filePath) || undefined;
      const result = await FileStorageService.relinkMovedBudgetFile(missingRecentFile.filePath, expectedPlanId);
      if (result.status === 'cancelled') {
        return;
      }

      if (result.status === 'mismatch' || result.status === 'invalid') {
        setRelinkMismatchMessage(result.message);
        return;
      }

      setMissingRecentFile(null);
      setRelinkMismatchMessage(null);
      await loadBudget(result.filePath);
      setRecentFiles(FileStorageService.getRecentFiles());
    } catch (error) {
      const message = (error as Error).message || 'Unable to locate moved file.';
      setRelinkMismatchMessage(message);
    } finally {
      setRelinkLoading(false);
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
              <Button type="submit" variant="primary" disabled={isBusy}>
                Create Plan
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowNewPlanForm(false)}
                disabled={isBusy}
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
        <div className="welcome-header">
          <Button
            className="welcome-settings-btn"
            variant="utility"
            size="small"
            onClick={handleTryDemo}
            disabled={isBusy}
            isLoading={demoLoading}
            loadingText="Preparing Demo..."
            title="Try Demo"
            aria-label="Try demo plan"
          >
            ✨ Try Demo
          </Button>

          <Button
            className="welcome-settings-btn"
            variant="utility"
            size="small"
            onClick={() => setShowSettings(true)}
            title="Settings"
            aria-label="Open settings"
          >
            ⚙️ Settings
          </Button>
        </div>
        <h1>Paycheck Planner</h1>
        <p>Make a plan for where every paycheck goes</p>
        <div className="action-buttons">
          <Button
            variant="primary"
            size="large"
            onClick={handleCreateNew}
            disabled={isBusy}
            className="btn-large btn-large-main"
          >
            <span className="icon">+</span>
            Create New Plan
          </Button>
          <Button
            variant="secondary"
            size="large"
            onClick={handleLoadExisting}
            disabled={isBusy}
            className="btn-large btn-large-main"
          >
            <span className="icon">📂</span>
            Open Existing Plan
          </Button>
        </div>

        {recentFiles.length > 0 && (
          <div className="recent-files">
            <h3>Recent Plans</h3>
            <div className="recent-files-list">
              {recentFiles.map((file) => (
                <div
                  key={file.filePath}
                  className={`recent-file-item ${isBusy ? 'disabled' : ''}`}
                  onClick={() => !isBusy && handleOpenRecent(file.filePath)}
                  onKeyDown={(e) => {
                    if (isBusy) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenRecent(file.filePath);
                    }
                  }}
                  role="button"
                  tabIndex={isBusy ? -1 : 0}
                  aria-disabled={isBusy}
                >
                  <div className="recent-file-info">
                    <div className="recent-file-name">{file.fileName}</div>
                    <div className="recent-file-date">{formatDate(file.lastOpened)}</div>
                  </div>
                  <Button
                    variant="remove"
                    className="recent-file-remove"
                    onClick={(e) => handleRemoveRecent(file.filePath, e)}
                    title="Remove from recent"
                    aria-label={`Remove ${file.fileName} from recent plans`}
                    disabled={isBusy}
                    type="button"
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      </div>
      
      <Modal
        isOpen={!!missingRecentFile}
        onClose={handleCloseMissingRecentModal}
        header="Recent File Missing"
        contentClassName="welcome-relink-modal"
        footer={
          <>
            <Button variant="secondary" onClick={handleCloseMissingRecentModal} disabled={relinkLoading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRemoveMissingRecent} disabled={relinkLoading}>
              Remove
            </Button>
            <Button
              variant="primary"
              onClick={handleRelinkMissingRecent}
              isLoading={relinkLoading}
              loadingText="Opening Picker..."
              disabled={relinkLoading}
            >
              Locate File
            </Button>
          </>
        }
      >
        <p className="welcome-relink-modal-message">
          "{missingRecentFile?.fileName || 'This file'}" could not be found. Locate it to open, or remove this entry from Recents.
        </p>
        <code className="welcome-relink-modal-path" title={missingRecentFile?.filePath || ''}>
          {missingRecentFile?.filePath || ''}
        </code>
        {relinkMismatchMessage && <p className="welcome-relink-modal-error">{relinkMismatchMessage}</p>}
      </Modal>
    </div>
  );
};

export default WelcomeScreen;
