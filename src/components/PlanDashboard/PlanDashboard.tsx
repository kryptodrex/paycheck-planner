import React, { useState, useEffect } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import SetupWizard from '../SetupWizard';
import EncryptionSetup from '../EncryptionSetup';
import KeyMetrics from '../KeyMetrics';
import PayBreakdown from '../PayBreakdown';
import BillsManager from '../BillsManager';
import Settings from '../Settings';
import AccountsManager from '../AccountsManager';
import './PlanDashboard.css';

type TabView = 'metrics' | 'breakdown' | 'bills';

interface PlanDashboardProps {
  onResetSetup?: () => void;
  viewMode?: string | null; // If set, this is a view-only window
}

const PlanDashboard: React.FC<PlanDashboardProps> = ({ onResetSetup, viewMode }) => {
  const { budgetData, saveBudget, loading, createNewBudget, loadBudget, copyPlanToNewYear, closeBudget, updateBudgetSettings } = useBudget();
  const [activeTab, setActiveTab] = useState<TabView>(
    viewMode && ['metrics', 'breakdown', 'bills'].includes(viewMode) 
      ? viewMode as TabView 
      : 'metrics'
  );
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [newYear, setNewYear] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showEditPayModal, setShowEditPayModal] = useState(false);
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [showEncryptionSetup, setShowEncryptionSetup] = useState(false);

  // Listen for menu events from Electron
  useEffect(() => {
    if (!window.electronAPI?.onMenuEvent) return;

    const unsubscribeNew = window.electronAPI.onMenuEvent('new-budget', () => {
      const year = new Date().getFullYear();
      createNewBudget(year);
    });

    const unsubscribeOpen = window.electronAPI.onMenuEvent('open-budget', () => {
      loadBudget();
    });

    const unsubscribeEncryption = window.electronAPI.onMenuEvent('change-encryption', () => {
      onResetSetup?.();
    });

    const unsubscribeSave = window.electronAPI.onMenuEvent('save-plan', () => {
      saveBudget();
    });

    const unsubscribeSettings = window.electronAPI.onMenuEvent('open-settings', () => {
      setShowSettings(true);
    });

    const unsubscribePayOptions = window.electronAPI.onMenuEvent('open-pay-options', () => {
      setShowEditPayModal(true);
    });

    const unsubscribeAccounts = window.electronAPI.onMenuEvent('open-accounts', () => {
      setShowAccountsModal(true);
    });

    return () => {
      unsubscribeNew();
      unsubscribeOpen();
      unsubscribeEncryption();
      unsubscribeSave();
      unsubscribeSettings();
      unsubscribePayOptions();
      unsubscribeAccounts();
    };
  }, [createNewBudget, loadBudget, onResetSetup, saveBudget]);

  // Save session state when active tab or budget data changes
  useEffect(() => {
    if (!budgetData?.settings?.filePath || !window.electronAPI?.saveSessionState) return;

    window.electronAPI.saveSessionState(budgetData.settings.filePath, activeTab).catch((error) => {
      console.error('Failed to save session state:', error);
    });
  }, [activeTab, budgetData?.settings?.filePath]);

  // Handle Esc key to close Copy Plan modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showCopyModal) {
        setShowCopyModal(false);
        setNewYear('');
      }
    };

    if (showCopyModal) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showCopyModal]);

  if (!budgetData) return null;

  // Check if initial setup is complete (synchronously, no state needed)
  const { paySettings } = budgetData;
  const isSetupComplete = 
    (paySettings.payType === 'salary' && paySettings.annualSalary && paySettings.annualSalary > 0) ||
    (paySettings.payType === 'hourly' && paySettings.hourlyRate && paySettings.hourlyRate > 0);

  // Show setup wizard if setup is not complete
  if (!isSetupComplete) {
    return (
      <SetupWizard 
        onComplete={() => {
          // Setup is now complete, we'll re-render and show the dashboard
          // This is handled by the parent component re-rendering when budgetData updates
        }}
        onCancel={closeBudget}
      />
    );
  }

  const handleCopyToNewYear = (e: React.FormEvent) => {
    e.preventDefault();
    const year = parseInt(newYear);
    if (year && year >= 2000 && year <= 2100) {
      copyPlanToNewYear(year);
      setShowCopyModal(false);
      setNewYear('');
    }
  };

  return (
    <div className="plan-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>{budgetData.name}</h1>
          <button 
            className="encryption-status-btn"
            onClick={() => setShowSettings(true)}
            title="Click to manage encryption settings"
          >
            {budgetData.settings.encryptionEnabled ? '🔒 Encrypted' : '📄 Unencrypted'}
          </button>
        </div>
        <div className="header-right">
          <button 
            className="btn header-btn-secondary" 
            onClick={() => setShowCopyModal(true)}
            title="Copy this plan to another year"
          >
            📋 Copy Plan
          </button>
          <button 
            className="btn header-btn-primary" 
            onClick={saveBudget} 
            disabled={loading}
          >
            {loading ? 'Saving...' : '💾 Save'}
          </button>
        </div>
      </header>

      {/* Only show tabs in full mode, not in view-only mode */}
      {!viewMode && (
        <div className="tab-navigation">
          <div className="tab-button-group">
            <button
              className={`tab-button ${activeTab === 'metrics' ? 'active' : ''}`}
              onClick={() => setActiveTab('metrics')}
            >
              <span className="tab-icon">📊</span>
              Key Metrics
            </button>
          </div>
          <div className="tab-button-group">
            <button
              className={`tab-button ${activeTab === 'breakdown' ? 'active' : ''}`}
              onClick={() => setActiveTab('breakdown')}
            >
              <span className="tab-icon">💵</span>
              Pay Breakdown
            </button>
          </div>
          <div className="tab-button-group">
            <button
              className={`tab-button ${activeTab === 'bills' ? 'active' : ''}`}
              onClick={() => setActiveTab('bills')}
            >
              <span className="tab-icon">📋</span>
              Bills
            </button>
          </div>
        </div>
      )}

      <div className="tab-content">
        {viewMode && <div className="view-mode-header">📺 View-Only: {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}</div>}
        {activeTab === 'metrics' && <KeyMetrics showEditModal={showEditPayModal} onCloseEditModal={() => setShowEditPayModal(false)} />}
        {activeTab === 'breakdown' && <PayBreakdown />}
        {activeTab === 'bills' && <BillsManager />}
      </div>

      <footer className="dashboard-footer">
        <div className="footer-info">
          <span>Last saved: {new Date(budgetData.updatedAt).toLocaleString()}</span>
          {budgetData.settings.filePath && (
            <>
              <span className="bullet">•</span>
              <span>{budgetData.settings.filePath}</span>
            </>
          )}
        </div>
      </footer>

      {/* Copy Plan Modal */}
      {showCopyModal && (
        <div className="modal-overlay" onClick={() => setShowCopyModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Copy Plan to New Year</h3>
            <p>This will create a copy of your current plan for a different year.</p>
            <form onSubmit={handleCopyToNewYear}>
              <div className="form-group">
                <label htmlFor="newYear">Target Year</label>
                <input
                  type="number"
                  id="newYear"
                  value={newYear}
                  onChange={e => setNewYear(e.target.value)}
                  placeholder={`${budgetData.year + 1}`}
                  min="2000"
                  max="2100"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCopyModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Copy Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <Settings 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        onOpenEncryptionSetup={() => {
          setShowSettings(false);
          setShowEncryptionSetup(true);
        }}
        onOpenPaySettings={() => {
          setShowSettings(false);
          setShowEditPayModal(true);
        }}
        hasActivePlan={!!budgetData}
      />

      {/* Encryption Setup Modal */}
      {showEncryptionSetup && budgetData && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <EncryptionSetup 
              planId={budgetData.id}
              onComplete={() => {
                setShowEncryptionSetup(false);
                // Encryption setup successfully completed, enable encryption in budget settings
                updateBudgetSettings({
                  ...budgetData.settings,
                  encryptionEnabled: true,
                });
              }}
              onCancel={() => setShowEncryptionSetup(false)}
            />
          </div>
        </div>
      )}

      {/* Accounts Manager Modal */}
      {showAccountsModal && (
        <AccountsManager onClose={() => setShowAccountsModal(false)} />
      )}
    </div>
  );
};

export default PlanDashboard;
