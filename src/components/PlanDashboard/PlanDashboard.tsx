import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useBudget } from '../../contexts/BudgetContext';
import SetupWizard from '../SetupWizard';
import EncryptionSetup from '../EncryptionSetup';
import KeyMetrics from '../KeyMetrics';
import PayBreakdown from '../PayBreakdown';
import BillsManager from '../BillsManager';
import BenefitsManager from '../BenefitsManager';
import TaxBreakdown from '../TaxBreakdown';
import Settings from '../Settings';
import AccountsManager from '../AccountsManager';
import { Toast, Modal, Button, FormGroup } from '../shared';
import './PlanDashboard.css';

type TabView = 'metrics' | 'breakdown' | 'bills' | 'benefits' | 'retirement' | 'taxes';
type DisplayMode = 'paycheck' | 'monthly' | 'yearly';

interface PlanDashboardProps {
  onResetSetup?: () => void;
  viewMode?: string | null; // If set, this is a view-only window
}

const PlanDashboard: React.FC<PlanDashboardProps> = ({ onResetSetup, viewMode }) => {
  const { budgetData, saveBudget, loading, createNewBudget, loadBudget, copyPlanToNewYear, closeBudget, updateBudgetSettings } = useBudget();
  const [activeTab, setActiveTab] = useState<TabView>(
    viewMode && ['metrics', 'breakdown', 'bills', 'taxes', 'benefits'].includes(viewMode) 
      ? viewMode as TabView 
      : 'metrics'
  );
  const [scrollToAccountId, setScrollToAccountId] = useState<string | undefined>(undefined);
  const [shouldScrollToRetirement, setShouldScrollToRetirement] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('paycheck');
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [newYear, setNewYear] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [showEncryptionSetup, setShowEncryptionSetup] = useState(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const tabContentRef = useRef<HTMLDivElement | null>(null);
  const tabPanelRefs = useRef<Partial<Record<TabView, HTMLDivElement | null>>>({});

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
      setActiveTab('breakdown');
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

  // Auto-dismiss status toast
  useEffect(() => {
    if (!statusToast) return;
    const timer = window.setTimeout(() => {
      setStatusToast(null);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [statusToast]);

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

  const handleCopyToNewYear = async () => {
    const year = parseInt(newYear);
    if (year && year >= 2000 && year <= 2100) {
      await copyPlanToNewYear(year);
      setShowCopyModal(false);
      setNewYear('');
    }
  };

  const scrollTabToTop = (tab: TabView) => {
    tabContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

    const panel = tabPanelRefs.current[tab];
    if (!panel) return;

    panel.scrollTo({ top: 0, behavior: 'smooth' });

    const scrollableDescendants = panel.querySelectorAll<HTMLElement>('*');
    scrollableDescendants.forEach((element) => {
      if (element.scrollHeight > element.clientHeight) {
        const computedStyle = window.getComputedStyle(element);
        const isScrollable =
          computedStyle.overflowY === 'auto' ||
          computedStyle.overflowY === 'scroll' ||
          computedStyle.overflow === 'auto' ||
          computedStyle.overflow === 'scroll';

        if (isScrollable) {
          element.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    });
  };

  const handleScrollToRetirementComplete = useCallback(() => {
    setShouldScrollToRetirement(false);
  }, []);

  const handleTabClick = (tab: TabView, options?: { resetBillsAnchor?: boolean }) => {
    if (activeTab === tab) {
      scrollTabToTop(tab);
      return;
    }

    if (options?.resetBillsAnchor) {
      setScrollToAccountId(undefined);
      setShouldScrollToRetirement(false);
    }

    setActiveTab(tab);
  };

  return (
    <div className="plan-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>{budgetData.name}</h1>
          <button 
            className="encryption-status-btn"
            onClick={() => setShowEncryptionSetup(true)}
            title="Click to open encryption configuration"
          >
            {budgetData.settings.encryptionEnabled ? '🔒 Encrypted' : '📄 Unencrypted'}
          </button>
        </div>
        <div className="header-right">
          <Button
            variant="secondary"
            onClick={() => setShowAccountsModal(true)}
            title="Manage your financial accounts"
            className="header-btn-secondary"
          >
            🏦 Accounts
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowCopyModal(true)}
            title="Copy this plan to another year"
            className="header-btn-secondary"
          >
            📋 Copy Plan
          </Button>
          <Button
            variant="primary"
            onClick={saveBudget}
            disabled={loading}
            className="header-btn-primary"
          >
            {loading ? 'Saving...' : '💾 Save'}
          </Button>
        </div>
      </header>

      {/* Only show tabs in full mode, not in view-only mode */}
      {!viewMode && (
        <div className="tab-navigation">
          <div className="tab-button-group">
            <button
              className={`tab-button ${activeTab === 'metrics' ? 'active' : ''}`}
              onClick={() => handleTabClick('metrics')}
            >
              <span className="tab-icon">📊</span>
              Key Metrics
            </button>
          </div>
          <div className="tab-button-group">
            <button
              className={`tab-button ${activeTab === 'breakdown' ? 'active' : ''}`}
              onClick={() => handleTabClick('breakdown')}
            >
              <span className="tab-icon">💵</span>
              Pay Breakdown
            </button>
          </div>
          <div className="tab-button-group">
            <button
              className={`tab-button ${activeTab === 'bills' ? 'active' : ''}`}
              onClick={() => handleTabClick('bills', { resetBillsAnchor: true })}
            >
              <span className="tab-icon">📋</span>
              Bills
            </button>
          </div>
          <div className="tab-button-group">
            <button
              className={`tab-button ${activeTab === 'benefits' ? 'active' : ''}`}
              onClick={() => handleTabClick('benefits')}
            >
              <span className="tab-icon">🏥</span>
              Benefits
            </button>
          </div>
          <div className="tab-button-group">
            <button
              className={`tab-button ${activeTab === 'taxes' ? 'active' : ''}`}
              onClick={() => handleTabClick('taxes')}
            >
              <span className="tab-icon">💰</span>
              Taxes
            </button>
          </div>
        </div>
      )}

      <div className="tab-content" ref={tabContentRef}>
        {viewMode && <div className="view-mode-header">📺 View-Only: {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}</div>}
        <div
          className={`tab-panel ${activeTab === 'metrics' ? 'active' : ''}`}
          ref={(element) => {
            tabPanelRefs.current.metrics = element;
          }}
        >
          <KeyMetrics />
        </div>
        <div
          className={`tab-panel ${activeTab === 'breakdown' ? 'active' : ''}`}
          ref={(element) => {
            tabPanelRefs.current.breakdown = element;
          }}
        >
          <PayBreakdown 
            displayMode={displayMode}
            onDisplayModeChange={setDisplayMode}
            onNavigateToBills={(accountId) => {
              setScrollToAccountId(accountId);
              setActiveTab('bills');
            }}
            onNavigateToBenefits={() => {
              setActiveTab('benefits');
            }}
            onNavigateToRetirement={() => {
              setShouldScrollToRetirement(true);
              setActiveTab('benefits');
            }} 
          />
        </div>
        <div
          className={`tab-panel ${activeTab === 'bills' ? 'active' : ''}`}
          ref={(element) => {
            tabPanelRefs.current.bills = element;
          }}
        >
          <BillsManager 
            scrollToAccountId={scrollToAccountId}
            displayMode={displayMode}
            onDisplayModeChange={setDisplayMode}
          />
        </div>
        <div
          className={`tab-panel ${activeTab === 'taxes' ? 'active' : ''}`}
          ref={(element) => {
            tabPanelRefs.current.taxes = element;
          }}
        >
          <TaxBreakdown />
        </div>
        <div
          className={`tab-panel ${activeTab === 'benefits' ? 'active' : ''}`}
          ref={(element) => {
            tabPanelRefs.current.benefits = element;
          }}
        >
          <BenefitsManager 
            shouldScrollToRetirement={shouldScrollToRetirement}
            onScrollToRetirementComplete={handleScrollToRetirementComplete}
          />
        </div>
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
      <Modal
        isOpen={showCopyModal}
        onClose={() => setShowCopyModal(false)}
        header="Copy Plan to New Year"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCopyModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" onClick={handleCopyToNewYear}>
              Copy Plan
            </Button>
          </>
        }
      >
        <p>This will create a copy of your current plan for a different year.</p>
          <FormGroup label="Target Year" required>
            <input
              type="number"
              value={newYear}
              onChange={e => setNewYear(e.target.value)}
              placeholder={`${budgetData.year + 1}`}
              min="2000"
              max="2100"
              required
            />
          </FormGroup>
      </Modal>

      {/* Settings Modal */}
      <Settings 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
      />

      {/* Encryption Setup Modal */}
      <Modal
        isOpen={showEncryptionSetup && !!budgetData}
        onClose={() => setShowEncryptionSetup(false)}
        contentClassName="encryption-modal-content"
      >
        {budgetData && (
          <EncryptionSetup 
            planId={budgetData.id}
            onComplete={(isEncryptionEnabled) => {
              setShowEncryptionSetup(false);
              // Apply the selected encryption state for this plan
              updateBudgetSettings({
                ...budgetData.settings,
                encryptionEnabled: isEncryptionEnabled,
              });
              setStatusToast(
                isEncryptionEnabled
                  ? '🔒 Encryption enabled for this plan'
                  : '📄 Encryption disabled for this plan'
              );
            }}
            onCancel={() => setShowEncryptionSetup(false)}
          />
        )}
      </Modal>

      {statusToast && (
        <Toast 
          message={statusToast}
          duration={2500}
          onDismiss={() => setStatusToast(null)}
        />
      )}

      {/* Accounts Manager Modal */}
      {showAccountsModal && (
        <AccountsManager onClose={() => setShowAccountsModal(false)} />
      )}
    </div>
  );
};

export default PlanDashboard;
