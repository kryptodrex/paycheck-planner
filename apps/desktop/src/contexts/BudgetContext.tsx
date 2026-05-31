// Budget Context - Manages all paycheck planning data and operations
// This is like a "global state" that any component can access
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAppDialogs } from '../hooks';
import type { ReactNode } from 'react';
import type { 
  Account
} from '../types/accounts';
import type {
  BudgetData
} from '../types/budget';
import type {
  BudgetContextType
} from '../types/budgetContext';
import type {
  Bill,
  Loan,
  SavingsContribution
} from '../types/obligations';
import type {
  Benefit,
  Deduction,
  OtherIncome,
  PaySettings,
  PaycheckBreakdown,
  RetirementElection,
  TaxSettings
} from '../types/payroll';
import type {
  BudgetSettings
} from '../types/settings';
import { FileStorageService } from '../services/fileStorage';
import { calculatePaycheckBreakdown as calculateBudgetPaycheckBreakdown, getEmptyPaycheckBreakdown } from '../services/budgetCalculations';
import { KeychainService } from '../services/keychainService';
import { roundToCent } from '../utils/money';
import { getPlanNameFromPath } from '../utils/filePath';
import { getPaychecksPerYear } from '../utils/payPeriod';
import { generateDemoBudgetData } from '../utils/demoDataGenerator';
import { HistoryEngine } from '../utils/historyEngine';
import { buildAuditEntries } from '../utils/auditHistory';

// Create the context - this is the "container" for our global state
// Initially undefined, we'll provide the actual value in the Provider
const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

type LegacyRetirementElection = Partial<RetirementElection> & {
  employeeContributionAmount?: number;
  employerMatchAmount?: number;
  employerMatchIsPercentage?: boolean;
};

/**
 * Custom hook to access budget data from any component
 * Usage: const { budgetData, saveBudget } = useBudget()
 * This is much cleaner than passing props down through many components
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useBudget = () => {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
};

// Props type for the BudgetProvider component
// ReactNode means it can contain any valid React children
interface BudgetProviderProps {
  children: ReactNode;
}

/**
 * BudgetProvider component - Wraps the app and provides budget state to all children
 * Think of this as the "manager" that holds and controls all budget data
 */
export const BudgetProvider: React.FC<BudgetProviderProps> = ({ children }) => {
  const HISTORY_MAX_DEPTH = 150;
  const { errorDialog, openErrorDialog, closeErrorDialog } = useAppDialogs();
  // State for the current budget data (null means no budget loaded)
  // The type annotation ensures budgetData matches our BudgetData interface
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  
  // Loading state to show spinners/disable buttons during operations
  const [loading, setLoading] = useState(false);

  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Keep a reference to the last saved state
  const lastSavedDataRef = useRef<string | null>(null);

  // History stacks for app-level undo/redo
  const historyEngineRef = useRef(new HistoryEngine<BudgetData>(HISTORY_MAX_DEPTH));
  const batchStateRef = useRef({
    active: false,
    pendingMutations: 0,
    commitRequested: false,
    commitDescription: undefined as string | undefined,
  });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncHistoryAvailability = useCallback(() => {
    setCanUndo(historyEngineRef.current.canUndo());
    setCanRedo(historyEngineRef.current.canRedo());
  }, []);

  const clearHistory = useCallback(() => {
    historyEngineRef.current.clear();
    batchStateRef.current = {
      active: false,
      pendingMutations: 0,
      commitRequested: false,
      commitDescription: undefined,
    };
    syncHistoryAvailability();
  }, [syncHistoryAvailability]);

  const finalizeBatchCommitIfReady = useCallback(() => {
    const batch = batchStateRef.current;
    if (!batch.active || !batch.commitRequested || batch.pendingMutations > 0) {
      return;
    }

    historyEngineRef.current.commitBatch(batch.commitDescription);
    batchStateRef.current = {
      active: false,
      pendingMutations: 0,
      commitRequested: false,
      commitDescription: undefined,
    };
    syncHistoryAvailability();
  }, [syncHistoryAvailability]);

  const beginBatch = useCallback(() => {
    if (batchStateRef.current.active) return;

    batchStateRef.current = {
      active: true,
      pendingMutations: 0,
      commitRequested: false,
      commitDescription: undefined,
    };
    historyEngineRef.current.beginBatch();
  }, []);

  const commitBatch = useCallback((description?: string) => {
    if (!batchStateRef.current.active) return;

    batchStateRef.current = {
      ...batchStateRef.current,
      commitRequested: true,
      commitDescription: description,
    };

    finalizeBatchCommitIfReady();
  }, [finalizeBatchCommitIfReady]);

  const discardBatch = useCallback(() => {
    historyEngineRef.current.discardBatch();
    batchStateRef.current = {
      active: false,
      pendingMutations: 0,
      commitRequested: false,
      commitDescription: undefined,
    };
  }, []);

  const applyBudgetMutation = useCallback(
    (
      mutate: (current: BudgetData) => BudgetData,
      options?: { trackHistory?: boolean; trackAudit?: boolean; description?: string; touchUpdatedAt?: boolean; note?: string }
    ) => {
      const trackHistory = options?.trackHistory ?? true;
      const trackAudit = options?.trackAudit ?? trackHistory;
      const touchUpdatedAt = options?.touchUpdatedAt ?? true;
      const shouldTrackInBatch = trackHistory && batchStateRef.current.active;

      if (shouldTrackInBatch) {
        batchStateRef.current.pendingMutations += 1;
      }

      setBudgetData((prev) => {
        if (!prev) {
          if (shouldTrackInBatch) {
            batchStateRef.current.pendingMutations = Math.max(0, batchStateRef.current.pendingMutations - 1);
            finalizeBatchCommitIfReady();
          }
          return prev;
        }

        const nextBase = mutate(prev);
        if (nextBase === prev) {
          if (shouldTrackInBatch) {
            batchStateRef.current.pendingMutations = Math.max(0, batchStateRef.current.pendingMutations - 1);
            finalizeBatchCommitIfReady();
          }
          return prev;
        }

        const next = touchUpdatedAt
          ? {
              ...nextBase,
              updatedAt: new Date().toISOString(),
            }
          : nextBase;

        const auditEntries = trackAudit
          ? buildAuditEntries({
              prev,
              next,
              sourceAction: options?.description || 'Update plan data',
              note: options?.note,
            })
          : [];

        const nextWithAudit = auditEntries.length > 0
          ? {
              ...next,
              metadata: {
                auditHistory: [...(next.metadata?.auditHistory || []), ...auditEntries],
              },
            }
          : next;

        if (trackHistory) {
          historyEngineRef.current.push(prev, options?.description);
        }

        if (shouldTrackInBatch) {
          batchStateRef.current.pendingMutations = Math.max(0, batchStateRef.current.pendingMutations - 1);
        }

        syncHistoryAvailability();
        if (shouldTrackInBatch) {
          finalizeBatchCommitIfReady();
        }
        return nextWithAudit;
      });
    },
    [finalizeBatchCommitIfReady, syncHistoryAvailability],
  );

  const undo = useCallback(() => {
    setBudgetData((prev) => {
      if (!prev) return prev;

      const restored = historyEngineRef.current.undo(prev);
      if (!restored) return prev;

      syncHistoryAvailability();
      return restored;
    });
  }, [syncHistoryAvailability]);

  const redo = useCallback(() => {
    setBudgetData((prev) => {
      if (!prev) return prev;

      const restored = historyEngineRef.current.redo(prev);
      if (!restored) return prev;

      syncHistoryAvailability();
      return restored;
    });
  }, [syncHistoryAvailability]);

  // Update unsaved changes tracking whenever budgetData changes
  useEffect(() => {
    if (!budgetData) {
      setHasUnsavedChanges(false);
      return;
    }

    const paySettings = budgetData.paySettings;
    const isSetupComplete =
      (paySettings.payType === 'salary' && (paySettings.annualSalary || 0) > 0) ||
      (paySettings.payType === 'hourly' && (paySettings.hourlyRate || 0) > 0);

    // Setup wizard plans are intentionally treated as not-yet-saveable.
    // Avoid close/save prompts until setup has been completed.
    if (!isSetupComplete) {
      setHasUnsavedChanges(false);
      return;
    }

    // New plans that have never been saved should always prompt on close
    if (!budgetData.settings?.filePath) {
      setHasUnsavedChanges(true);
      return;
    }

    const currentData = JSON.stringify(budgetData);
    if (lastSavedDataRef.current === null) {
      // First load, no changes yet
      lastSavedDataRef.current = currentData;
      setHasUnsavedChanges(false);
    } else if (currentData !== lastSavedDataRef.current) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [budgetData]);

  // Store unsaved changes state globally so Electron can access it
  useEffect(() => {
    // Use a global variable instead of trying to modify the frozen electronAPI object
    window.__hasUnsavedChanges = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  /**
   * Save the current budget to disk
   * useCallback prevents recreating this function on every render (performance optimization)
   * @returns true if save was successful, false if cancelled or failed
   */
  const saveBudget = useCallback(async (activeTab?: string, budgetOverride?: Partial<BudgetData>): Promise<boolean> => {
    if (!budgetData) return false;

    setLoading(true);
    try {
      const saveTimestamp = new Date().toISOString();

      // Get current window bounds to save with the plan
      let windowSize: { width: number; height: number; x: number; y: number } | undefined;
      try {
        const bounds = await window.electronAPI.getWindowBounds();
        windowSize = { width: bounds.width, height: bounds.height, x: bounds.x, y: bounds.y };
      } catch (error) {
        console.warn('Could not get window bounds:', error);
        // Continue without window size if this fails
      }

      const baseBudget = budgetOverride
        ? {
            ...budgetData,
            ...budgetOverride,
            // Explicitly preserve arrays that shouldn't be overridden
            benefits: budgetOverride.benefits ?? budgetData.benefits,
            retirement: budgetOverride.retirement ?? budgetData.retirement,
            bills: budgetOverride.bills ?? budgetData.bills,
            accounts: budgetOverride.accounts ?? budgetData.accounts,
            settings: {
              ...budgetData.settings,
              ...(budgetOverride.settings || {}),
            },
          }
        : budgetData;

      // Debug: Log retirement array length during save
      if (import.meta.env.DEV) console.debug('[SAVE] Retirement count:', baseBudget.retirement?.length || 0);

      // Update the "last modified" timestamp
      const updatedBudget = {
        ...baseBudget, // Spread operator: copy all existing properties
        updatedAt: saveTimestamp,
      };

      // Note: Each plan maintains its own encryptionEnabled setting (set during SetupWizard)
      // Encryption keys are stored in the system keychain, not in settings

      let targetFilePath = updatedBudget.settings.filePath;

      // If the stored path no longer exists (for example, renamed in Finder/Explorer),
      // force Save As so we don't silently recreate an outdated duplicate path.
      if (targetFilePath && window.electronAPI?.fileExists) {
        try {
          const exists = await window.electronAPI.fileExists(targetFilePath);
          if (!exists) {
            targetFilePath = undefined;
          }
        } catch (error) {
          console.warn('Could not verify saved file path before save:', error);
        }
      }

      // Save to file and get back the canonical file path
      const filePath = await FileStorageService.saveBudget(
        updatedBudget,
        targetFilePath
      );

      // If user canceled the dialog, filePath will be null
      if (!filePath) {
        return false;
      }

      const derivedPlanName = getPlanNameFromPath(filePath);

      // Update state with the new file path, window size, active tab, and save timestamp
      const savedBudget = {
        ...updatedBudget,
        name: derivedPlanName || updatedBudget.name,
        settings: {
          ...updatedBudget.settings,
          filePath,
          lastSavedAt: saveTimestamp,
          windowSize,
          activeTab,
        },
      };
      setBudgetData(savedBudget);
      if (import.meta.env.DEV) console.debug('[SAVE] Setting saved budget with retirement count:', savedBudget.retirement?.length || 0);
      
      // Mark as saved
      lastSavedDataRef.current = JSON.stringify(savedBudget);
      setHasUnsavedChanges(false);
      return true;
    } catch (error) {
      console.error('Error saving budget:', error);
      openErrorDialog({
        title: 'Save Failed',
        message: 'Failed to save budget: ' + (error as Error).message,
        actionLabel: 'Retry',
      });
      return false;
    } finally {
      // Always runs, even if there's an error
      setLoading(false);
    }
  }, [budgetData, openErrorDialog]); // Dependency: recreate this function if budgetData changes

  /**
   * Save only window state (size and active tab) to the budget file
   * This is used when closing a window to preserve window size without saving content
   */
  const saveWindowState = useCallback(async (width: number, height: number, x: number, y: number, activeTab?: string): Promise<void> => {
    if (!budgetData?.settings?.filePath) return;

    try {
      // Update settings with new window size and active tab
      const updatedBudget = {
        ...budgetData,
        settings: {
          ...budgetData.settings,
          windowSize: { width, height, x, y },
          activeTab: activeTab || budgetData.settings.activeTab,
        },
      };

      // Save to file (using existing file path, no dialog)
      await FileStorageService.saveBudget(updatedBudget, budgetData.settings.filePath);
      
      // Update local state
      setBudgetData(updatedBudget);
      
      // Update saved ref if this matches the last saved content
      // (so window resize doesn't make the plan appear unsaved)
      const currentDataWithoutWindowState = { ...budgetData, settings: { ...budgetData.settings } };
      delete currentDataWithoutWindowState.settings.windowSize;
      delete currentDataWithoutWindowState.settings.activeTab;
      
      const lastSavedDataParsed = lastSavedDataRef.current ? JSON.parse(lastSavedDataRef.current) : null;
      if (lastSavedDataParsed) {
        const lastSavedWithoutWindowState = { ...lastSavedDataParsed, settings: { ...lastSavedDataParsed.settings } };
        delete lastSavedWithoutWindowState.settings.windowSize;
        delete lastSavedWithoutWindowState.settings.activeTab;
        
        // If content is the same (only window state changed), update the saved ref
        if (JSON.stringify(currentDataWithoutWindowState) === JSON.stringify(lastSavedWithoutWindowState)) {
          lastSavedDataRef.current = JSON.stringify(updatedBudget);
        }
      }
    } catch (error) {
      console.error('Error saving window state:', error);
      // Silently fail - window state is not critical
    }
  }, [budgetData]);

  /**
   * Load a budget from disk
   * @param filePath - Optional path to load from (user will be prompted if not provided)
   */
  const loadBudget = useCallback(async (filePath?: string) => {
    setLoading(true);
    try {
      const data = await FileStorageService.loadBudget(filePath);
      // If user canceled the dialog, data will be null
      if (!data) {
        return;
      }
      
      // Migrate old budget data to include new fields if they don't exist
      if (!data.benefits) {
        data.benefits = [];
      }
      if (!data.retirement) {
        data.retirement = [];
      }
      if (!data.savingsContributions) {
        data.savingsContributions = [];
      }
      if (!data.loans) {
        data.loans = [];
      }

      // Migrate lastSavedAt for older files:
      // If plan has a file path but no explicit lastSavedAt yet, use updatedAt as fallback.
      if (data.settings?.filePath && !data.settings.lastSavedAt && data.updatedAt) {
        data.settings.lastSavedAt = data.updatedAt;
      }

      // Migrate benefits to include deduction source fields
      data.benefits = data.benefits.map((benefit) => ({
        ...benefit,
        deductionSource: benefit.deductionSource || (benefit.sourceAccountId ? 'account' : 'paycheck'),
        sourceAccountId: benefit.sourceAccountId,
      }));
      
      // Migrate old retirement election format to new format
      data.retirement = data.retirement.map((election) => {
        const legacyElection = election as LegacyRetirementElection;

        const employeeContribution =
          typeof legacyElection.employeeContributionAmount === 'number'
            ? legacyElection.employeeContributionAmount
            : legacyElection.employeeContribution ?? 0;

        const hasEmployerMatch =
          legacyElection.hasEmployerMatch ??
          ((legacyElection.employerMatchAmount ?? 0) > 0);

        const migrated: RetirementElection = {
          id: legacyElection.id || crypto.randomUUID(),
          type: legacyElection.type || '401k',
          customLabel: legacyElection.customLabel,
          employeeContribution,
          employeeContributionIsPercentage: legacyElection.employeeContributionIsPercentage ?? true,
          isPreTax: legacyElection.isPreTax ?? true,
          deductionSource: legacyElection.deductionSource ?? (legacyElection.sourceAccountId ? 'account' : 'paycheck'),
          sourceAccountId: legacyElection.sourceAccountId,
          hasEmployerMatch,
          employerMatchCap: legacyElection.employerMatchCap ?? legacyElection.employerMatchAmount ?? 0,
          employerMatchCapIsPercentage:
            legacyElection.employerMatchCapIsPercentage ?? legacyElection.employerMatchIsPercentage ?? false,
          yearlyLimit: legacyElection.yearlyLimit,
        };

        return migrated;
      });

      // Keep plan name in sync with the actual file name when opened from disk.
      const derivedPlanName = getPlanNameFromPath(data.settings?.filePath);
      if (derivedPlanName) {
        data.name = derivedPlanName;
      }
      
      setBudgetData(data);
      clearHistory();
      // Mark as saved (just loaded)
      lastSavedDataRef.current = JSON.stringify(data);
      setHasUnsavedChanges(false);
      
      // Notify main process that a budget is loaded (transitions welcome to plan window)
      // Pass window size if available so main process can restore it
      if (window.electronAPI) {
        await window.electronAPI.budgetLoaded(data.settings?.windowSize);
      }
    } catch (error) {
      console.error('Error loading budget:', error);
      openErrorDialog({
        title: 'Load Failed',
        message: 'Failed to load budget: ' + (error as Error).message,
        actionLabel: 'Retry',
      });
    } finally {
      setLoading(false);
    }
  }, [clearHistory, openErrorDialog]); // No dependencies beyond dialog display

  /**
   * Create a new empty budget plan
   * @param year - The year for the new plan
   */
  const createNewBudget = useCallback((year: number) => {
    const newBudget = FileStorageService.createEmptyBudget(year);
    setBudgetData(newBudget);
    clearHistory();
    
    // Notify main process that a budget is loaded (transitions welcome to plan window)
    if (window.electronAPI) {
      window.electronAPI.budgetLoaded();
    }
  }, [clearHistory]);

  /**
   * Create a demo budget with realistic randomly-generated data
   * Used for app demonstration and testing
   */
  const createDemoBudget = useCallback(() => {
    const year = new Date().getFullYear();
    const demoBudget = generateDemoBudgetData(year);
    setBudgetData(demoBudget);
    clearHistory();
    
    // Notify main process that a budget is loaded (transitions welcome to plan window)
    if (window.electronAPI) {
      window.electronAPI.budgetLoaded();
    }
  }, [clearHistory]);

  /**
   * Close the current budget and return to welcome screen
   */
  const closeBudget = useCallback(() => {
    setBudgetData(null);
    setHasUnsavedChanges(false);
    lastSavedDataRef.current = '';
    clearHistory();
  }, [clearHistory]);

  /**
   * Copy the current plan to a new year
   * If the current plan is encrypted, the encryption key is transferred to the new plan
   * @param newYear - The target year
   */
  const copyPlanToNewYear = useCallback(async (newYear: number) => {
    if (!budgetData) return;
    
    const newBudget: BudgetData = {
      ...budgetData,
      id: crypto.randomUUID(),
      name: `${newYear} Plan`,
      year: newYear,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        ...budgetData.settings,
        filePath: undefined, // Clear file path for new plan
      },
    };
    
    // If the old plan was encrypted, transfer the encryption key to the new plan
    if (budgetData.settings.encryptionEnabled) {
      try {
        // Retrieve the encryption key for the old plan
        const encryptionKey = await KeychainService.getKey(budgetData.id);
        if (encryptionKey) {
          // Save the same key for the new plan
          await KeychainService.saveKey(newBudget.id, encryptionKey);
        }
      } catch (error) {
        console.error('Failed to copy encryption key to new plan:', error);
        // Continue anyway - user can set up encryption again if needed
      }
    }
    
    setBudgetData(newBudget);
    clearHistory();
  }, [budgetData, clearHistory]);

  /**
   * Generic update function for bulk changes (e.g., reordering accounts)
   */
  const updateBudgetData = useCallback(
    (updates: Partial<BudgetData>, options?: { trackHistory?: boolean; trackAudit?: boolean; description?: string; note?: string }) => {
      applyBudgetMutation(
        (current) => ({
          ...current,
          ...updates,
        }),
        {
          trackHistory: options?.trackHistory,
          trackAudit: options?.trackAudit,
          description: options?.description ?? 'Update plan data',
          note: options?.note,
        },
      );
    },
    [applyBudgetMutation],
  );

  /**
   * Update pay settings
   */
  const updatePaySettings = useCallback((settings: PaySettings) => {
    applyBudgetMutation(
      (current) => ({
        ...current,
        paySettings: settings,
      }),
      { description: 'Update pay settings' },
    );
  }, [applyBudgetMutation]);

  /**
   * Add a new pre-tax deduction
   */
  const addDeduction = useCallback((deduction: Omit<Deduction, 'id'>) => {
    applyBudgetMutation(
      (current) => ({
        ...current,
        preTaxDeductions: [
          ...current.preTaxDeductions,
          {
            ...deduction,
            id: crypto.randomUUID(),
          },
        ],
      }),
      { description: 'Add pre-tax deduction' },
    );
  }, [applyBudgetMutation]);

  /**
   * Update an existing deduction
   */
  const updateDeduction = useCallback((id: string, deduction: Partial<Deduction>) => {
    applyBudgetMutation(
      (current) => ({
        ...current,
        preTaxDeductions: current.preTaxDeductions.map((d) =>
          d.id === id ? { ...d, ...deduction } : d,
        ),
      }),
      { description: 'Update pre-tax deduction' },
    );
  }, [applyBudgetMutation]);

  /**
   * Delete a deduction
   */
  const deleteDeduction = useCallback((id: string) => {
    applyBudgetMutation(
      (current) => ({
        ...current,
        preTaxDeductions: current.preTaxDeductions.filter((d) => d.id !== id),
      }),
      { description: 'Delete pre-tax deduction' },
    );
  }, [applyBudgetMutation]);

  /**
   * Update tax settings
   */
  const updateTaxSettings = useCallback((settings: TaxSettings) => {
    applyBudgetMutation(
      (current) => ({
        ...current,
        taxSettings: settings,
      }),
      { description: 'Update tax settings' },
    );
  }, [applyBudgetMutation]);

  /**
   * Update budget settings (currency, locale, etc.)
   */
  const updateBudgetSettings = useCallback((settings: BudgetSettings) => {
    applyBudgetMutation(
      (current) => ({
        ...current,
        settings,
      }),
      { description: 'Update budget settings' },
    );
  }, [applyBudgetMutation]);

  /**
   * Add a new account
   */
  const addAccount = useCallback((account: Omit<Account, 'id'>) => {
    applyBudgetMutation(
      (current) => ({
        ...current,
        accounts: [
          ...current.accounts,
          {
            ...account,
            id: crypto.randomUUID(),
          },
        ],
      }),
      { description: 'Add account' },
    );
  }, [applyBudgetMutation]);

  /**
   * Update an existing account
   */
  const updateAccount = useCallback((id: string, account: Partial<Account>) => {
    applyBudgetMutation(
      (current) => ({
        ...current,
        accounts: current.accounts.map((a) =>
          a.id === id ? { ...a, ...account } : a,
        ),
      }),
      { description: 'Update account' },
    );
  }, [applyBudgetMutation]);

  /**
   * Delete an account
   */
  const deleteAccount = useCallback((id: string) => {
    applyBudgetMutation(
      (current) => ({
        ...current,
        accounts: current.accounts.filter((a) => a.id !== id),
      }),
      { description: 'Delete account' },
    );
  }, [applyBudgetMutation]);

  /**
   * Add a new bill
   */
  const addBill = useCallback((bill: Omit<Bill, 'id'>) => {
    applyBudgetMutation(
      (current) => ({
        ...current,
        bills: [
          ...current.bills,
          {
            ...bill,
            enabled: bill.enabled !== false,
            id: crypto.randomUUID(),
          },
        ],
      }),
      { description: 'Add bill' },
    );
  }, [applyBudgetMutation]);

  /**
   * Update an existing bill
   */
  const updateBill = useCallback((id: string, bill: Partial<Bill>) => {
    applyBudgetMutation(
      (current) => ({
        ...current,
        bills: current.bills.map((b) =>
          b.id === id ? { ...b, ...bill } : b,
        ),
      }),
      { description: 'Update bill' },
    );
  }, [applyBudgetMutation]);

  /**
   * Delete a bill
   */
  const deleteBill = useCallback((id: string) => {
    applyBudgetMutation(
      (current) => ({
        ...current,
        bills: current.bills.filter((b) => b.id !== id),
      }),
      { description: 'Delete bill' },
    );
  }, [applyBudgetMutation]);

  /**
   * Add a new loan
   */
  const addLoan = useCallback((loan: Omit<Loan, 'id'>) => {
    applyBudgetMutation(
      (current) => {
        const loans = current.loans ?? [];
        return {
          ...current,
          loans: [
            ...loans,
            {
              ...loan,
              enabled: loan.enabled !== false,
              id: crypto.randomUUID(),
            },
          ],
        };
      },
      { description: 'Add loan' },
    );
  }, [applyBudgetMutation]);

  /**
   * Update an existing loan
   */
  const updateLoan = useCallback((id: string, loan: Partial<Loan>) => {
    applyBudgetMutation(
      (current) => {
        const loans = current.loans ?? [];
        return {
          ...current,
          loans: loans.map((l) =>
            l.id === id ? { ...l, ...loan } : l,
          ),
        };
      },
      { description: 'Update loan' },
    );
  }, [applyBudgetMutation]);

  /**
   * Delete a loan
   */
  const deleteLoan = useCallback((id: string) => {
    applyBudgetMutation(
      (current) => {
        const loans = current.loans ?? [];
        return {
          ...current,
          loans: loans.filter((l) => l.id !== id),
        };
      },
      { description: 'Delete loan' },
    );
  }, [applyBudgetMutation]);

  /**
   * Add a new benefit
   */
  const addBenefit = useCallback((benefit: Omit<Benefit, 'id'>) => {
    applyBudgetMutation(
      (current) => ({
        ...current,
        benefits: [
          ...current.benefits,
          {
            ...benefit,
            enabled: benefit.enabled !== false,
            id: crypto.randomUUID(),
          },
        ],
      }),
      { description: 'Add benefit' },
    );
  }, [applyBudgetMutation]);

  /**
   * Update an existing benefit
   */
  const updateBenefit = useCallback((id: string, benefit: Partial<Benefit>) => {
    applyBudgetMutation(
      (current) => ({
        ...current,
        benefits: current.benefits.map((b) =>
          b.id === id ? { ...b, ...benefit } : b,
        ),
      }),
      { description: 'Update benefit' },
    );
  }, [applyBudgetMutation]);

  /**
   * Delete a benefit
   */
  const deleteBenefit = useCallback((id: string) => {
    applyBudgetMutation(
      (current) => ({
        ...current,
        benefits: current.benefits.filter((b) => b.id !== id),
      }),
      { description: 'Delete benefit' },
    );
  }, [applyBudgetMutation]);

  /**
   * Add a new other income entry
   */
  const addOtherIncome = useCallback((income: Omit<OtherIncome, 'id'>) => {
    applyBudgetMutation(
      (current) => {
        const existing = current.otherIncome ?? [];
        return {
          ...current,
          otherIncome: [
            ...existing,
            {
              ...income,
              enabled: income.enabled !== false,
              id: crypto.randomUUID(),
            },
          ],
        };
      },
      { description: 'Add other income' },
    );
  }, [applyBudgetMutation]);

  /**
   * Update an existing other income entry
   */
  const updateOtherIncome = useCallback((id: string, income: Partial<OtherIncome>) => {
    applyBudgetMutation(
      (current) => {
        const existing = current.otherIncome ?? [];
        return {
          ...current,
          otherIncome: existing.map((entry) =>
            entry.id === id ? { ...entry, ...income } : entry,
          ),
        };
      },
      { description: 'Update other income' },
    );
  }, [applyBudgetMutation]);

  /**
   * Delete an existing other income entry
   */
  const deleteOtherIncome = useCallback((id: string) => {
    applyBudgetMutation(
      (current) => {
        const existing = current.otherIncome ?? [];
        return {
          ...current,
          otherIncome: existing.filter((entry) => entry.id !== id),
        };
      },
      { description: 'Delete other income' },
    );
  }, [applyBudgetMutation]);

  /**
   * Add a new savings/investment contribution
   */
  const addSavingsContribution = useCallback((contribution: Omit<SavingsContribution, 'id'>) => {
    applyBudgetMutation(
      (current) => {
        const existing = current.savingsContributions ?? [];
        return {
          ...current,
          savingsContributions: [
            ...existing,
            {
              ...contribution,
              enabled: contribution.enabled !== false,
              id: crypto.randomUUID(),
            },
          ],
        };
      },
      { description: 'Add savings contribution' },
    );
  }, [applyBudgetMutation]);

  /**
   * Update an existing savings/investment contribution
   */
  const updateSavingsContribution = useCallback((id: string, contribution: Partial<SavingsContribution>) => {
    applyBudgetMutation(
      (current) => {
        const existing = current.savingsContributions ?? [];
        return {
          ...current,
          savingsContributions: existing.map((item) =>
            item.id === id ? { ...item, ...contribution } : item,
          ),
        };
      },
      { description: 'Update savings contribution' },
    );
  }, [applyBudgetMutation]);

  /**
   * Delete a savings/investment contribution
   */
  const deleteSavingsContribution = useCallback((id: string) => {
    applyBudgetMutation(
      (current) => {
        const existing = current.savingsContributions ?? [];
        return {
          ...current,
          savingsContributions: existing.filter((item) => item.id !== id),
        };
      },
      { description: 'Delete savings contribution' },
    );
  }, [applyBudgetMutation]);

  /**
   * Add a new retirement election
   */
  const addRetirementElection = useCallback((election: Omit<RetirementElection, 'id'>) => {
    applyBudgetMutation(
      (current) => ({
        ...current,
        retirement: [
          ...current.retirement,
          {
            ...election,
            enabled: election.enabled !== false,
            id: crypto.randomUUID(),
          },
        ],
      }),
      { description: 'Add retirement election' },
    );
  }, [applyBudgetMutation]);

  /**
   * Update an existing retirement election
   */
  const updateRetirementElection = useCallback((id: string, election: Partial<RetirementElection>) => {
    applyBudgetMutation(
      (current) => ({
        ...current,
        retirement: current.retirement.map((r) =>
          r.id === id ? { ...r, ...election } : r,
        ),
      }),
      { description: 'Update retirement election' },
    );
  }, [applyBudgetMutation]);

  /**
   * Delete a retirement election
   */
  const deleteRetirementElection = useCallback((id: string) => {
    applyBudgetMutation(
      (current) => ({
        ...current,
        retirement: current.retirement.filter((r) => r.id !== id),
      }),
      { description: 'Delete retirement election' },
    );
  }, [applyBudgetMutation]);

  /**
   * Calculate paycheck breakdown
   */
  const calculatePaycheckBreakdown = useCallback((): PaycheckBreakdown => {
    if (!budgetData) {
      return getEmptyPaycheckBreakdown();
    }

    return calculateBudgetPaycheckBreakdown(budgetData);
  }, [budgetData]);

  /**
   * Calculate retirement contribution amounts for display.
   * Employer match is intentionally excluded from in-app retirement math.
   */
  const calculateRetirementContributions = useCallback((election: RetirementElection) => {
    if (!budgetData || election.enabled === false) {
      return { employeeAmount: 0, employerAmount: 0 };
    }

    const { paySettings } = budgetData;
    
    // Calculate gross pay per paycheck
    let grossPay = 0;
    if (paySettings.payType === 'salary' && paySettings.annualSalary) {
      const paychecksPerYear = getPaychecksPerYear(paySettings.payFrequency);
      grossPay = paySettings.annualSalary / paychecksPerYear;
    } else if (paySettings.payType === 'hourly' && paySettings.hourlyRate && paySettings.hoursPerPayPeriod) {
      grossPay = paySettings.hourlyRate * paySettings.hoursPerPayPeriod;
    }

    // If no pay settings configured yet, return zeros
    if (grossPay === 0) {
      return { employeeAmount: 0, employerAmount: 0 };
    }

    // Calculate employee contribution
    let employeeAmount = 0;
    if (election.employeeContributionIsPercentage) {
      employeeAmount = roundToCent((grossPay * election.employeeContribution) / 100);
    } else {
      employeeAmount = roundToCent(election.employeeContribution);
    }

    return { employeeAmount, employerAmount: 0 };
  }, [budgetData]);

  /**
   * Open a dialog to select where to save budget files
   */
  const selectSaveLocation = useCallback(async () => {
    try {
      const directory = await FileStorageService.selectDirectory();
      if (directory && budgetData) {
        setBudgetData({
          ...budgetData,
          settings: {
            ...budgetData.settings,
            filePath: `${directory}/${budgetData.name}.budget`,
          },
        });
      }
    } catch (error) {
      console.error('Error selecting save location:', error);
      openErrorDialog({
        title: 'Select Save Location Failed',
        message: 'Failed to select save location: ' + (error as Error).message,
        actionLabel: 'Retry',
      });
    }
  }, [budgetData, openErrorDialog]);

  // Bundle all our state and functions into a single object
  // This is what gets provided to all child components
  const value: BudgetContextType = {
    budgetData,
    loading,
    undo,
    redo,
    canUndo,
    canRedo,
    beginBatch,
    commitBatch,
    discardBatch,
    saveBudget,
    saveWindowState,
    loadBudget,
    createNewBudget,
    createDemoBudget,
    closeBudget,
    copyPlanToNewYear,
    selectSaveLocation,
    updateBudgetData,
    updatePaySettings,
    addDeduction,
    updateDeduction,
    deleteDeduction,
    updateTaxSettings,
    updateBudgetSettings,
    addAccount,
    updateAccount,
    deleteAccount,
    addBill,
    updateBill,
    deleteBill,
    addBenefit,
    updateBenefit,
    deleteBenefit,
    addOtherIncome,
    updateOtherIncome,
    deleteOtherIncome,
    addSavingsContribution,
    updateSavingsContribution,
    deleteSavingsContribution,
    addRetirementElection,
    updateRetirementElection,
    deleteRetirementElection,
    calculatePaycheckBreakdown,
    calculateRetirementContributions,
    addLoan,
    updateLoan,
    deleteLoan,
    errorDialog,
    closeErrorDialog,
  };

  // Provide the value to all children components
  return (
    <BudgetContext.Provider value={value}>
      {children}
    </BudgetContext.Provider>
  );
};
