/* eslint-disable react-hooks/set-state-in-effect, react-hooks/preserve-manual-memoization */
type StatusToastType = 'success' | 'warning' | 'error';

interface StatusToastState {
  message: string;
  type: StatusToastType;
}
import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { useBudget } from '../../contexts/BudgetContext';
import { FileStorageService } from '../../services/fileStorage';
import { KeychainService } from '../../services/keychainService';
import SetupWizard from '../SetupWizard';
import EncryptionConfigPanel from '../EncryptionSetup/EncryptionConfigPanel';
import KeyMetrics from '../KeyMetrics';
import PayBreakdown from '../PayBreakdown';
import BillsManager from '../BillsManager';
import LoansManager from '../LoansManager';
import BenefitsManager from '../BenefitsManager';
import TaxBreakdown from '../TaxBreakdown';
import Settings from '../Settings';
import AccountsManager from '../AccountsManager';
import ExportModal from '../ExportModal';
import FeedbackModal from '../FeedbackModal';
import { PlanTabs, TabManagementModal } from './PlanTabs';
import { Toast, Modal, Button, FormGroup } from '../shared';
import { initializeTabConfigs, getVisibleTabs, getHiddenTabs, toggleTabVisibility, reorderTabs } from '../../utils/tabManagement';
import type { TabPosition, TabDisplayMode, TabConfig } from '../../types/auth';
import './PlanDashboard.css';

import type { TabId } from '../../utils/tabManagement';

type DisplayMode = 'paycheck' | 'monthly' | 'yearly';

interface PlanDashboardProps {
  onResetSetup?: () => void;
  viewMode?: string | null; // If set, this is a view-only window
}

const VALID_TABS: TabId[] = ['metrics', 'breakdown', 'bills', 'loans', 'taxes', 'benefits'];

const PlanDashboard: React.FC<PlanDashboardProps> = ({ onResetSetup, viewMode }) => {
  const { budgetData, saveBudget, loading, createNewBudget, loadBudget, copyPlanToNewYear, closeBudget, updateBudgetSettings, updateBudgetData } = useBudget();
  const getInitialTab = () => {
    if (viewMode && VALID_TABS.includes(viewMode as TabId)) {
      return viewMode as TabId;
    }

    const savedTab = budgetData?.settings?.activeTab;
    if (savedTab && VALID_TABS.includes(savedTab as TabId)) {
      return savedTab as TabId;
    }

    return 'metrics' as TabId;
  };

  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);
  const [scrollToAccountId, setScrollToAccountId] = useState<string | undefined>(undefined);
  const [shouldScrollToRetirement, setShouldScrollToRetirement] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('paycheck');
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [newYear, setNewYear] = useState('');
  const [copyYearError, setCopyYearError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [showEncryptionSetup, setShowEncryptionSetup] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isEditingPlanName, setIsEditingPlanName] = useState(false);
  const [draftPlanName, setDraftPlanName] = useState('');
  const [draftYear, setDraftYear] = useState('');
  const [encryptionEnabled, setEncryptionEnabled] = useState<boolean | null>(null);
  const [customKey, setCustomKey] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [useCustomKey, setUseCustomKey] = useState(false);
  const [encryptionSaving, setEncryptionSaving] = useState(false);
  const [statusToast, setStatusToast] = useState<StatusToastState | null>(null);
  const [showTabManagementModal, setShowTabManagementModal] = useState(false);
  const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [temporarilyVisibleTab, setTemporarilyVisibleTab] = useState<TabId | null>(null);
  const [showPlanLoadingScreen, setShowPlanLoadingScreen] = useState(false);
  const [tabPosition, setTabPosition] = useState<TabPosition>('left');
  const [tabDisplayMode, setTabDisplayMode] = useState<TabDisplayMode>('icons-with-labels');
  const tabContentRef = useRef<HTMLDivElement | null>(null);
  const tabPanelRefs = useRef<Partial<Record<TabId, HTMLDivElement | null>>>({});
  const planLoadingStartRef = useRef<number | null>(null);
  const planLoadingTimeoutRef = useRef<number | null>(null);
  const dragCurrentIndexRef = useRef<number | null>(null);
  const dragStartIndexRef = useRef<number | null>(null);
  const movedDuringDragRef = useRef(false);
  const latestTabConfigsRef = useRef<TabConfig[]>([]);
  const handleSaveRef = useRef<(() => Promise<void>) | null>(null);
  const handleTabPositionChangeRef = useRef<((position: TabPosition) => void) | null>(null);
  const handleTabDisplayModeChangeRef = useRef<((mode: TabDisplayMode) => void) | null>(null);
  const tabDisplayModeRef = useRef<TabDisplayMode>('icons-with-labels');
  const initializedTabContextRef = useRef<string | null>(null);

  // Initialize tab configs from budget settings or use defaults
  const tabConfigs = useMemo(() => {
    return budgetData?.settings?.tabConfigs 
      ? initializeTabConfigs(budgetData.settings.tabConfigs)
      : initializeTabConfigs();
  }, [budgetData?.settings?.tabConfigs]);
  
  const visibleTabs = useMemo(() => getVisibleTabs(tabConfigs), [tabConfigs]);
  const hiddenTabs = useMemo(() => getHiddenTabs(tabConfigs), [tabConfigs]);
  const visibleTabsForRender = useMemo(() => {
    if (!temporarilyVisibleTab) return visibleTabs;

    const alreadyVisible = visibleTabs.some((tab) => tab.id === temporarilyVisibleTab);
    if (alreadyVisible) return visibleTabs;

    const tempTab = tabConfigs.find((tab) => tab.id === temporarilyVisibleTab);
    if (!tempTab) return visibleTabs;

    const maxOrder = visibleTabs.reduce((max, tab) => Math.max(max, tab.order), -1);
    return [...visibleTabs, { ...tempTab, visible: true, order: maxOrder + 1 }];
  }, [visibleTabs, tabConfigs, temporarilyVisibleTab]);

  useEffect(() => {
    latestTabConfigsRef.current = tabConfigs;
  }, [tabConfigs]);

  useEffect(() => {
    if (!temporarilyVisibleTab) return;
    if (activeTab !== temporarilyVisibleTab) {
      setTemporarilyVisibleTab(null);
    }
  }, [activeTab, temporarilyVisibleTab]);

  // Restore active tab before paint to avoid flashing default tab
  useLayoutEffect(() => {
    const tabRestoreContext = `${budgetData?.id ?? 'none'}:${viewMode ?? 'default'}`;
    if (initializedTabContextRef.current === tabRestoreContext) {
      return;
    }

    if (viewMode && VALID_TABS.includes(viewMode as TabId)) {
      setActiveTab(viewMode as TabId);
      initializedTabContextRef.current = tabRestoreContext;
      return;
    }

    const savedTab = budgetData?.settings?.activeTab;
    if (savedTab && VALID_TABS.includes(savedTab as TabId)) {
      setActiveTab(savedTab as TabId);
      initializedTabContextRef.current = tabRestoreContext;
      return;
    }

    initializedTabContextRef.current = tabRestoreContext;
  }, [budgetData?.id, budgetData?.settings?.activeTab, viewMode]);

  // Keep window.__currentActive Tab in sync for save on close
  useEffect(() => {
    window.__currentActiveTab = activeTab;
    return () => {
      delete window.__currentActiveTab;
    };
  }, [activeTab]);

  // Initialize tab position and display mode from budget settings
  useEffect(() => {
    if (budgetData?.settings?.tabPosition) {
      setTabPosition(budgetData.settings.tabPosition);
    }
    if (budgetData?.settings?.tabDisplayMode) {
      setTabDisplayMode(budgetData.settings.tabDisplayMode);
    }
  }, [budgetData?.settings?.tabDisplayMode, budgetData?.settings?.tabPosition]);

  // Handle tab position changes
  const handleTabPositionChange = useCallback((newPosition: TabPosition) => {
    if (newPosition === tabPosition || !budgetData) return;
    
    setTabPosition(newPosition);
    
    // Update settings immediately, preserving all existing properties
    updateBudgetSettings({
      ...budgetData.settings,
      tabPosition: newPosition,
    });
  }, [tabPosition, budgetData, updateBudgetSettings]);

  // Handle tab display mode changes
  const handleTabDisplayModeChange = useCallback((newMode: TabDisplayMode) => {
    if (newMode === tabDisplayMode || !budgetData) return;
    
    setTabDisplayMode(newMode);
    
    // Update settings immediately, preserving all existing properties
    updateBudgetSettings({
      ...budgetData.settings,
      tabDisplayMode: newMode,
    });
  }, [tabDisplayMode, budgetData, updateBudgetSettings]);

  // Handle save with success toast
  const handleSave = useCallback(async () => {
    if (!budgetData) return;

    const success = await saveBudget(activeTab, {
      settings: {
        ...budgetData.settings,
        tabConfigs: latestTabConfigsRef.current,
        tabPosition,
        tabDisplayMode,
      },
    });
    if (success) {
      setStatusToast({ message: 'Saved successfully', type: 'success' });
    }
  }, [saveBudget, activeTab, budgetData, tabPosition, tabDisplayMode]);

  // Keep refs updated with latest handlers to prevent event listener duplication
  useEffect(() => {
    handleSaveRef.current = handleSave;
    handleTabPositionChangeRef.current = handleTabPositionChange;
    handleTabDisplayModeChangeRef.current = handleTabDisplayModeChange;
    tabDisplayModeRef.current = tabDisplayMode;
  }, [handleSave, handleTabPositionChange, handleTabDisplayModeChange, tabDisplayMode]);

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
      handleSaveRef.current?.();
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

    const unsubscribeSetTabPosition = window.electronAPI.onMenuEvent('set-tab-position', (position) => {
      if (
        position === 'top' ||
        position === 'bottom' ||
        position === 'left' ||
        position === 'right'
      ) {
        handleTabPositionChangeRef.current?.(position);
      }
    });

    const unsubscribeToggleDisplayMode = window.electronAPI.onMenuEvent('toggle-tab-display-mode', () => {
      const newMode: TabDisplayMode = tabDisplayModeRef.current === 'icons-only' ? 'icons-with-labels' : 'icons-only';
      handleTabDisplayModeChangeRef.current?.(newMode);
    });

    return () => {
      unsubscribeNew();
      unsubscribeOpen();
      unsubscribeEncryption();
      unsubscribeSave();
      unsubscribeSettings();
      unsubscribePayOptions();
      unsubscribeAccounts();
      unsubscribeSetTabPosition();
      unsubscribeToggleDisplayMode();
    };
  }, [createNewBudget, loadBudget, onResetSetup]);

  // Save session state when active tab or budget data changes
  useEffect(() => {
    if (!budgetData?.settings?.filePath || !window.electronAPI?.saveSessionState) return;

    window.electronAPI.saveSessionState(budgetData.settings.filePath, activeTab).catch((error) => {
      console.error('Failed to save session state:', error);
    });
  }, [activeTab, budgetData?.settings?.filePath]);

  // Auto-dismiss status toast
  useEffect(() => {
    if (!statusToast) return;
    const timer = window.setTimeout(() => {
      setStatusToast(null);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [statusToast]);

  // Show a dedicated loading screen when reopening/loading a plan.
  // Keep it visible for at least 1 second so users don't see tab/content flashing.
  useEffect(() => {
    const isPlanLoadInProgress = loading && !budgetData;

    if (isPlanLoadInProgress) {
      if (planLoadingTimeoutRef.current) {
        window.clearTimeout(planLoadingTimeoutRef.current);
        planLoadingTimeoutRef.current = null;
      }

      if (planLoadingStartRef.current === null) {
        planLoadingStartRef.current = Date.now();
      }

      setShowPlanLoadingScreen(true);
      return;
    }

    if (showPlanLoadingScreen && planLoadingStartRef.current !== null) {
      const elapsed = Date.now() - planLoadingStartRef.current;
      const remaining = Math.max(0, 1000 - elapsed);

      planLoadingTimeoutRef.current = window.setTimeout(() => {
        setShowPlanLoadingScreen(false);
        planLoadingStartRef.current = null;
        planLoadingTimeoutRef.current = null;
      }, remaining);
    }

    return () => {
      if (planLoadingTimeoutRef.current) {
        window.clearTimeout(planLoadingTimeoutRef.current);
        planLoadingTimeoutRef.current = null;
      }
    };
  }, [loading, budgetData, showPlanLoadingScreen]);

  const handleScrollToRetirementComplete = useCallback(() => {
    setShouldScrollToRetirement(false);
  }, []);

  // Tab management handlers
  const handleToggleTabVisibility = useCallback((tabId: string, visible: boolean) => {
    if (!budgetData) return;
    
    // Prevent hiding the last visible tab
    if (!visible) {
      const currentVisibleCount = tabConfigs.filter(t => t.visible).length;
      if (currentVisibleCount <= 1) {
        alert('Cannot hide the last visible tab. At least one tab must remain visible.');
        return;
      }
    }
    
    const updatedConfigs = toggleTabVisibility(tabConfigs, tabId, visible);
    updateBudgetSettings({
      ...budgetData.settings,
      tabConfigs: updatedConfigs,
    });
    
    // If hiding the active tab, switch to metrics
    if (!visible && activeTab === tabId) {
      setActiveTab('metrics');
    }
  }, [budgetData, tabConfigs, activeTab, updateBudgetSettings]);

  const handleReorderTab = useCallback((fromIndex: number, toIndex: number) => {
    if (!budgetData) return;
    const updatedConfigs = reorderTabs(tabConfigs, fromIndex, toIndex);
    latestTabConfigsRef.current = updatedConfigs;
    updateBudgetSettings({
      ...budgetData.settings,
      tabConfigs: updatedConfigs,
    });
  }, [budgetData, tabConfigs, updateBudgetSettings]);

  const handleHideTab = useCallback((tabId: string) => {
    handleToggleTabVisibility(tabId, false);
  }, [handleToggleTabVisibility]);

  const handleDragStart = useCallback((index: number) => {
    setDraggedTabIndex(index);
    setDropTargetIndex(index);
    dragCurrentIndexRef.current = index;
    dragStartIndexRef.current = index;
    movedDuringDragRef.current = false;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, hoverIndex: number) => {
    e.preventDefault();

    // Only handle drag over if we're dragging a tab (not the position handle or other elements)
    const types = Array.from(e.dataTransfer.types);
    if (!types.includes('text/tab-index')) {
      return;
    }

    e.dataTransfer.dropEffect = 'move';
    setDropTargetIndex(hoverIndex);

    const startIndex = dragStartIndexRef.current;
    if (startIndex !== null && startIndex !== hoverIndex) {
      movedDuringDragRef.current = true;
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    const startIndex = dragStartIndexRef.current;
    if (
      budgetData &&
      startIndex !== null &&
      dropIndex !== startIndex
    ) {
      const updatedConfigs = reorderTabs(latestTabConfigsRef.current, startIndex, dropIndex);
      latestTabConfigsRef.current = updatedConfigs;
      updateBudgetSettings({
        ...budgetData.settings,
        tabConfigs: updatedConfigs,
      });
    }

    if (movedDuringDragRef.current) {
      setStatusToast({ message: '📋 Tab order updated', type: 'success' });
    }

    flushSync(() => {
      setDraggedTabIndex(null);
      setDropTargetIndex(null);
    });
    dragCurrentIndexRef.current = null;
    dragStartIndexRef.current = null;
    movedDuringDragRef.current = false;
  }, [budgetData, updateBudgetSettings]);

  const handleDragEnd = useCallback(() => {
    flushSync(() => {
      setDraggedTabIndex(null);
      setDropTargetIndex(null);
    });
    dragCurrentIndexRef.current = null;
    dragStartIndexRef.current = null;
    movedDuringDragRef.current = false;
  }, []);

  const openTabFromLink = useCallback((tab: TabId, options?: { scrollToAccountId?: string; scrollToRetirement?: boolean }) => {
    const targetTabConfig = tabConfigs.find((config) => config.id === tab);
    const isHidden = targetTabConfig ? !targetTabConfig.visible : false;

    if (options?.scrollToAccountId !== undefined) {
      setScrollToAccountId(options.scrollToAccountId);
    }
    if (options?.scrollToRetirement !== undefined) {
      setShouldScrollToRetirement(options.scrollToRetirement);
    }

    if (isHidden) {
      setTemporarilyVisibleTab(tab);
    }

    setActiveTab(tab);
  }, [tabConfigs]);

  const scrollTabToTop = useCallback((tab: TabId) => {
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
  }, []);

  const handleTabClick = useCallback((tab: TabId, options?: { resetBillsAnchor?: boolean }) => {
    if (activeTab === tab) {
      scrollTabToTop(tab);
      return;
    }

    if (options?.resetBillsAnchor) {
      setScrollToAccountId(undefined);
      setShouldScrollToRetirement(false);
    }

    setActiveTab(tab);
  }, [activeTab, scrollTabToTop]);

  // Handle keyboard shortcuts for tab switching (Cmd+1, Cmd+2, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const modifierKey = e.metaKey || e.ctrlKey;
      if (!modifierKey || e.shiftKey || e.altKey) return;

      const num = parseInt(e.key);
      if (isNaN(num) || num < 1 || num > 6) return;

      const targetTab = visibleTabs[num - 1];
      if (!targetTab) return;

      e.preventDefault();
      e.stopPropagation();
      handleTabClick(targetTab.id as TabId);
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [visibleTabs, handleTabClick]);

  if (showPlanLoadingScreen) {
    return (
      <div className="plan-loading-screen" role="status" aria-live="polite" aria-label="Loading plan">
        <div className="plan-loading-card">
          <div className="plan-loading-spinner" aria-hidden="true" />
          <h2>Loading your plan…</h2>
          <p>Decrypting and preparing your dashboard.</p>
        </div>
      </div>
    );
  }

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
    const year = parseInt(newYear, 10);
    if (!year || year < 2000 || year > 2100) {
      setCopyYearError('Please enter a valid year between 2000 and 2100.');
      return;
    }

    setCopyYearError(null);
    await copyPlanToNewYear(year);
    setShowCopyModal(false);
    setNewYear('');
  };

  const handleGenerateEncryptionKey = () => {
    const key = FileStorageService.generateEncryptionKey();
    setGeneratedKey(key);
    setUseCustomKey(false);
  };

  const handleEncryptionModalOpen = () => {
    setEncryptionEnabled(null);
    setCustomKey('');
    setGeneratedKey('');
    setUseCustomKey(false);
    setShowEncryptionSetup(true);
  };

  const handleStartPlanEdit = () => {
    setDraftPlanName(budgetData?.name || '');
    setDraftYear(String(budgetData?.year || new Date().getFullYear()));
    setIsEditingPlanName(true);
  };

  const handleCancelPlanEdit = () => {
    setIsEditingPlanName(false);
    setDraftPlanName('');
    setDraftYear('');
  };

  const handleSavePlanEdit = () => {
    if (!budgetData) {
      handleCancelPlanEdit();
      return;
    }

    const nextName = draftPlanName.trim();
    const nextYear = parseInt(draftYear.trim(), 10);

    // Validate name
    if (!nextName) {
      setStatusToast({ message: '⚠️ Plan name cannot be empty', type: 'warning' });
      return;
    }

    // Validate year
    if (isNaN(nextYear) || nextYear < 2000 || nextYear > 2100) {
      setStatusToast({ message: '⚠️ Please enter a valid year (2000-2100)', type: 'warning' });
      return;
    }

    // Check if anything changed
    const nameChanged = nextName !== budgetData.name;
    const yearChanged = nextYear !== budgetData.year;

    if (!nameChanged && !yearChanged) {
      handleCancelPlanEdit();
      return;
    }

    // Update both fields
    updateBudgetData({ name: nextName, year: nextYear });
    setStatusToast({ message: '✏️ Plan updated', type: 'success' });
    setIsEditingPlanName(false);
  };

  const handleEncryptionModalClose = () => {
    setShowEncryptionSetup(false);
    setEncryptionEnabled(null);
    setCustomKey('');
    setGeneratedKey('');
    setUseCustomKey(false);
    setEncryptionSaving(false);
  };

  const handleSaveEncryption = async () => {
    if (!budgetData) return;
    
    setEncryptionSaving(true);
    try {
      const settings = FileStorageService.getAppSettings();
      
      if (encryptionEnabled) {
        const keyToUse = useCustomKey ? customKey : generatedKey;
        
        if (!keyToUse) {
          alert('Please generate or enter an encryption key.');
          setEncryptionSaving(false);
          return;
        }
        
        settings.encryptionEnabled = true;
        await KeychainService.saveKey(budgetData.id, keyToUse);
      } else {
        settings.encryptionEnabled = false;
        await KeychainService.deleteKey(budgetData.id);
      }
      
      FileStorageService.saveAppSettings(settings);
      updateBudgetSettings({
        ...budgetData.settings,
        encryptionEnabled: Boolean(encryptionEnabled),
      });
      
      setStatusToast({
        message: encryptionEnabled
          ? '🔒 Encryption enabled for this plan'
          : '📄 Encryption disabled for this plan',
        type: 'success',
      });
      handleEncryptionModalClose();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to save encryption settings: ${errorMsg}`);
      setEncryptionSaving(false);
    }
  };

  const showYearSubtitle = !budgetData.name.includes(String(budgetData.year));

  const handleRevealSavedFile = async () => {
    if (!budgetData?.settings?.filePath || !window.electronAPI?.revealInFolder) return;
    const result = await window.electronAPI.revealInFolder(budgetData.settings.filePath);
    if (!result.success) {
      setStatusToast({ message: '⚠️ Unable to open file location', type: 'error' });
    }
  };

  return (
    <div className={`plan-dashboard layout-with-tabs-${tabPosition}`}>
      <header className="dashboard-header">
        <div className="header-left">
          <div className="plan-title-block">
            {isEditingPlanName ? (
              <div className="plan-edit-container">
                <div className="plan-edit-fields">
                  <div className="plan-edit-field">
                    <label>Name:</label>
                    <input
                      type="text"
                      value={draftPlanName}
                      onChange={(event) => setDraftPlanName(event.target.value)}
                      className="plan-title-input"
                      placeholder="Plan name"
                      autoFocus
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          handleSavePlanEdit();
                        }
                        if (event.key === 'Escape') {
                          handleCancelPlanEdit();
                        }
                      }}
                    />
                  </div>
                  <div className="plan-edit-field">
                    <label>Year:</label>
                    <input
                      type="number"
                      value={draftYear}
                      onChange={(event) => setDraftYear(event.target.value)}
                      className="plan-year-input"
                      placeholder="Year"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          handleSavePlanEdit();
                        }
                        if (event.key === 'Escape') {
                          handleCancelPlanEdit();
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="plan-edit-buttons">
                  <Button
                    variant="secondary"
                    size="xsmall"
                    className="header-btn-secondary plan-title-btn"
                    onClick={handleSavePlanEdit}
                  >
                    Save
                  </Button>
                  <Button
                    variant="secondary"
                    size="xsmall"
                    className="header-btn-secondary plan-title-btn"
                    onClick={handleCancelPlanEdit}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="plan-title-view-row">
                <h1>{budgetData.name}</h1>
                <Button
                  variant="secondary"
                  size="xsmall"
                  className="header-btn-secondary plan-title-btn"
                  onClick={handleStartPlanEdit}
                  title="Edit plan name and year"
                >
                  Edit
                </Button>
              </div>
            )}
            {showYearSubtitle && !isEditingPlanName && (
              <p className="plan-year-subtitle">Year: {budgetData.year}</p>
            )}
          </div>
          <button 
            className="encryption-status-btn"
            onClick={handleEncryptionModalOpen}
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
          {/* Disabled until PDF export is fully implemented */}
          {/* <Button
            variant="secondary"
            onClick={() => setShowExportModal(true)}
            title="Export plan to PDF"
            className="header-btn-secondary"
          >
            📄 Export PDF
          </Button> */}
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={loading}
            className="header-btn-primary"
          >
            💾 Save
          </Button>
        </div>
      </header>

      {/* Content area wrapper (contains tabs for left/right, content for all) */}
      <div className="plan-dashboard-content-wrapper">
        {/* Tabs on left (inside content wrapper) */}
        {!viewMode && tabPosition === 'left' && (
          <PlanTabs
            visibleTabs={visibleTabsForRender}
            activeTab={activeTab}
            onTabClick={handleTabClick}
            onManageTabs={() => setShowTabManagementModal(true)}
            onHideTab={handleHideTab}
            draggedTabIndex={draggedTabIndex}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            dropTargetIndex={dropTargetIndex}
            tabPosition={tabPosition}
            tabDisplayMode={tabDisplayMode}
            onTabPositionChange={handleTabPositionChange}
            onTabDisplayModeChange={handleTabDisplayModeChange}
          />
        )}

        {/* Main content area */}
        <div className="plan-dashboard-main">
          {/* Tabs on top (after header) */}
          {!viewMode && tabPosition === 'top' && (
            <PlanTabs
              visibleTabs={visibleTabsForRender}
              activeTab={activeTab}
              onTabClick={handleTabClick}
              onManageTabs={() => setShowTabManagementModal(true)}
              onHideTab={handleHideTab}
              draggedTabIndex={draggedTabIndex}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              dropTargetIndex={dropTargetIndex}
              tabPosition={tabPosition}
              tabDisplayMode={tabDisplayMode}
              onTabPositionChange={handleTabPositionChange}
              onTabDisplayModeChange={handleTabDisplayModeChange}
            />
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
              openTabFromLink('bills', { scrollToAccountId: accountId, scrollToRetirement: false });
            }}
            onNavigateToBenefits={() => {
              openTabFromLink('benefits', { scrollToRetirement: false });
            }}
            onNavigateToRetirement={() => {
              openTabFromLink('benefits', { scrollToRetirement: true });
            }}
            onNavigateToLoans={(accountId) => {
              openTabFromLink('loans', { scrollToAccountId: accountId, scrollToRetirement: false });
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
          className={`tab-panel ${activeTab === 'loans' ? 'active' : ''}`}
          ref={(element) => {
            tabPanelRefs.current.loans = element;
          }}
        >
          <LoansManager 
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
          <TaxBreakdown 
            displayMode={displayMode}
            onDisplayModeChange={setDisplayMode}
          />
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
            displayMode={displayMode}
            onDisplayModeChange={setDisplayMode}
          />
        </div>
      </div>

          {/* Tabs on bottom (after content) */}
          {!viewMode && tabPosition === 'bottom' && (
            <PlanTabs
              visibleTabs={visibleTabsForRender}
              activeTab={activeTab}
              onTabClick={handleTabClick}
              onManageTabs={() => setShowTabManagementModal(true)}
              onHideTab={handleHideTab}
              draggedTabIndex={draggedTabIndex}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              dropTargetIndex={dropTargetIndex}
              tabPosition={tabPosition}
              tabDisplayMode={tabDisplayMode}
              onTabPositionChange={handleTabPositionChange}
              onTabDisplayModeChange={handleTabDisplayModeChange}
            />
          )}
        </div>
        {/* End plan-dashboard-main */}

        {/* Tabs on right (inside content wrapper, after main) */}
        {!viewMode && tabPosition === 'right' && (
          <PlanTabs
            visibleTabs={visibleTabsForRender}
            activeTab={activeTab}
            onTabClick={handleTabClick}
            onManageTabs={() => setShowTabManagementModal(true)}
            onHideTab={handleHideTab}
            draggedTabIndex={draggedTabIndex}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            dropTargetIndex={dropTargetIndex}
            tabPosition={tabPosition}
            tabDisplayMode={tabDisplayMode}
            onTabPositionChange={handleTabPositionChange}
            onTabDisplayModeChange={handleTabDisplayModeChange}
          />
        )}
      </div>
      {/* End plan-dashboard-content-wrapper */}

      <footer className="dashboard-footer">
        <button
          type="button"
          className="footer-feedback-btn"
          onClick={() => setShowFeedbackModal(true)}
          title="Share feedback"
        >
          Share feedback
        </button>
        <div className="footer-info">
          <span>Last saved: {budgetData.settings.lastSavedAt ? new Date(budgetData.settings.lastSavedAt).toLocaleString() : 'Never'}</span>
          {budgetData.settings.filePath && (
            <>
              <span className="bullet">•</span>
              <button
                type="button"
                className="footer-file-link"
                onClick={handleRevealSavedFile}
                title="Show file in folder"
              >
                {budgetData.settings.filePath}
              </button>
            </>
          )}
        </div>
      </footer>

      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        context={{
          appVersion: '1.0.0',
          activeTab,
          planYear: budgetData.year,
          planName: budgetData.name,
          currentFilePath: budgetData.settings.filePath,
        }}
        onSubmitted={({ success, message }: { success: boolean; message: string }) => {
          setStatusToast({
            type: success ? 'success' : 'error',
            message,
          });
        }}
      />

      {/* Copy Plan Modal */}
      <Modal
        isOpen={showCopyModal}
        onClose={() => {
          setShowCopyModal(false);
          setCopyYearError(null);
          setNewYear('');
        }}
        header="Copy Plan to New Year"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCopyModal(false);
                setCopyYearError(null);
                setNewYear('');
              }}
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
          <FormGroup label="Target Year" required error={copyYearError || undefined}>
            <input
              className={copyYearError ? 'field-error' : ''}
              type="number"
              value={newYear}
              onChange={e => {
                setNewYear(e.target.value);
                if (copyYearError) {
                  setCopyYearError(null);
                }
              }}
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
        onClose={handleEncryptionModalClose}
        header={encryptionEnabled ? '🔐 Encryption Key Setup' : '🔐 Security Setup'}
        footer={
          <>
            {encryptionEnabled === null ? (
              <Button
                type="button"
                variant="secondary"
                onClick={handleEncryptionModalClose}
                disabled={encryptionSaving}
              >
                Cancel
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEncryptionEnabled(null)}
                disabled={encryptionSaving}
              >
                Back
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveEncryption}
              disabled={
                encryptionEnabled === null ||
                (encryptionEnabled === true && !useCustomKey && !generatedKey) ||
                encryptionSaving
              }
              isLoading={encryptionSaving}
              loadingText="Saving..."
            >
              Continue
            </Button>
          </>
        }
      >
        {encryptionEnabled !== null && (
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
            {encryptionEnabled
              ? 'This key will be used to encrypt and decrypt your budget files.'
              : 'Your plan file will be saved without encryption.'}
          </p>
        )}
        <EncryptionConfigPanel
          encryptionEnabled={encryptionEnabled}
          setEncryptionEnabled={setEncryptionEnabled}
          useCustomKey={useCustomKey}
          setUseCustomKey={setUseCustomKey}
          customKey={customKey}
          setCustomKey={setCustomKey}
          generatedKey={generatedKey}
          onGenerateKey={handleGenerateEncryptionKey}
        />
      </Modal>

      {statusToast && (
        <Toast 
          message={statusToast.message}
          type={statusToast.type}
          duration={2500}
          onDismiss={() => setStatusToast(null)}
        />
      )}

      {/* Accounts Manager Modal */}
      {showAccountsModal && (
        <AccountsManager onClose={() => setShowAccountsModal(false)} />
      )}

      {/* Tab Management Modal */}
      <TabManagementModal
        isOpen={showTabManagementModal}
        onClose={() => setShowTabManagementModal(false)}
        visibleTabs={visibleTabs}
        hiddenTabs={hiddenTabs}
        onToggleTabVisibility={handleToggleTabVisibility}
        onReorderTab={handleReorderTab}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  );
};

export default PlanDashboard;
