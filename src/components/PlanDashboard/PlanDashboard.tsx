type StatusToastType = 'success' | 'warning' | 'error';

interface StatusToastState {
  message: string;
  type: StatusToastType;
}
import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { flushSync } from 'react-dom';
import { Sheet, Copy, Eye, Lock, LockOpen, FolderOpen, MessageSquareText, Settings, Edit } from 'lucide-react';
import { APP_CUSTOM_EVENTS, MENU_EVENTS } from '../../constants/events';
import { APP_VERSION } from '../../constants/appMeta';
import { useBudget } from '../../contexts/BudgetContext';
import { useAppDialogs, useEncryptionSetupFlow, useFileRelinkFlow } from '../../hooks';
import { FileStorageService } from '../../services/fileStorage';
import SetupWizard from '../views/SetupWizard';
import KeyMetrics from '../tabViews/KeyMetrics';
import PayBreakdown from '../tabViews/PayBreakdown';
import OtherIncomeManager from '../tabViews/OtherIncomeManager';
import BillsManager from '../tabViews/BillsManager';
import LoansManager from '../tabViews/LoansManager';
import SavingsManager from '../tabViews/SavingsManager';
import TaxBreakdown from '../tabViews/TaxBreakdown';
import SettingsModal from '../modals/SettingsModal';
import AccountsModal from '../modals/AccountsModal';
import PaySettingsModal from '../modals/PaySettingsModal';
import { PlanTabs, TabManagementModal } from './PlanTabs';
import { Toast, Modal, Button, ConfirmDialog, ErrorDialog, FileRelinkModal, FormGroup, EncryptionConfigPanel, Dropdown, ViewModeButton, PillToggle, PeriodSelector } from '../_shared';
import type { Period } from '../_shared';
import { initializeTabConfigs, getVisibleTabs, getHiddenTabs, toggleTabVisibility, reorderTabs, normalizeLegacyTabId } from '../../utils/tabManagement';
import { getPayFrequencyViewMode } from '../../utils/payPeriod';
import { getPaychecksInMonth, getPaychecksInQuarter } from '../../utils/payCalendar';
import type { PayFrequency } from '../../types/frequencies';
import { useGlobalKeyboardShortcuts } from '../../hooks';
import type { SearchResult } from '../../utils/planSearch';
import { getActionHandler, type SearchActionContext } from '../../utils/searchRegistry';
import type { TabPosition, TabDisplayMode, TabConfig } from '../../types/tabs';
import type { ViewMode } from '../../types/viewMode';
import type { AuditEntry, AuditHistoryTarget } from '../../types/audit';
import type { AccountAllocationCategory } from '../../types/accounts';
import './PlanDashboard.css';

import type { TabId } from '../../utils/tabManagement';

type TabScrollPosition = 'top' | 'bottom';

const ExportModal = lazy(() => import('../modals/ExportModal'));
const FeedbackModal = lazy(() => import('../modals/FeedbackModal'));
const PlanSearchOverlay = lazy(() => import('./PlanSearchOverlay'));
const PlanHistoryOverlay = lazy(() => import('./PlanHistoryOverlay'));

interface PlanHistoryState {
  kind: 'plan-tab';
  budgetHistoryId: string;
  tab: TabId;
}

interface PlanDashboardProps {
  onResetSetup?: () => void;
  viewMode?: string | null; // If set, this is a view-only window
  onUndoRedoSuccess?: (action: 'undo' | 'redo') => void;
}

const VALID_TABS: TabId[] = ['metrics', 'breakdown', 'other-income', 'bills', 'loans', 'taxes', 'savings'];

/** Timing constants for the search-result scroll + highlight behaviour */
const SEARCH_SCROLL_INITIAL_DELAY_MS = 80;
const SEARCH_SCROLL_RETRY_DELAY_MS = 120;
const SEARCH_SCROLL_MAX_RETRIES = 5;
const SEARCH_SCROLL_SETTLE_DELAY_MS = 220;
const SEARCH_HIGHLIGHT_DURATION_MS = 1800;

const SCROLL_VISIBILITY_PADDING_PX = 12;

const getNearestScrollableAncestor = (element: HTMLElement): HTMLElement | null => {
  let current: HTMLElement | null = element.parentElement;

  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const isScrollable =
      (overflowY === 'auto' || overflowY === 'scroll') &&
      current.scrollHeight > current.clientHeight;

    if (isScrollable) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
};

const isElementVisibleInContainer = (element: HTMLElement, container: HTMLElement): boolean => {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  return (
    elementRect.top >= containerRect.top + SCROLL_VISIBILITY_PADDING_PX &&
    elementRect.bottom <= containerRect.bottom - SCROLL_VISIBILITY_PADDING_PX
  );
};

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
};

const areAuditEntriesEquivalent = (a: AuditEntry, b: AuditEntry): boolean => {
  if (a === b) return true;
  return (
    a.id === b.id &&
    a.timestamp === b.timestamp &&
    a.entityType === b.entityType &&
    a.entityId === b.entityId &&
    a.changeType === b.changeType &&
    a.sourceAction === b.sourceAction &&
    JSON.stringify(a.snapshot) === JSON.stringify(b.snapshot)
  );
};

const PlanDashboard: React.FC<PlanDashboardProps> = ({ onResetSetup, viewMode, onUndoRedoSuccess }) => {

  const {
    budgetData,
    saveBudget,
    loading,
    createNewBudget,
    loadBudget,
    copyPlanToNewYear,
    closeBudget,
    updateBudgetSettings,
    updateBudgetData,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useBudget();
  const getInitialTab = () => {
    const normalizedViewMode = normalizeLegacyTabId(viewMode);
    if (normalizedViewMode && VALID_TABS.includes(normalizedViewMode)) {
      return normalizedViewMode;
    }

    const normalizedSavedTab = normalizeLegacyTabId(budgetData?.settings?.activeTab);
    if (normalizedSavedTab && VALID_TABS.includes(normalizedSavedTab)) {
      return normalizedSavedTab;
    }

    return 'metrics' as TabId;
  };

  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);
  const [scrollToAccountId, setScrollToAccountId] = useState<string | undefined>(undefined);
  const [shouldScrollToRetirement, setShouldScrollToRetirement] = useState(false);
  const [pendingTabScroll, setPendingTabScroll] = useState<{ tab: TabId; position: TabScrollPosition } | null>(null);
  const [displayMode, setDisplayMode] = useState<ViewMode>(() => {
    if (budgetData?.settings?.displayMode) {
      return budgetData.settings.displayMode;
    }

    return getPayFrequencyViewMode(budgetData?.paySettings?.payFrequency ?? 'bi-weekly');
  });
  const [previewDisplayMode, setPreviewDisplayMode] = useState<ViewMode | null>(null);
  const [calendarAccurate, setCalendarAccurate] = useState<boolean>(
    () => budgetData?.settings?.calendarAccurate ?? false,
  );
  const _todayInit = new Date();
  const _initialPlanYear = budgetData?.year ?? _todayInit.getFullYear();
  const _initialMonth =
    _todayInit.getFullYear() === _initialPlanYear
      ? _todayInit.getMonth() + 1
      : 1;
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(() => ({
    year: _initialPlanYear,
    month: _initialMonth,
  }));
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [newYear, setNewYear] = useState('');
  const [copyYearError, setCopyYearError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState<string | undefined>(undefined);
  const [showPaySettingsModal, setShowPaySettingsModal] = useState(false);
  const [pendingPaySettingsFieldHighlight, setPendingPaySettingsFieldHighlight] = useState<string | undefined>(undefined);
  const [pendingBillsSearchAction, setPendingBillsSearchAction] = useState<
    | 'add-bill'
    | 'add-deduction'
    | 'edit-bill'
    | 'delete-bill'
    | 'toggle-bill'
    | 'edit-benefit'
    | 'delete-benefit'
    | 'toggle-benefit'
    | undefined
  >(undefined);
  const [pendingBillsSearchTargetId, setPendingBillsSearchTargetId] = useState<string | undefined>(undefined);
  const [billsSearchRequestKey, setBillsSearchRequestKey] = useState(0);
  const [pendingLoansSearchAction, setPendingLoansSearchAction] = useState<'add-loan' | 'edit-loan' | 'delete-loan' | 'toggle-loan' | undefined>(undefined);
  const [pendingLoansSearchTargetId, setPendingLoansSearchTargetId] = useState<string | undefined>(undefined);
  const [loansSearchRequestKey, setLoansSearchRequestKey] = useState(0);
  const [pendingSavingsSearchAction, setPendingSavingsSearchAction] = useState<
    | 'add-contribution'
    | 'add-retirement'
    | 'edit-savings'
    | 'delete-savings'
    | 'toggle-savings'
    | 'edit-retirement'
    | 'delete-retirement'
    | 'toggle-retirement'
    | undefined
  >(undefined);
  const [pendingSavingsSearchTargetId, setPendingSavingsSearchTargetId] = useState<string | undefined>(undefined);
  const [savingsSearchRequestKey, setSavingsSearchRequestKey] = useState(0);
  const [pendingOtherIncomeSearchAction, setPendingOtherIncomeSearchAction] = useState<
    | 'add-other-income'
    | 'edit-other-income'
    | 'delete-other-income'
    | 'toggle-other-income'
    | undefined
  >(undefined);
  const [pendingOtherIncomeSearchTargetId, setPendingOtherIncomeSearchTargetId] = useState<string | undefined>(undefined);
  const [otherIncomeSearchRequestKey, setOtherIncomeSearchRequestKey] = useState(0);
  const [taxSearchOpenSettingsRequestKey, setTaxSearchOpenSettingsRequestKey] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<AuditHistoryTarget | null>(null);
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [showEncryptionSetup, setShowEncryptionSetup] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showPlanEditModal, setShowPlanEditModal] = useState(false);
  const [draftPlanName, setDraftPlanName] = useState('');
  const [draftYear, setDraftYear] = useState('');
  const [draftYearSelection, setDraftYearSelection] = useState<string>('');
  const [planEditNameError, setPlanEditNameError] = useState<string | null>(null);
  const [planEditYearError, setPlanEditYearError] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<StatusToastState | null>(null);
  const [showTabManagementModal, setShowTabManagementModal] = useState(false);
  const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [temporarilyVisibleTab, setTemporarilyVisibleTab] = useState<TabId | null>(null);
  const [showPlanLoadingScreen, setShowPlanLoadingScreen] = useState(false);
  const [tabPosition, setTabPosition] = useState<TabPosition>('left');
  const [tabDisplayMode, setTabDisplayMode] = useState<TabDisplayMode>('icons-with-labels');

  const handleUndoAction = useCallback(() => {
    if (isEditableTarget(document.activeElement)) {
      document.execCommand('undo');
      return;
    }

    if (canUndo) {
      undo();
      onUndoRedoSuccess?.('undo');
    }
  }, [canUndo, onUndoRedoSuccess, undo]);

  const handleRedoAction = useCallback(() => {
    if (isEditableTarget(document.activeElement)) {
      document.execCommand('redo');
      return;
    }

    if (canRedo) {
      redo();
      onUndoRedoSuccess?.('redo');
    }
  }, [canRedo, onUndoRedoSuccess, redo]);

  const {
    encryptionEnabled,
    setEncryptionEnabled,
    customKey,
    setCustomKey,
    generatedKey,
    useCustomKey,
    setUseCustomKey,
    isSaving: encryptionSaving,
    canSaveSelection,
    generateKey: handleGenerateEncryptionKey,
    reset: resetEncryptionSetupFlow,
    goBackToSelection,
    saveSelection: saveEncryptionSelection,
  } = useEncryptionSetupFlow();
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
  const historyStateKeyRef = useRef<string | null>(null);
  const suppressHistoryPushRef = useRef(false);
  const lastMissingPathPromptRef = useRef<string | null>(null);
  const {
    confirmDialog,
    errorDialog,
    openConfirmDialog,
    confirmCurrentDialog,
    closeConfirmDialog,
    openErrorDialog,
    closeErrorDialog,
  } = useAppDialogs();
  const {
    missingFile: missingActiveFile,
    relinkMismatchMessage: activeRelinkMismatchMessage,
    relinkLoading: activeRelinkLoading,
    promptFileRelink: promptActiveFileRelink,
    clearFileRelinkPrompt: clearActiveFileRelinkPrompt,
    locateRelinkedFile: locateActiveRelinkedFile,
  } = useFileRelinkFlow({
    getExpectedPlanId: () => budgetData?.id,
    fallbackErrorMessage: 'Unable to relink moved file.',
    onRelinkSuccess: (result) => {
      lastMissingPathPromptRef.current = null;
      updateBudgetData({
        name: result.planName,
        settings: {
          ...budgetData!.settings,
          filePath: result.filePath,
        },
      });
      setStatusToast({ message: 'File moved on disk. Plan path was relinked.', type: 'success' });
    },
  });

  // Initialize tab configs from budget settings or use defaults
  const tabConfigs = useMemo(() => {
    return budgetData?.settings?.tabConfigs 
      ? initializeTabConfigs(budgetData.settings.tabConfigs)
      : initializeTabConfigs();
  }, [budgetData]);
  
  const visibleTabs = useMemo(() => getVisibleTabs(tabConfigs), [tabConfigs]);
  const hiddenTabs = useMemo(() => getHiddenTabs(tabConfigs), [tabConfigs]);
  const effectiveTemporarilyVisibleTab = temporarilyVisibleTab === activeTab ? temporarilyVisibleTab : null;
  const visibleTabsForRender = useMemo(() => {
    if (!effectiveTemporarilyVisibleTab) return visibleTabs;

    const alreadyVisible = visibleTabs.some((tab) => tab.id === effectiveTemporarilyVisibleTab);
    if (alreadyVisible) return visibleTabs;

    const tempTab = tabConfigs.find((tab) => tab.id === effectiveTemporarilyVisibleTab);
    if (!tempTab) return visibleTabs;

    const maxOrder = visibleTabs.reduce((max, tab) => Math.max(max, tab.order), -1);
    return [...visibleTabs, { ...tempTab, visible: true, order: maxOrder + 1 }];
  }, [effectiveTemporarilyVisibleTab, visibleTabs, tabConfigs]);

  useEffect(() => {
    latestTabConfigsRef.current = tabConfigs;
  }, [tabConfigs]);

  // Restore active tab before paint to avoid flashing default tab
  useLayoutEffect(() => {
    const tabRestoreContext = `${budgetData?.id ?? 'none'}:${viewMode ?? 'default'}`;
    if (initializedTabContextRef.current === tabRestoreContext) {
      return;
    }

    const normalizedViewMode = normalizeLegacyTabId(viewMode);
    if (normalizedViewMode && VALID_TABS.includes(normalizedViewMode)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Restoring active tab from persisted context before paint.
      setActiveTab(normalizedViewMode);
      initializedTabContextRef.current = tabRestoreContext;
      return;
    }

    const normalizedSavedTab = normalizeLegacyTabId(budgetData?.settings?.activeTab);
    if (normalizedSavedTab && VALID_TABS.includes(normalizedSavedTab)) {
      setActiveTab(normalizedSavedTab);
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

  const selectTab = useCallback((tab: TabId, options?: {
    resetBillsAnchor?: boolean;
    scrollToAccountId?: string;
    scrollToRetirement?: boolean;
    revealIfHidden?: boolean;
  }) => {
    if (options?.resetBillsAnchor) {
      setScrollToAccountId(undefined);
      setShouldScrollToRetirement(false);
    }

    if (options?.scrollToAccountId !== undefined) {
      setScrollToAccountId(options.scrollToAccountId);
    }

    if (options?.scrollToRetirement !== undefined) {
      setShouldScrollToRetirement(options.scrollToRetirement);
    }

    if (options?.revealIfHidden) {
      const targetTabConfig = tabConfigs.find((config) => config.id === tab);
      const isHidden = targetTabConfig ? !targetTabConfig.visible : false;
      if (isHidden) {
        setTemporarilyVisibleTab(tab);
      }
    }

    setActiveTab(tab);
  }, [tabConfigs]);

  useEffect(() => {
    if (viewMode || typeof window === 'undefined') {
      historyStateKeyRef.current = null;
      suppressHistoryPushRef.current = false;
      return;
    }

    const budgetHistoryId = budgetData?.settings?.filePath ?? budgetData?.id ?? 'default-plan';
    const nextHistoryState: PlanHistoryState = {
      kind: 'plan-tab',
      budgetHistoryId,
      tab: activeTab,
    };
    const nextHistoryKey = `${budgetHistoryId}:${activeTab}`;
    const currentBudgetHistoryId = historyStateKeyRef.current?.split(':')[0] ?? null;

    if (historyStateKeyRef.current === null || currentBudgetHistoryId !== budgetHistoryId) {
      window.history.replaceState(nextHistoryState, '', window.location.href);
      historyStateKeyRef.current = nextHistoryKey;
      suppressHistoryPushRef.current = false;
      return;
    }

    if (suppressHistoryPushRef.current) {
      historyStateKeyRef.current = nextHistoryKey;
      suppressHistoryPushRef.current = false;
      return;
    }

    if (historyStateKeyRef.current === nextHistoryKey) {
      return;
    }

    window.history.pushState(nextHistoryState, '', window.location.href);
    historyStateKeyRef.current = nextHistoryKey;
  }, [activeTab, budgetData?.id, budgetData?.settings?.filePath, viewMode]);

  useEffect(() => {
    const handleViewModeAutoSwitched = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      setStatusToast({
        message: customEvent.detail?.message ?? 'View mode switched to match your pay frequency.',
        type: 'success',
      });
    };

    window.addEventListener(APP_CUSTOM_EVENTS.viewModeAutoSwitched, handleViewModeAutoSwitched as EventListener);
    return () => {
      window.removeEventListener(APP_CUSTOM_EVENTS.viewModeAutoSwitched, handleViewModeAutoSwitched as EventListener);
    };
  }, []);

  useEffect(() => {
    if (viewMode || typeof window === 'undefined') return;

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as PlanHistoryState | null;
      const budgetHistoryId = budgetData?.settings?.filePath ?? budgetData?.id ?? 'default-plan';

      const normalizedStateTab = normalizeLegacyTabId(state?.tab);
      if (!state || state.kind !== 'plan-tab' || state.budgetHistoryId !== budgetHistoryId || !normalizedStateTab || !VALID_TABS.includes(normalizedStateTab)) {
        return;
      }

      suppressHistoryPushRef.current = true;
      selectTab(normalizedStateTab, { resetBillsAnchor: true, revealIfHidden: true });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [budgetData?.id, budgetData?.settings?.filePath, selectTab, viewMode]);

  // Initialize tab position and display mode from budget settings
  useEffect(() => {
    if (budgetData?.settings?.tabPosition) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Mirrors persisted tab position into local UI state.
      setTabPosition(budgetData.settings.tabPosition);
    }
    if (budgetData?.settings?.tabDisplayMode) {
      setTabDisplayMode(budgetData.settings.tabDisplayMode);
    }
    if (budgetData?.settings?.displayMode) {
      setDisplayMode(budgetData.settings.displayMode);
    } else if (budgetData?.paySettings?.payFrequency) {
      setDisplayMode(getPayFrequencyViewMode(budgetData.paySettings.payFrequency));
    }
    setCalendarAccurate(budgetData?.settings?.calendarAccurate ?? false);
    // Reset to plan-year period on plan load — selectedPeriod is intentionally not persisted.
    const now = new Date();
    const planYear = budgetData?.year ?? now.getFullYear();
    const month = now.getFullYear() === planYear ? now.getMonth() + 1 : 1;
    setSelectedPeriod({ year: planYear, month });
    setPreviewDisplayMode(null);
  }, [
    budgetData?.settings,
    budgetData?.year,
    budgetData?.settings?.tabDisplayMode,
    budgetData?.settings?.tabPosition,
    budgetData?.settings?.displayMode,
    budgetData?.paySettings?.payFrequency,
  ]);

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

  // Handle view display mode changes — persisted to settings so it survives frequency changes
  const handleDisplayModeChange = useCallback((newMode: ViewMode) => {
    if (newMode === displayMode || !budgetData) return;
    setPreviewDisplayMode(null);
    setDisplayMode(newMode);
    updateBudgetSettings({
      ...budgetData.settings,
      displayMode: newMode,
    });
  }, [displayMode, budgetData, updateBudgetSettings]);

  const handleCalendarAccurateChange = useCallback((value: boolean) => {
    setCalendarAccurate(value);
    if (budgetData) {
      updateBudgetSettings({
        ...budgetData.settings,
        calendarAccurate: value,
      });
    }
  }, [budgetData, updateBudgetSettings]);

  const handleDisplayModePreview = useCallback((newMode: ViewMode | null) => {
    if (!newMode || newMode === displayMode) {
      setPreviewDisplayMode(null);
      return;
    }

    setPreviewDisplayMode(newMode);
  }, [displayMode]);

  const effectiveDisplayMode = previewDisplayMode ?? displayMode;

  // Calendar-accurate mode eligibility
  const _calendarPayFrequency = budgetData?.paySettings?.payFrequency;
  const _firstPaycheckDate = budgetData?.paySettings?.firstPaycheckDate;
  const isCalendarEligibleFrequency =
    _calendarPayFrequency === 'weekly' || _calendarPayFrequency === 'bi-weekly';
  const isCalendarModeVisible =
    (effectiveDisplayMode === 'monthly' || effectiveDisplayMode === 'quarterly') &&
    isCalendarEligibleFrequency;
  const isCalendarToggleEnabled = isCalendarModeVisible && !!_firstPaycheckDate;
  const effectiveCalendarAccurate = calendarAccurate && isCalendarToggleEnabled;

  const paychecksInSelectedPeriod = useMemo(() => {
    if (!effectiveCalendarAccurate || !_firstPaycheckDate || !_calendarPayFrequency) return 0;
    if (effectiveDisplayMode === 'monthly') {
      return getPaychecksInMonth(
        _firstPaycheckDate,
        _calendarPayFrequency as PayFrequency,
        selectedPeriod.year,
        selectedPeriod.month,
      );
    }
    if (effectiveDisplayMode === 'quarterly') {
      const quarter = Math.ceil(selectedPeriod.month / 3);
      return getPaychecksInQuarter(
        _firstPaycheckDate,
        _calendarPayFrequency as PayFrequency,
        selectedPeriod.year,
        quarter,
      );
    }
    return 0;
  }, [effectiveCalendarAccurate, _firstPaycheckDate, _calendarPayFrequency, effectiveDisplayMode, selectedPeriod]);

  const openPayDetailsModal = useCallback(() => {
    setPendingPaySettingsFieldHighlight(undefined);
    setShowPaySettingsModal(true);
  }, []);

  const ensureValidSavePath = useCallback(async (): Promise<boolean> => {
    const currentPath = budgetData?.settings?.filePath;
    if (!currentPath) return true;
    if (!window.electronAPI?.fileExists) return true;

    try {
      const exists = await window.electronAPI.fileExists(currentPath);
      if (exists) {
        return true;
      }
    } catch (error) {
      console.warn('Failed to verify budget file path before save:', error);
    }

    lastMissingPathPromptRef.current = currentPath;
    promptActiveFileRelink(currentPath);
    return false;
  }, [budgetData?.settings?.filePath, promptActiveFileRelink]);

  // Open settings modal
  const handleOpenSettings = useCallback(() => {
    if (loading) return;
    setSettingsInitialSection(undefined);
    setShowSettings(true);
  }, [loading]);

  const performSave = useCallback(async (): Promise<boolean> => {
    if (!budgetData) return false;

    if (missingActiveFile) {
      setStatusToast({ message: 'Locate moved file before saving this plan.', type: 'warning' });
      return false;
    }

    const canSaveToCurrentPath = await ensureValidSavePath();
    if (!canSaveToCurrentPath) {
      setStatusToast({ message: 'Plan file moved. Locate it or cancel relink before saving.', type: 'warning' });
      return false;
    }

    const success = await saveBudget(activeTab, {
      settings: {
        ...budgetData.settings,
        tabConfigs: latestTabConfigsRef.current,
        tabPosition,
        tabDisplayMode,
        displayMode,
        calendarAccurate,
      },
    });

    if (success) {
      setStatusToast({ message: 'Saved successfully', type: 'success' });
      return true;
    }

    return false;
  }, [saveBudget, activeTab, budgetData, tabPosition, tabDisplayMode, displayMode, calendarAccurate, missingActiveFile, ensureValidSavePath]);

  // Handle explicit save requests (toolbar/menu/keyboard)
  const handleSave = useCallback(async () => {
    await performSave();
  }, [performSave]);

  const scrollTabToPosition = useCallback((tab: TabId, position: TabScrollPosition = 'top') => {
    const getScrollTop = (element: { scrollHeight: number }, nextPosition: TabScrollPosition) => {
      return nextPosition === 'bottom' ? element.scrollHeight : 0;
    };

    tabContentRef.current?.scrollTo({ top: getScrollTop(tabContentRef.current, position), behavior: 'smooth' });

    const panel = tabPanelRefs.current[tab];
    if (!panel) return;

    panel.scrollTo({ top: getScrollTop(panel, position), behavior: 'smooth' });

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
          element.scrollTo({ top: getScrollTop(element, position), behavior: 'smooth' });
        }
      }
    });
  }, []);

  const scrollTabToTop = useCallback((tab: TabId) => {
    scrollTabToPosition(tab, 'top');
  }, [scrollTabToPosition]);

  useEffect(() => {
    if (!pendingTabScroll || pendingTabScroll.tab !== activeTab) return;

    let firstFrameId = 0;
    let secondFrameId = 0;

    firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        scrollTabToPosition(pendingTabScroll.tab, pendingTabScroll.position);
        setPendingTabScroll(null);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      window.cancelAnimationFrame(secondFrameId);
    };
  }, [activeTab, pendingTabScroll, scrollTabToPosition]);

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

    const unsubscribeNew = window.electronAPI.onMenuEvent(MENU_EVENTS.newBudget, () => {
      const year = new Date().getFullYear();
      createNewBudget(year);
    });

    const unsubscribeOpen = window.electronAPI.onMenuEvent(MENU_EVENTS.openBudget, () => {
      loadBudget();
    });

    const unsubscribeEncryption = window.electronAPI.onMenuEvent(MENU_EVENTS.changeEncryption, () => {
      onResetSetup?.();
    });

    const unsubscribeSave = window.electronAPI.onMenuEvent(MENU_EVENTS.savePlan, () => {
      handleSaveRef.current?.();
    });

    const unsubscribeCopy = window.electronAPI.onMenuEvent(MENU_EVENTS.copyPlan, () => {
      setShowCopyModal(true);
    });

    const unsubscribeSettings = window.electronAPI.onMenuEvent(MENU_EVENTS.openSettings, () => {
      setShowSettings(true);
    });

    const unsubscribePayOptions = window.electronAPI.onMenuEvent(MENU_EVENTS.openPayOptions, () => {
      openPayDetailsModal();
    });

    const unsubscribeAccounts = window.electronAPI.onMenuEvent(MENU_EVENTS.openAccounts, () => {
      setShowAccountsModal(true);
    });

    const unsubscribeUndo = window.electronAPI.onMenuEvent(MENU_EVENTS.undo, () => {
      handleUndoAction();
    });

    const unsubscribeRedo = window.electronAPI.onMenuEvent(MENU_EVENTS.redo, () => {
      handleRedoAction();
    });

    const unsubscribeHistoryBack = window.electronAPI.onMenuEvent(MENU_EVENTS.historyBack, () => {
      if (!viewMode) {
        window.history.back();
      }
    });

    const unsubscribeHistoryForward = window.electronAPI.onMenuEvent(MENU_EVENTS.historyForward, () => {
      if (!viewMode) {
        window.history.forward();
      }
    });

    const unsubscribeHistoryHome = window.electronAPI.onMenuEvent(MENU_EVENTS.historyHome, () => {
      if (viewMode) return;

      const homeTab = visibleTabs[0]?.id as TabId | undefined;
      if (!homeTab) return;

      if (activeTab === homeTab) {
        scrollTabToTop(homeTab);
        return;
      }

      selectTab(homeTab, { resetBillsAnchor: true });
    });

    const unsubscribeSetTabPosition = window.electronAPI.onMenuEvent(MENU_EVENTS.setTabPosition, (position) => {
      if (
        position === 'top' ||
        position === 'bottom' ||
        position === 'left' ||
        position === 'right'
      ) {
        handleTabPositionChangeRef.current?.(position);
      }
    });

    const unsubscribeToggleDisplayMode = window.electronAPI.onMenuEvent(MENU_EVENTS.toggleTabDisplayMode, () => {
      const newMode: TabDisplayMode = tabDisplayModeRef.current === 'icons-only' ? 'icons-with-labels' : 'icons-only';
      handleTabDisplayModeChangeRef.current?.(newMode);
    });

    const unsubscribeOpenSearch = window.electronAPI.onMenuEvent(MENU_EVENTS.openSearch, () => {
      setShowSearch(true);
    });

    return () => {
      unsubscribeNew();
      unsubscribeOpen();
      unsubscribeEncryption();
      unsubscribeSave();
      unsubscribeCopy();
      unsubscribeSettings();
      unsubscribePayOptions();
      unsubscribeAccounts();
      unsubscribeUndo();
      unsubscribeRedo();
      unsubscribeHistoryBack();
      unsubscribeHistoryForward();
      unsubscribeHistoryHome();
      unsubscribeSetTabPosition();
      unsubscribeToggleDisplayMode();
      unsubscribeOpenSearch();
    };
  }, [activeTab, createNewBudget, handleRedoAction, handleUndoAction, loadBudget, onResetSetup, openPayDetailsModal, scrollTabToTop, selectTab, viewMode, visibleTabs]);

  // Save session state when active tab or budget data changes
  useEffect(() => {
    if (!budgetData?.settings?.filePath || !window.electronAPI?.saveSessionState) return;

    window.electronAPI.saveSessionState(budgetData.settings.filePath, activeTab).catch((error) => {
      console.error('Failed to save session state:', error);
    });
  }, [activeTab, budgetData?.settings?.filePath]);

  // Keep main process aware of the active budget file path for local rename detection.
  useEffect(() => {
    if (!window.electronAPI?.setActiveBudgetFilePath) return;

    const filePath = budgetData?.settings?.filePath || null;
    window.electronAPI.setActiveBudgetFilePath(filePath).catch((error) => {
      console.warn('Failed to set active budget file path for watcher:', error);
    });
  }, [budgetData?.settings?.filePath]);

  // If the open budget file is renamed locally (Finder/Explorer), update path and plan name live.
  useEffect(() => {
    if (!window.electronAPI?.onBudgetFileRenamed || !budgetData) return;

    const unsubscribe = window.electronAPI.onBudgetFileRenamed(({ oldPath, newPath, planName }) => {
      updateBudgetData({
        name: planName,
        settings: {
          ...budgetData.settings,
          filePath: newPath,
        },
      }, {
        trackHistory: false,
        description: 'Sync renamed plan path',
      });

      FileStorageService.removeRecentFile(oldPath);
      FileStorageService.addRecentFile(newPath);
      setStatusToast({ message: 'File renamed on disk. Plan name updated.', type: 'success' });
    });

    return unsubscribe;
  }, [budgetData, updateBudgetData]);

  // If an active file is moved across folders, prompt once to relink and keep editing.
  useEffect(() => {
    if (!budgetData?.settings?.filePath || !window.electronAPI?.fileExists) return;

    const fileExists = window.electronAPI.fileExists;
    let cancelled = false;
    const intervalId = window.setInterval(async () => {
      if (cancelled) return;

      const currentPath = budgetData.settings.filePath;
      if (!currentPath) return;

      const exists = await fileExists(currentPath);
      if (exists) {
        if (lastMissingPathPromptRef.current === currentPath) {
          lastMissingPathPromptRef.current = null;
        }
        return;
      }

      if (lastMissingPathPromptRef.current === currentPath) {
        return;
      }

      lastMissingPathPromptRef.current = currentPath;
      promptActiveFileRelink(currentPath);
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [budgetData, promptActiveFileRelink]);

  const handleCloseActiveRelinkModal = useCallback(() => {
    if (activeRelinkLoading || !budgetData) return;

    const stalePath = missingActiveFile?.filePath || budgetData.settings.filePath || null;
    if (stalePath) {
      FileStorageService.removeRecentFile(stalePath);
    }

    // Detach stale path so subsequent saves are explicit Save As operations.
    updateBudgetData({
      settings: {
        ...budgetData.settings,
        filePath: undefined,
      },
    });

    lastMissingPathPromptRef.current = null;
    clearActiveFileRelinkPrompt();
    setStatusToast({
      message: 'File location was cleared. Use Save to choose a new file location.',
      type: 'warning',
    });
  }, [activeRelinkLoading, budgetData, missingActiveFile, updateBudgetData, clearActiveFileRelinkPrompt]);

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

      // eslint-disable-next-line react-hooks/set-state-in-effect -- Loading screen must toggle immediately while plan data is unavailable.
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
        openErrorDialog({
          title: 'Cannot Hide Tab',
          message: 'Cannot hide the last visible tab. At least one tab must remain visible.',
        });
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
  }, [activeTab, budgetData, openErrorDialog, tabConfigs, updateBudgetSettings]);

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
      setStatusToast({ message: 'Tab order updated', type: 'success' });
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

  const openTabFromLink = useCallback((tab: TabId, options?: { scrollToAccountId?: string; scrollToRetirement?: boolean; scrollPosition?: TabScrollPosition }) => {
    if (options?.scrollPosition) {
      if (activeTab === tab) {
        scrollTabToPosition(tab, options.scrollPosition);
      } else {
        setPendingTabScroll({ tab, position: options.scrollPosition });
      }
    } else {
      setPendingTabScroll(null);
    }

    selectTab(tab, {
      scrollToAccountId: options?.scrollToAccountId,
      scrollToRetirement: options?.scrollToRetirement,
      revealIfHidden: true,
    });
  }, [activeTab, scrollTabToPosition, selectTab]);

  const handleTabClick = useCallback((tab: TabId, options?: { resetBillsAnchor?: boolean }) => {
    if (activeTab === tab) {
      scrollTabToTop(tab);
      return;
    }

    selectTab(tab, { resetBillsAnchor: options?.resetBillsAnchor });
  }, [activeTab, scrollTabToTop, selectTab]);

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

  // Cmd/Ctrl+F — open plan-wide search (React capture-phase fallback)
  useGlobalKeyboardShortcuts([
    {
      key: 'f',
      mac: true,
      windows: true,
      callback: () => setShowSearch(true),
    },
    {
      key: ',',
      mac: true,
      windows: true,
      callback: () => {
        setSettingsInitialSection(undefined);
        setShowSettings(true);
      },
    },
    {
      key: 'z',
      mac: true,
      windows: true,
      shouldHandle: (e) => !isEditableTarget(e.target),
      callback: handleUndoAction,
    },
    {
      key: 'z',
      mac: true,
      windows: true,
      shift: true,
      shouldHandle: (e) => !isEditableTarget(e.target),
      callback: handleRedoAction,
    },
    {
      key: 'y',
      windows: true,
      shouldHandle: (e) => !isEditableTarget(e.target),
      callback: handleRedoAction,
    },
  ]);

  // Handle navigation from search results
  const handleSearchNavigate = useCallback(
    (result: SearchResult) => {
      const { action } = result;

      // Try to find a registered handler for this action type
      const registryHandler = getActionHandler(action.type);
      if (registryHandler) {
        // Build context for the handler with all state setters and navigation functions
        // Cast state setters to SearchActionContext type since React's SetStateAction is compatible
        const context: SearchActionContext = {
          setPendingBillsSearchAction: setPendingBillsSearchAction as SearchActionContext['setPendingBillsSearchAction'],
          setPendingBillsSearchTargetId: setPendingBillsSearchTargetId as SearchActionContext['setPendingBillsSearchTargetId'],
          setBillsSearchRequestKey: setBillsSearchRequestKey as SearchActionContext['setBillsSearchRequestKey'],
          setPendingLoansSearchAction: setPendingLoansSearchAction as SearchActionContext['setPendingLoansSearchAction'],
          setPendingLoansSearchTargetId: setPendingLoansSearchTargetId as SearchActionContext['setPendingLoansSearchTargetId'],
          setLoansSearchRequestKey: setLoansSearchRequestKey as SearchActionContext['setLoansSearchRequestKey'],
          setPendingSavingsSearchAction: setPendingSavingsSearchAction as SearchActionContext['setPendingSavingsSearchAction'],
          setPendingSavingsSearchTargetId: setPendingSavingsSearchTargetId as SearchActionContext['setPendingSavingsSearchTargetId'],
          setSavingsSearchRequestKey: setSavingsSearchRequestKey as SearchActionContext['setSavingsSearchRequestKey'],
          setPendingOtherIncomeSearchAction: setPendingOtherIncomeSearchAction as SearchActionContext['setPendingOtherIncomeSearchAction'],
          setPendingOtherIncomeSearchTargetId: setPendingOtherIncomeSearchTargetId as SearchActionContext['setPendingOtherIncomeSearchTargetId'],
          setOtherIncomeSearchRequestKey: setOtherIncomeSearchRequestKey as SearchActionContext['setOtherIncomeSearchRequestKey'],
          setTaxSearchOpenSettingsRequestKey: setTaxSearchOpenSettingsRequestKey as SearchActionContext['setTaxSearchOpenSettingsRequestKey'],
          selectTab: selectTab as SearchActionContext['selectTab'],
          setShowAccountsModal: setShowAccountsModal as SearchActionContext['setShowAccountsModal'],
          setShowSettings: setShowSettings as SearchActionContext['setShowSettings'],
          setSettingsInitialSection: setSettingsInitialSection as SearchActionContext['setSettingsInitialSection'],
          setScrollToAccountId: setScrollToAccountId as SearchActionContext['setScrollToAccountId'],
        };
        registryHandler(action, context);
        return;
      }

      // Fallback to built-in action handling for core actions (navigate-tab, open-settings, etc.)
      if (action.type === 'navigate-tab') {
        openTabFromLink(action.tabId);
        // After tab switch, scroll to element and briefly highlight it
        if (action.elementId) {
          const elementId = action.elementId;
          // Retry polling because the target tab may not be in the DOM yet immediately
          const attemptScroll = (attemptsLeft: number) => {
            const el = document.getElementById(elementId);
            if (el) {
              const scrollContainer = getNearestScrollableAncestor(el);
              el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
              el.classList.add('plan-search-highlight');
              window.setTimeout(
                () => el.classList.remove('plan-search-highlight'),
                SEARCH_HIGHLIGHT_DURATION_MS,
              );

              if (scrollContainer) {
                window.setTimeout(() => {
                  if (!isElementVisibleInContainer(el, scrollContainer) && attemptsLeft > 0) {
                    attemptScroll(attemptsLeft - 1);
                  }
                }, SEARCH_SCROLL_SETTLE_DELAY_MS);
              }
            } else if (attemptsLeft > 0) {
              window.setTimeout(() => attemptScroll(attemptsLeft - 1), SEARCH_SCROLL_RETRY_DELAY_MS);
            }
          };
          window.setTimeout(() => attemptScroll(SEARCH_SCROLL_MAX_RETRIES), SEARCH_SCROLL_INITIAL_DELAY_MS);
        }
      } else if (action.type === 'open-pay-settings') {
        setPendingPaySettingsFieldHighlight(action.fieldHighlight);
        setShowPaySettingsModal(true);
      } else if (action.type === 'open-accounts') {
        setShowAccountsModal(true);
      } else if (action.type === 'open-settings') {
        setSettingsInitialSection(action.sectionId);
        setShowSettings(true);
      } else if (action.type === 'open-view-mode-settings') {
        setSettingsInitialSection(undefined);
        setShowSettings(true);
      }
    },
    [openTabFromLink, selectTab, setPendingBillsSearchAction, setPendingBillsSearchTargetId, setBillsSearchRequestKey, setPendingLoansSearchAction, setPendingLoansSearchTargetId, setLoansSearchRequestKey, setPendingSavingsSearchAction, setPendingSavingsSearchTargetId, setSavingsSearchRequestKey, setPendingOtherIncomeSearchAction, setPendingOtherIncomeSearchTargetId, setOtherIncomeSearchRequestKey, setTaxSearchOpenSettingsRequestKey, setShowAccountsModal, setShowSettings, setSettingsInitialSection, setScrollToAccountId, setPendingPaySettingsFieldHighlight],
  );

  const handleOpenObjectHistory = useCallback((target: AuditHistoryTarget) => {
    setHistoryTarget(target);
  }, []);

  const handleCloseObjectHistory = useCallback(() => {
    setHistoryTarget(null);
  }, []);

  const handleDeleteHistoryEntry = useCallback(
    (entryToDelete: AuditEntry, originalIndex: number) => {
      if (!budgetData) return;

      openConfirmDialog({
        title: 'Delete History Entry',
        message: 'Remove this history snapshot from the timeline?',
        confirmLabel: 'Delete Entry',
        confirmVariant: 'danger',
        onConfirm: () => {
          const currentAudit = budgetData.metadata?.auditHistory || [];

          let deleteIndex = -1;

          if (
            originalIndex >= 0 &&
            originalIndex < currentAudit.length &&
            areAuditEntriesEquivalent(currentAudit[originalIndex], entryToDelete)
          ) {
            deleteIndex = originalIndex;
          }

          if (deleteIndex === -1) {
            deleteIndex = currentAudit.findIndex((entry) => areAuditEntriesEquivalent(entry, entryToDelete));
          }

          if (deleteIndex === -1 && typeof entryToDelete.id === 'string') {
            deleteIndex = currentAudit.findIndex((entry) => entry.id === entryToDelete.id);
          }

          if (deleteIndex === -1) {
            return;
          }

          const nextAudit = currentAudit.filter((_, idx) => idx !== deleteIndex);
          updateBudgetData(
            {
              metadata: {
                auditHistory: nextAudit,
              },
            },
            {
              trackHistory: false,
              trackAudit: false,
              description: 'Delete history entry',
            },
          );
        },
      });
    },
    [budgetData, openConfirmDialog, updateBudgetData],
  );

  const handleRestoreHistoryEntries = useCallback(
    (entryIds: string[]) => {
      if (!budgetData || entryIds.length === 0) return;

      const auditHistory = budgetData.metadata?.auditHistory || [];
      const entriesToRestore = entryIds
        .map((id) => auditHistory.find((entry) => entry.id === id))
        .filter((entry): entry is AuditEntry => Boolean(entry));

      if (entriesToRestore.length === 0) return;

      const upsertById = <T extends { id: string }>(items: T[], item: T): T[] => {
        const idx = items.findIndex((existing) => existing.id === item.id);
        if (idx === -1) return [...items, item];
        return items.map((existing, i) => (i === idx ? item : existing));
      };

      const applyEntryRestore = (current: typeof budgetData, entry: AuditEntry): typeof budgetData => {
        if (!current || !entry.snapshot || typeof entry.snapshot !== 'object') return current;

        const snapshot = entry.snapshot as Record<string, unknown>;

        switch (entry.entityType) {
          case 'bill':
            return {
              ...current,
              bills: upsertById(current.bills, snapshot as unknown as typeof current.bills[number]),
            };
          case 'deduction':
            return {
              ...current,
              preTaxDeductions: upsertById(
                current.preTaxDeductions,
                snapshot as unknown as typeof current.preTaxDeductions[number],
              ),
            };
          case 'savings-contribution':
            return {
              ...current,
              savingsContributions: upsertById(
                current.savingsContributions || [],
                snapshot as unknown as NonNullable<typeof current.savingsContributions>[number],
              ),
            };
          case 'retirement-election':
            return {
              ...current,
              retirement: upsertById(current.retirement, snapshot as unknown as typeof current.retirement[number]),
            };
          case 'loan':
            return {
              ...current,
              loans: upsertById(current.loans, snapshot as unknown as typeof current.loans[number]),
            };
          case 'benefit':
            return {
              ...current,
              benefits: upsertById(current.benefits, snapshot as unknown as typeof current.benefits[number]),
            };
          case 'other-income':
            return {
              ...current,
              otherIncome: upsertById(
                current.otherIncome || [],
                snapshot as unknown as NonNullable<typeof current.otherIncome>[number],
              ),
            };
          case 'account':
            return {
              ...current,
              accounts: upsertById(current.accounts, snapshot as unknown as typeof current.accounts[number]),
            };
          case 'allocation-item': {
            const accountId = typeof snapshot.accountId === 'string'
              ? snapshot.accountId
              : entry.entityId.split(':')[0];
            const categoryId = entry.entityId.includes(':')
              ? entry.entityId.split(':')[1]
              : String(snapshot.id || '');

            const restoredCategory: AccountAllocationCategory = {
              ...(snapshot as unknown as AccountAllocationCategory),
              id: categoryId,
            };

            return {
              ...current,
              accounts: current.accounts.map((account) => {
                if (account.id !== accountId) return account;
                const categories = account.allocationCategories || [];
                return {
                  ...account,
                  allocationCategories: upsertById(categories, restoredCategory),
                };
              }),
            };
          }
          case 'pay-settings':
            return {
              ...current,
              paySettings: snapshot as unknown as typeof current.paySettings,
            };
          case 'tax-settings':
            return {
              ...current,
              taxSettings: snapshot as unknown as typeof current.taxSettings,
            };
          case 'budget-settings':
            return {
              ...current,
              settings: snapshot as unknown as typeof current.settings,
            };
          default:
            return current;
        }
      };

      const allDeletes = entriesToRestore.every((e) => e.changeType === 'delete');
      const count = entriesToRestore.length;
      const actionVerb = allDeletes ? 'Restore' : 'Rewind';

      openConfirmDialog({
        title: allDeletes ? 'Restore Deleted Entry' : 'Rewind to Previous State',
        message: count > 1
          ? allDeletes
            ? `Restore ${count} deleted entries back to the plan?`
            : `Rewind ${count} entries back to this previous state?`
          : allDeletes
            ? 'Restore this deleted entry back to the plan?'
            : 'Rewind this entry back to this previous state?',
        confirmLabel: count > 1 ? `${actionVerb} Entries` : actionVerb,
        confirmVariant: 'primary',
        onConfirm: () => {
          const restored = entriesToRestore.reduce((acc, entry) => applyEntryRestore(acc, entry), budgetData);
          if (!restored) return;

          const now = new Date().toISOString();
          const sourceAction = allDeletes ? 'Restore deleted entry' : 'Rewind to previous state';
          const restoredAuditEntries: AuditEntry[] = entriesToRestore.map((entry) => ({
            id: crypto.randomUUID(),
            timestamp: now,
            entityType: entry.entityType,
            entityId: entry.entityId,
            changeType: 'restore',
            sourceAction,
            snapshot: entry.snapshot,
            note: `Restored from history entry ${entry.id}`,
          }));

          const nextAudit = [
            ...(restored.metadata?.auditHistory || []),
            ...restoredAuditEntries,
          ];

          updateBudgetData(
            {
              ...restored,
              metadata: {
                auditHistory: nextAudit,
              },
            },
            {
              trackAudit: false,
              description: count > 1
                ? allDeletes ? 'Restore deleted entries' : 'Rewind entries to previous state'
                : allDeletes ? 'Restore deleted entry' : 'Rewind to previous state',
            },
          );
        },
      });
    },
    [budgetData, openConfirmDialog, updateBudgetData],
  );

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

  const handleEncryptionModalOpen = () => {
    resetEncryptionSetupFlow();
    setShowEncryptionSetup(true);
  };

  const handleStartPlanEdit = () => {
    const baseYear = budgetData?.year || new Date().getFullYear();
    const defaultYear = String(baseYear);

    setDraftPlanName(budgetData?.name || '');
    setDraftYear(defaultYear);
    setDraftYearSelection(defaultYear);
    setPlanEditNameError(null);
    setPlanEditYearError(null);
    setShowPlanEditModal(true);
  };

  const handleCancelPlanEdit = () => {
    setShowPlanEditModal(false);
    setDraftPlanName('');
    setDraftYear('');
    setDraftYearSelection('');
    setPlanEditNameError(null);
    setPlanEditYearError(null);
  };

  const sanitizePlanFileName = (value: string) => {
    return value
      .split('')
      .filter((char) => char.charCodeAt(0) >= 32)
      .join('')
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\.+$/, '');
  };

  const deriveRenamedPlanPath = (currentPath: string, nextPlanName: string) => {
    const separator = currentPath.includes('\\') ? '\\' : '/';
    const lastSeparatorIndex = Math.max(currentPath.lastIndexOf('/'), currentPath.lastIndexOf('\\'));
    const directory = lastSeparatorIndex >= 0 ? currentPath.slice(0, lastSeparatorIndex) : '';
    const currentFileName = lastSeparatorIndex >= 0 ? currentPath.slice(lastSeparatorIndex + 1) : currentPath;
    const lastDotIndex = currentFileName.lastIndexOf('.');
    const extension = lastDotIndex > 0 ? currentFileName.slice(lastDotIndex) : '.budget';
    const safePlanName = sanitizePlanFileName(nextPlanName) || 'plan';
    const renamedFileName = `${safePlanName}${extension}`;

    return directory ? `${directory}${separator}${renamedFileName}` : renamedFileName;
  };

  const handleSavePlanEdit = async () => {
    if (!budgetData) {
      handleCancelPlanEdit();
      return;
    }

    const nextName = draftPlanName.trim();
    const nextYear = parseInt(draftYear.trim(), 10);

    const currentCalendarYear = new Date().getFullYear();
    const maxAllowedYear = currentCalendarYear + 10;

    // Validate name
    if (!nextName) {
      setPlanEditNameError('Plan name is required.');
      return;
    }
    setPlanEditNameError(null);

    // Validate year
    if (isNaN(nextYear) || nextYear < 2000 || nextYear > maxAllowedYear) {
      setPlanEditYearError(`Enter a year between 2000 and ${maxAllowedYear}.`);
      return;
    }
    setPlanEditYearError(null);

    // Check if anything changed
    const nameChanged = nextName !== budgetData.name;
    const yearChanged = nextYear !== budgetData.year;

    if (!nameChanged && !yearChanged) {
      handleCancelPlanEdit();
      return;
    }

    let nextFilePath = budgetData.settings.filePath;
    let renameWarning: string | null = null;
    let renamedFile = false;

    if (nameChanged && budgetData.settings.filePath && window.electronAPI?.renameBudgetFile) {
      const currentFilePath = budgetData.settings.filePath;
      const renamedPathCandidate = deriveRenamedPlanPath(currentFilePath, nextName);

      if (renamedPathCandidate !== currentFilePath) {
        const renameResult = await window.electronAPI.renameBudgetFile(currentFilePath, renamedPathCandidate);
        if (renameResult.success) {
          nextFilePath = renameResult.filePath || renamedPathCandidate;
          renamedFile = true;
          FileStorageService.removeRecentFile(currentFilePath);
          FileStorageService.addRecentFile(nextFilePath);
        } else {
          renameWarning = renameResult.error || 'Unable to rename the plan file on disk.';
        }
      }
    }

    updateBudgetData({
      name: nextName,
      year: nextYear,
      settings: {
        ...budgetData.settings,
        filePath: nextFilePath,
      },
    });

    if (renameWarning) {
      setStatusToast({ message: `Plan updated, but file rename failed: ${renameWarning}`, type: 'warning' });
    } else if (renamedFile) {
      setStatusToast({ message: 'Plan and file name updated', type: 'success' });
    } else {
      setStatusToast({ message: 'Plan updated', type: 'success' });
    }

    setShowPlanEditModal(false);
  };

  const handleEncryptionModalClose = () => {
    setShowEncryptionSetup(false);
    resetEncryptionSetupFlow();
  };

  const handleSaveEncryption = async () => {
    if (!budgetData) return;

    const result = await saveEncryptionSelection({
      planId: budgetData.id,
      persistAppSettings: true,
      deleteStoredKeyWhenDisabled: true,
    });

    if (!result.success) {
      openErrorDialog(result.errorDialog);
      return;
    }

      updateBudgetSettings({
        ...budgetData.settings,
        encryptionEnabled: result.encryptionEnabled,
      });

      setStatusToast({
        message: result.encryptionEnabled
          ? 'Encryption enabled for this plan'
          : 'Encryption disabled for this plan',
        type: 'success',
      });
      handleEncryptionModalClose();
  };

  const showYearSubtitle = !budgetData.name.includes(String(budgetData.year));

  const fileManagerAppName = (() => {
    const platform = (typeof navigator !== 'undefined' ? navigator.platform : '').toLowerCase();
    if (platform.includes('mac')) return 'Finder';
    if (platform.includes('win')) return 'File Explorer';
    return 'Files';
  })();

  const handleRevealSavedFile = async () => {
    if (!budgetData?.settings?.filePath || !window.electronAPI?.revealInFolder) return;
    const result = await window.electronAPI.revealInFolder(budgetData.settings.filePath);
    if (!result.success) {
      setStatusToast({ message: 'Unable to open file location', type: 'error' });
    }
  };

  const encryptionModalHeader = (() => {
    if (encryptionEnabled === true) return 'Encryption Key Setup';
    if (encryptionEnabled === false) return 'Disable Encryption';
    return budgetData?.settings?.encryptionEnabled ? 'Manage Encryption' : 'Enable Encryption';
  })();

  return (
    <div className={`plan-dashboard layout-with-tabs-${tabPosition}`}>
      <header className="dashboard-header app-drag-region">
        <div className="header-left">
          <div className="plan-title-block">
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
            {showYearSubtitle && (
              <p className="plan-year-subtitle">Year: {budgetData.year}</p>
            )}
          </div>
        </div>
        <div className="header-actions">
          <div className="header-btn-group">
            <Button
              variant="secondary"
              size="small"
              className="header-btn-secondary"
              onClick={() => setShowAccountsModal(true)}
              title="Manage your financial accounts"
            >
              <Sheet className="ui-icon" aria-hidden="true" />
              Accounts
            </Button>
            <Button
              variant="secondary"
              size="small"
              className="header-btn-secondary"
              onClick={handleOpenSettings}
              disabled={!!missingActiveFile || activeRelinkLoading}
            >
              <Settings className="ui-icon" aria-hidden="true" />
              Settings
            </Button>
          </div>
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

          {!viewMode && (
            activeTab === 'breakdown' ||
            activeTab === 'other-income' ||
            activeTab === 'bills' ||
            activeTab === 'loans' ||
            activeTab === 'taxes' ||
            activeTab === 'savings'
          ) && (
            <div className="dashboard-view-bar">
              <div className="dashboard-view-bar-controls">
                <ViewModeButton
                  label="View Mode"
                  size="small"
                  mode={effectiveDisplayMode}
                  selectedMode={displayMode}
                  onChange={handleDisplayModeChange}
                  onPreviewChange={handleDisplayModePreview}
                  highlightedValue={budgetData ? getPayFrequencyViewMode(budgetData.paySettings.payFrequency) : undefined}
                  highlightedLabel="Your pay frequency"
                  preferredPlacement="down"
                />
                {isCalendarEligibleFrequency && (
                  <div
                    className="dashboard-view-bar-toggle-wrapper"
                    title={
                      !isCalendarModeVisible
                        ? 'Switch to Monthly or Quarterly view to enable calendar mode'
                        : !_firstPaycheckDate
                          ? 'Set your first paycheck date in Pay Settings'
                          : undefined
                    }
                  >
                    <PillToggle
                      size="small"
                      value={calendarAccurate}
                      onChange={handleCalendarAccurateChange}
                      leftLabel="Average"
                      rightLabel="Calendar"
                      disabled={!isCalendarToggleEnabled}
                    />
                  </div>
                )}
                {isCalendarModeVisible && !_firstPaycheckDate && (
                  <button
                    type="button"
                    className="dashboard-view-bar-setup-hint"
                    onClick={openPayDetailsModal}
                  >
                    Set first paycheck date →
                  </button>
                )}
              </div>
              {effectiveCalendarAccurate && (
                <PeriodSelector
                  period={selectedPeriod}
                  planYear={budgetData.year}
                  paychecksInPeriod={paychecksInSelectedPeriod}
                  displayMode={effectiveDisplayMode as 'monthly' | 'quarterly'}
                  onChange={setSelectedPeriod}
                />
              )}
            </div>
          )}

          <div className="tab-content" ref={tabContentRef}>
        {viewMode && (
          <div className="view-mode-header">
            <Eye className="ui-icon view-mode-header-icon" aria-hidden="true" />
            View-Only: {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}
          </div>
        )}
        <div
          className={`tab-panel ${activeTab === 'metrics' ? 'active' : ''}`}
          ref={(element) => {
            tabPanelRefs.current.metrics = element;
          }}
        >
          <KeyMetrics
            onOpenPayDetails={openPayDetailsModal}
            onNavigateToTaxes={() => {
              openTabFromLink('taxes');
            }}
            onNavigateToNetPay={() => {
              openTabFromLink('breakdown');
            }}
            onNavigateToSavings={() => {
              openTabFromLink('savings', { scrollToRetirement: false });
            }}
            onNavigateToBills={() => {
              openTabFromLink('bills', { scrollToRetirement: false });
            }}
            onNavigateToRemaining={() => {
              openTabFromLink('breakdown', { scrollPosition: 'bottom', scrollToRetirement: false });
            }}
          />
        </div>
        <div
          className={`tab-panel ${activeTab === 'breakdown' ? 'active' : ''}`}
          ref={(element) => {
            tabPanelRefs.current.breakdown = element;
          }}
        >
          <PayBreakdown 
            displayMode={effectiveDisplayMode}
            calendarAccurate={effectiveCalendarAccurate}
            paychecksInPeriod={paychecksInSelectedPeriod}
            onOpenPayDetails={openPayDetailsModal}
            onNavigateToBills={(accountId) => {
              openTabFromLink('bills', { scrollToAccountId: accountId, scrollToRetirement: false });
            }}
            onNavigateToSavings={() => {
              openTabFromLink('savings', { scrollToRetirement: false });
            }}
            onNavigateToRetirement={() => {
              openTabFromLink('savings', { scrollToRetirement: true });
            }}
            onNavigateToLoans={(accountId) => {
              openTabFromLink('loans', { scrollToAccountId: accountId, scrollToRetirement: false });
            }} 
            onViewHistory={handleOpenObjectHistory}
          />
        </div>
        <div
          className={`tab-panel ${activeTab === 'other-income' ? 'active' : ''}`}
          ref={(element) => {
            tabPanelRefs.current['other-income'] = element;
          }}
        >
          <OtherIncomeManager
            searchActionRequestKey={otherIncomeSearchRequestKey}
            searchActionType={pendingOtherIncomeSearchAction}
            searchActionTargetId={pendingOtherIncomeSearchTargetId}
            displayMode={effectiveDisplayMode}
            onViewHistory={handleOpenObjectHistory}
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
            searchActionRequestKey={billsSearchRequestKey}
            searchActionType={pendingBillsSearchAction}
            searchActionTargetId={pendingBillsSearchTargetId}
            displayMode={effectiveDisplayMode}
            onViewHistory={handleOpenObjectHistory}
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
            searchActionRequestKey={loansSearchRequestKey}
            searchActionType={pendingLoansSearchAction}
            searchActionTargetId={pendingLoansSearchTargetId}
            displayMode={effectiveDisplayMode}
            onViewHistory={handleOpenObjectHistory}
          />
        </div>
        <div
          className={`tab-panel ${activeTab === 'taxes' ? 'active' : ''}`}
          ref={(element) => {
            tabPanelRefs.current.taxes = element;
          }}
        >
          <TaxBreakdown 
            searchOpenSettingsRequestKey={taxSearchOpenSettingsRequestKey}
            displayMode={effectiveDisplayMode}
            onViewHistory={handleOpenObjectHistory}
          />
        </div>
        <div
          className={`tab-panel ${activeTab === 'savings' ? 'active' : ''}`}
          ref={(element) => {
            tabPanelRefs.current.savings = element;
          }}
        >
          <SavingsManager 
            shouldScrollToRetirement={shouldScrollToRetirement}
            onScrollToRetirementComplete={handleScrollToRetirementComplete}
            searchActionRequestKey={savingsSearchRequestKey}
            searchActionType={pendingSavingsSearchAction}
            searchActionTargetId={pendingSavingsSearchTargetId}
            displayMode={effectiveDisplayMode}
            onViewHistory={handleOpenObjectHistory}
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
        <div className="footer-left-actions">
          <Button
            size="small"
            variant="utility"
            onClick={() => setShowFeedbackModal(true)}
            title="Share feedback"
          >
            <MessageSquareText className="ui-icon" aria-hidden="true" />
            Share feedback
          </Button>
        </div>
        <div className="footer-info">
          <span>Last saved: {budgetData.settings.lastSavedAt ? new Date(budgetData.settings.lastSavedAt).toLocaleString() : 'Never'}</span>
          {budgetData.settings.filePath && (
            <>
              <span className="bullet">•</span>
              <Button
                size="small"
                variant="utility"
                onClick={handleEncryptionModalOpen}
                title="Click to open encryption configuration"
                aria-label="Manage encryption settings"
              >
                {budgetData.settings.encryptionEnabled ? (
                  <>
                    <Lock className="ui-icon ui-icon-sm" aria-hidden="true" />
                    Encrypted
                  </>
                ) : (
                  <>
                    <LockOpen className="ui-icon ui-icon-sm" aria-hidden="true" />
                    Unencrypted
                  </>
                )}
              </Button>
              <Button
                size="small"
                variant="utility"
                onClick={handleRevealSavedFile}
                title="Show file in folder"
              >
                <>
                  <FolderOpen className="ui-icon ui-icon-sm" aria-hidden="true" />
                  Open in {fileManagerAppName}
                </>
              </Button>
            </>
          )}
        </div>
      </footer>

      <Suspense fallback={null}>
        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          context={{
            appVersion: APP_VERSION,
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
      </Suspense>
      {/* Edit Plan Metadata Modal */}
      <Modal
        isOpen={showPlanEditModal}
        onClose={handleCancelPlanEdit}
        header="Edit Plan Name and Year"
        headerIcon={<Edit className="ui-icon" aria-hidden="true" />}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={handleCancelPlanEdit}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleSavePlanEdit}>
              Save
            </Button>
          </>
        }
      >
        <p>Update your plan's name and the year. Editing the plan's name will also update the file name to match.</p>
        <FormGroup label="Plan Name" required error={planEditNameError || undefined}>
          <input
            type="text"
            className={planEditNameError ? 'field-error' : ''}
            value={draftPlanName}
            onChange={(event) => {
              setDraftPlanName(event.target.value);
              if (planEditNameError) {
                setPlanEditNameError(null);
              }
            }}
            placeholder="Plan name"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleSavePlanEdit();
              }
            }}
          />
        </FormGroup>

        <FormGroup label="Plan Year" required>
          <Dropdown
            value={draftYearSelection}
            onChange={(event) => {
              const selectedValue = event.target.value;
              setDraftYearSelection(selectedValue);
              if (selectedValue !== 'custom') {
                setDraftYear(selectedValue);
                if (planEditYearError) {
                  setPlanEditYearError(null);
                }
              }
            }}
          >
            <option value={String(budgetData.year - 1)}>{budgetData.year - 1}</option>
            <option value={String(budgetData.year)}>{budgetData.year}</option>
            <option value={String(budgetData.year + 1)}>{budgetData.year + 1}</option>
            <option value="custom">Custom</option>
          </Dropdown>
        </FormGroup>

        {draftYearSelection === 'custom' && (
          <FormGroup
            label="Custom Year"
            required
            helperText={`Allowed range: 2000 to ${new Date().getFullYear() + 10}`}
            error={planEditYearError || undefined}
          >
            <input
              type="number"
              className={planEditYearError ? 'field-error' : ''}
              value={draftYear}
              onChange={(event) => {
                setDraftYear(event.target.value);
                if (planEditYearError) {
                  setPlanEditYearError(null);
                }
              }}
              min="2000"
              max={String(new Date().getFullYear() + 10)}
              placeholder="Enter year"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSavePlanEdit();
                }
              }}
            />
          </FormGroup>
        )}
      </Modal>

      {/* Copy Plan Modal */}
      <Modal
        isOpen={showCopyModal}
        onClose={() => {
          setShowCopyModal(false);
          setCopyYearError(null);
          setNewYear('');
        }}
        header="Copy Plan to New Year"
        headerIcon={<Copy className="ui-icon" aria-hidden="true" />}
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
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => {
          setShowSettings(false);
          setSettingsInitialSection(undefined);
        }}
        initialSectionId={settingsInitialSection}
      />

      <PaySettingsModal
        isOpen={showPaySettingsModal}
        onClose={() => {
          setShowPaySettingsModal(false);
          setPendingPaySettingsFieldHighlight(undefined);
        }}
        searchFieldHighlight={pendingPaySettingsFieldHighlight}
        onViewHistory={handleOpenObjectHistory}
      />

      {/* Encryption Setup Modal */}
      <Modal
        isOpen={showEncryptionSetup && !!budgetData}
        onClose={handleEncryptionModalClose}
        header={encryptionModalHeader}
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
                onClick={goBackToSelection}
                disabled={encryptionSaving}
              >
                Back
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveEncryption}
              disabled={!canSaveSelection || encryptionSaving}
              isLoading={encryptionSaving}
              loadingText="Saving..."
            >
              Continue
            </Button>
          </>
        }
      >
        {encryptionEnabled === true && (
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
            This key will be used to encrypt and decrypt your budget files.
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
          mode="manage"
          currentlyEncrypted={budgetData?.settings?.encryptionEnabled === true}
        />
      </Modal>

      <FileRelinkModal
        isOpen={!!missingActiveFile}
        onClose={handleCloseActiveRelinkModal}
        onLocate={locateActiveRelinkedFile}
        header="Plan File Moved"
        message="Your open plan file was moved or renamed on disk. Locate it to keep saving to the correct file."
        filePath={missingActiveFile?.filePath || ''}
        errorMessage={activeRelinkMismatchMessage ? `${activeRelinkMismatchMessage} Please try again.` : null}
        isLoading={activeRelinkLoading}
      />

      <ErrorDialog
        isOpen={!!errorDialog}
        onClose={closeErrorDialog}
        title={errorDialog?.title || 'Error'}
        message={errorDialog?.message || ''}
        actionLabel={errorDialog?.actionLabel}
      />

      {statusToast && (
        <Toast 
          message={statusToast.message}
          type={statusToast.type}
          duration={2500}
          onDismiss={() => setStatusToast(null)}
        />
      )}

      {/* Accounts Modal */}
      {showAccountsModal && (
        <AccountsModal onClose={() => setShowAccountsModal(false)} />
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
      <Suspense fallback={null}>
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
        />
      </Suspense>

      {/* Plan-wide Search Overlay */}
      <Suspense fallback={null}>
        <PlanSearchOverlay
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          budgetData={budgetData}
          onNavigate={handleSearchNavigate}
        />
      </Suspense>

      <Suspense fallback={null}>
        <PlanHistoryOverlay
          key={historyTarget ? `${historyTarget.entityType}:${historyTarget.entityId}` : 'no-history-target'}
          isOpen={!!historyTarget}
          target={historyTarget}
          auditHistory={budgetData.metadata?.auditHistory || []}
          entityNames={Object.fromEntries((budgetData.accounts || []).map((a) => [a.id, a.name]))}
          onRestoreEntries={handleRestoreHistoryEntries}
          onClose={handleCloseObjectHistory}
          onDeleteEntry={handleDeleteHistoryEntry}
        />
      </Suspense>

      <ConfirmDialog
        isOpen={!!confirmDialog}
        onClose={closeConfirmDialog}
        onConfirm={confirmCurrentDialog}
        title={confirmDialog?.title || 'Confirm'}
        message={confirmDialog?.message || ''}
        confirmLabel={confirmDialog?.confirmLabel}
        cancelLabel={confirmDialog?.cancelLabel}
        confirmVariant={confirmDialog?.confirmVariant}
      />
    </div>
  );
};

export default PlanDashboard;
