import React, { useState, useEffect } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import { useTheme } from '../../contexts/ThemeContext';
import SetupWizard from '../SetupWizard';
import KeyMetrics from '../KeyMetrics';
import PayBreakdown from '../PayBreakdown';
import BillsManager from '../BillsManager';
import './PlanDashboard.css';

type TabView = 'metrics' | 'breakdown' | 'bills';

interface PlanDashboardProps {
  onResetSetup?: () => void;
  viewMode?: string | null; // If set, this is a view-only window
}

const PlanDashboard: React.FC<PlanDashboardProps> = ({ onResetSetup, viewMode }) => {
  const { budgetData, saveBudget, loading, createNewBudget, loadBudget, copyPlanToNewYear } = useBudget();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabView>(
    viewMode && ['metrics', 'breakdown', 'bills'].includes(viewMode) 
      ? viewMode as TabView 
      : 'metrics'
  );
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [newYear, setNewYear] = useState('');

  // Check if initial setup is complete
  useEffect(() => {
    if (budgetData) {
      const { paySettings } = budgetData;
      const isSetupComplete = 
        (paySettings.payType === 'salary' && paySettings.annualSalary && paySettings.annualSalary > 0) ||
        (paySettings.payType === 'hourly' && paySettings.hourlyRate && paySettings.hourlyRate > 0);
      
      setShowSetupWizard(!isSetupComplete);
    }
  }, [budgetData]);

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

    return () => {
      unsubscribeNew();
      unsubscribeOpen();
      unsubscribeEncryption();
      unsubscribeSave();
    };
  }, [createNewBudget, loadBudget, onResetSetup, saveBudget]);

  // Listen for view window open requests
  useEffect(() => {
    if (!window.electronAPI?.onOpenViewWindow || !budgetData?.settings?.filePath) return;

    const unsubscribe = window.electronAPI.onOpenViewWindow((viewType: string) => {
      if (budgetData.settings.filePath) {
        window.electronAPI.openViewWindow(viewType, budgetData.settings.filePath);
      }
    });

    return unsubscribe;
  }, [budgetData?.settings?.filePath]);

  // Save session state when active tab or budget data changes
  useEffect(() => {
    if (!budgetData?.settings?.filePath || !window.electronAPI?.saveSessionState) return;

    window.electronAPI.saveSessionState(budgetData.settings.filePath, activeTab).catch((error) => {
      console.error('Failed to save session state:', error);
    });
  }, [activeTab, budgetData?.settings?.filePath]);

  if (!budgetData) return null;

  if (showSetupWizard) {
    return <SetupWizard onComplete={() => setShowSetupWizard(false)} />;
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
          <div className="header-meta">
            <span className="status">
              {budgetData.settings.encryptionEnabled ? '🔒 Encrypted' : '📄 Unencrypted'}
            </span>
          </div>
        </div>
        <div className="header-right">
          <button 
            className="btn header-btn-icon" 
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
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
            {budgetData?.settings?.filePath && (
              <button
                className="tab-open-window"
                onClick={() => window.electronAPI?.openViewWindow('metrics', budgetData.settings.filePath!)}
                title="Open in New Window"
              >
                ⧉
              </button>
            )}
          </div>
          <div className="tab-button-group">
            <button
              className={`tab-button ${activeTab === 'breakdown' ? 'active' : ''}`}
              onClick={() => setActiveTab('breakdown')}
            >
              <span className="tab-icon">💵</span>
              Pay Breakdown
            </button>
            {budgetData?.settings?.filePath && (
              <button
                className="tab-open-window"
                onClick={() => window.electronAPI?.openViewWindow('breakdown', budgetData.settings.filePath!)}
                title="Open in New Window"
              >
                ⧉
              </button>
            )}
          </div>
          <div className="tab-button-group">
            <button
              className={`tab-button ${activeTab === 'bills' ? 'active' : ''}`}
              onClick={() => setActiveTab('bills')}
            >
              <span className="tab-icon">📋</span>
              Bills
            </button>
            {budgetData?.settings?.filePath && (
              <button
                className="tab-open-window"
                onClick={() => window.electronAPI?.openViewWindow('bills', budgetData.settings.filePath!)}
                title="Open in New Window"
              >
                ⧉
              </button>
            )}
          </div>
        </div>
      )}

      <div className="tab-content">
        {viewMode && <div className="view-mode-header">📺 View-Only: {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}</div>}
        {activeTab === 'metrics' && <KeyMetrics />}
        {activeTab === 'breakdown' && <PayBreakdown />}
        {activeTab === 'bills' && <BillsManager />}
      </div>

      <footer className="dashboard-footer">
        <div className="footer-info">
          <span>Last saved: {new Date(budgetData.updatedAt).toLocaleString()}</span>
          {budgetData.settings.filePath && (
            <>
              <span>•</span>
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
    </div>
  );
};

export default PlanDashboard;
