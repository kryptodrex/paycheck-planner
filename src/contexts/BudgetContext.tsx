// Budget Context - Manages all paycheck planning data and operations
// This is like a "global state" that any component can access
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { 
  BudgetData, 
  BudgetContextType, 
  PaySettings,
  Deduction,
  TaxSettings,
  BudgetSettings,
  Account,
  Bill,
  Benefit,
  RetirementElection,
  PaycheckBreakdown,
  Loan
} from '../types/auth';
import { FileStorageService } from '../services/fileStorage';
import { KeychainService } from '../services/keychainService';
import { roundUpToCent } from '../utils/money';
import { getPaychecksPerYear } from '../utils/payPeriod';
import { generateDemoBudgetData } from '../utils/demoDataGenerator';

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
  // State for the current budget data (null means no budget loaded)
  // The type annotation ensures budgetData matches our BudgetData interface
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  
  // Loading state to show spinners/disable buttons during operations
  const [loading, setLoading] = useState(false);

  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Keep a reference to the last saved state
  const lastSavedDataRef = useRef<string | null>(null);

  // Update unsaved changes tracking whenever budgetData changes
  useEffect(() => {
    if (!budgetData) {
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

      // Save to file and get back the file path
      const filePath = await FileStorageService.saveBudget(
        updatedBudget,
        updatedBudget.settings.filePath
      );

      // If user canceled the dialog, filePath will be null
      if (!filePath) {
        return false;
      }

      // Update state with the new file path, window size, active tab, and save timestamp
      const savedBudget = {
        ...updatedBudget,
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
      // Type assertion: tell TypeScript that error is an Error object
      alert('Failed to save budget: ' + (error as Error).message);
      return false;
    } finally {
      // Always runs, even if there's an error
      setLoading(false);
    }
  }, [budgetData]); // Dependency: recreate this function if budgetData changes

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
      
      setBudgetData(data);
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
      alert('Failed to load budget: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies: this function never needs to be recreated

  /**
   * Create a new empty budget plan
   * @param year - The year for the new plan
   */
  const createNewBudget = useCallback((year: number) => {
    const newBudget = FileStorageService.createEmptyBudget(year);
    setBudgetData(newBudget);
    
    // Notify main process that a budget is loaded (transitions welcome to plan window)
    if (window.electronAPI) {
      window.electronAPI.budgetLoaded();
    }
  }, []);

  /**
   * Create a demo budget with realistic randomly-generated data
   * Used for app demonstration and testing
   */
  const createDemoBudget = useCallback(() => {
    const year = new Date().getFullYear();
    const demoBudget = generateDemoBudgetData(year);
    setBudgetData(demoBudget);
    
    // Notify main process that a budget is loaded (transitions welcome to plan window)
    if (window.electronAPI) {
      window.electronAPI.budgetLoaded();
    }
  }, []);

  /**
   * Close the current budget and return to welcome screen
   */
  const closeBudget = useCallback(() => {
    setBudgetData(null);
    setHasUnsavedChanges(false);
    lastSavedDataRef.current = '';
  }, []);

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
  }, [budgetData]);

  /**
   * Generic update function for bulk changes (e.g., reordering accounts)
   */
  const updateBudgetData = useCallback((updates: Partial<BudgetData>) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Update pay settings
   */
  const updatePaySettings = useCallback((settings: PaySettings) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        paySettings: settings,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Add a new pre-tax deduction
   */
  const addDeduction = useCallback((deduction: Omit<Deduction, 'id'>) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        preTaxDeductions: [
          ...prev.preTaxDeductions,
          {
            ...deduction,
            id: crypto.randomUUID(),
          },
        ],
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Update an existing deduction
   */
  const updateDeduction = useCallback((id: string, deduction: Partial<Deduction>) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        preTaxDeductions: prev.preTaxDeductions.map((d) =>
          d.id === id ? { ...d, ...deduction } : d
        ),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Delete a deduction
   */
  const deleteDeduction = useCallback((id: string) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        preTaxDeductions: prev.preTaxDeductions.filter((d) => d.id !== id),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Update tax settings
   */
  const updateTaxSettings = useCallback((settings: TaxSettings) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        taxSettings: settings,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Update budget settings (currency, locale, etc.)
   */
  const updateBudgetSettings = useCallback((settings: BudgetSettings) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        settings: settings,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Add a new account
   */
  const addAccount = useCallback((account: Omit<Account, 'id'>) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        accounts: [
          ...prev.accounts,
          {
            ...account,
            id: crypto.randomUUID(),
          },
        ],
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Update an existing account
   */
  const updateAccount = useCallback((id: string, account: Partial<Account>) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        accounts: prev.accounts.map((a) =>
          a.id === id ? { ...a, ...account } : a
        ),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Delete an account
   */
  const deleteAccount = useCallback((id: string) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        accounts: prev.accounts.filter((a) => a.id !== id),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Add a new bill
   */
  const addBill = useCallback((bill: Omit<Bill, 'id'>) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        bills: [
          ...prev.bills,
          {
            ...bill,
            enabled: bill.enabled !== false,
            id: crypto.randomUUID(),
          },
        ],
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Update an existing bill
   */
  const updateBill = useCallback((id: string, bill: Partial<Bill>) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        bills: prev.bills.map((b) =>
          b.id === id ? { ...b, ...bill } : b
        ),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Delete a bill
   */
  const deleteBill = useCallback((id: string) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        bills: prev.bills.filter((b) => b.id !== id),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Add a new loan
   */
  const addLoan = useCallback((loan: Omit<Loan, 'id'>) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      const loans = prev.loans ?? [];
      return {
        ...prev,
        loans: [
          ...loans,
          {
            ...loan,
            enabled: loan.enabled !== false,
            id: crypto.randomUUID(),
          },
        ],
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Update an existing loan
   */
  const updateLoan = useCallback((id: string, loan: Partial<Loan>) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      const loans = prev.loans ?? [];
      return {
        ...prev,
        loans: loans.map((l) =>
          l.id === id ? { ...l, ...loan } : l
        ),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Delete a loan
   */
  const deleteLoan = useCallback((id: string) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      const loans = prev.loans ?? [];
      return {
        ...prev,
        loans: loans.filter((l) => l.id !== id),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Add a new benefit
   */
  const addBenefit = useCallback((benefit: Omit<Benefit, 'id'>) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        benefits: [
          ...prev.benefits,
          {
            ...benefit,
            id: crypto.randomUUID(),
          },
        ],
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Update an existing benefit
   */
  const updateBenefit = useCallback((id: string, benefit: Partial<Benefit>) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        benefits: prev.benefits.map((b) =>
          b.id === id ? { ...b, ...benefit } : b
        ),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Delete a benefit
   */
  const deleteBenefit = useCallback((id: string) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        benefits: prev.benefits.filter((b) => b.id !== id),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Add a new retirement election
   */
  const addRetirementElection = useCallback((election: Omit<RetirementElection, 'id'>) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        retirement: [
          ...prev.retirement,
          {
            ...election,
            id: crypto.randomUUID(),
          },
        ],
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Update an existing retirement election
   */
  const updateRetirementElection = useCallback((id: string, election: Partial<RetirementElection>) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        retirement: prev.retirement.map((r) =>
          r.id === id ? { ...r, ...election } : r
        ),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Delete a retirement election
   */
  const deleteRetirementElection = useCallback((id: string) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        retirement: prev.retirement.filter((r) => r.id !== id),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Calculate paycheck breakdown
   */
  const calculatePaycheckBreakdown = useCallback((): PaycheckBreakdown => {
    if (!budgetData) {
      return {
        grossPay: 0,
        preTaxDeductions: 0,
        taxableIncome: 0,
        federalTax: 0,
        stateTax: 0,
        socialSecurity: 0,
        medicare: 0,
        additionalWithholding: 0,
        totalTaxes: 0,
        netPay: 0,
      };
    }

    const { paySettings, preTaxDeductions, benefits = [], retirement = [], taxSettings } = budgetData;
    
    // Calculate gross pay per paycheck
    let grossPay = 0;
    if (paySettings.payType === 'salary' && paySettings.annualSalary) {
      const paychecksPerYear = getPaychecksPerYear(paySettings.payFrequency);
      grossPay = roundUpToCent(paySettings.annualSalary / paychecksPerYear);
    } else if (paySettings.payType === 'hourly' && paySettings.hourlyRate && paySettings.hoursPerPayPeriod) {
      grossPay = roundUpToCent(paySettings.hourlyRate * paySettings.hoursPerPayPeriod);
    }

    // Calculate pre-tax deductions (existing deductions)
    let totalPreTaxDeductions = 0;
    preTaxDeductions.forEach((deduction) => {
      if (deduction.isPercentage) {
        totalPreTaxDeductions += (grossPay * deduction.amount) / 100;
      } else {
        totalPreTaxDeductions += deduction.amount;
      }
    });

    // Add pre-tax benefits deducted from paycheck
    (benefits || []).forEach((benefit) => {
      if ((benefit.deductionSource || 'paycheck') === 'paycheck' && !benefit.isTaxable) { // Pre-tax paycheck benefit
        if (benefit.isPercentage) {
          totalPreTaxDeductions += (grossPay * benefit.amount) / 100;
        } else {
          totalPreTaxDeductions += benefit.amount;
        }
      }
    });

    // Add employee retirement contributions (pre-tax or account-sourced)
    (retirement || []).forEach((election) => {
      if ((election.deductionSource || 'paycheck') === 'paycheck' && (election.isPreTax !== false)) {
        if (election.employeeContributionIsPercentage) {
          totalPreTaxDeductions += (grossPay * election.employeeContribution) / 100;
        } else {
          totalPreTaxDeductions += election.employeeContribution;
        }
      }
    });

    totalPreTaxDeductions = roundUpToCent(totalPreTaxDeductions);

    // Calculate taxable income
    const taxableIncome = roundUpToCent(grossPay - totalPreTaxDeductions);

    // Calculate taxes
    const federalTax = roundUpToCent((taxableIncome * taxSettings.federalTaxRate) / 100);
    const stateTax = roundUpToCent((taxableIncome * taxSettings.stateTaxRate) / 100);
    const socialSecurity = roundUpToCent((taxableIncome * taxSettings.socialSecurityRate) / 100);
    const medicare = roundUpToCent((taxableIncome * taxSettings.medicareRate) / 100);
    const additionalWithholding = roundUpToCent(taxSettings.additionalWithholding);

    const totalTaxes = roundUpToCent(federalTax + stateTax + socialSecurity + medicare + additionalWithholding);

    // Calculate net pay before post-tax deductions
    let netPayBeforePostTax = roundUpToCent(taxableIncome - totalTaxes);

    // Subtract post-tax benefits deducted from paycheck
    (benefits || []).forEach((benefit) => {
      if ((benefit.deductionSource || 'paycheck') === 'paycheck' && benefit.isTaxable) { // Post-tax paycheck benefit
        if (benefit.isPercentage) {
          netPayBeforePostTax -= roundUpToCent((grossPay * benefit.amount) / 100);
        } else {
          netPayBeforePostTax -= roundUpToCent(benefit.amount);
        }
      }
    });

    // Subtract post-tax retirement contributions deducted from paycheck
    (retirement || []).forEach((election) => {
      if ((election.deductionSource || 'paycheck') === 'paycheck' && election.isPreTax === false) { // Post-tax paycheck retirement
        if (election.employeeContributionIsPercentage) {
          netPayBeforePostTax -= roundUpToCent((grossPay * election.employeeContribution) / 100);
        } else {
          netPayBeforePostTax -= roundUpToCent(election.employeeContribution);
        }
      }
    });

    // Note: Employer match is not deducted from net pay, it's added to the employee's retirement account
    // So we don't subtract it here - it's handled separately
    const netPay = roundUpToCent(Math.max(0, netPayBeforePostTax));

    return {
      grossPay,
      preTaxDeductions: totalPreTaxDeductions,
      taxableIncome,
      federalTax,
      stateTax,
      socialSecurity,
      medicare,
      additionalWithholding,
      totalTaxes,
      netPay,
    };
  }, [budgetData]);

  /**
   * Calculate retirement contribution amounts for display
   * Returns estimated employee and employer contributions per paycheck
   */
  const calculateRetirementContributions = useCallback((election: RetirementElection) => {
    if (!budgetData) {
      return { employeeAmount: 0, employerAmount: 0 };
    }

    const { paySettings } = budgetData;
    
    // Calculate gross pay per paycheck
    let grossPay = 0;
    if (paySettings.payType === 'salary' && paySettings.annualSalary) {
      const paychecksPerYear = getPaychecksPerYear(paySettings.payFrequency);
      grossPay = roundUpToCent(paySettings.annualSalary / paychecksPerYear);
    } else if (paySettings.payType === 'hourly' && paySettings.hourlyRate && paySettings.hoursPerPayPeriod) {
      grossPay = roundUpToCent(paySettings.hourlyRate * paySettings.hoursPerPayPeriod);
    }

    // If no pay settings configured yet, return zeros
    if (grossPay === 0) {
      return { employeeAmount: 0, employerAmount: 0 };
    }

    // Calculate employee contribution
    let employeeAmount = 0;
    if (election.employeeContributionIsPercentage) {
      employeeAmount = roundUpToCent((grossPay * election.employeeContribution) / 100);
    } else {
      employeeAmount = roundUpToCent(election.employeeContribution);
    }

    // Calculate employer match (if enabled)
    let employerAmount = 0;
    if (election.hasEmployerMatch) {
      // Convert employee contribution to percentage of gross for comparison
      const employeePercentage = election.employeeContributionIsPercentage
        ? election.employeeContribution
        : (employeeAmount / grossPay) * 100;

      if (election.employerMatchCapIsPercentage) {
        // Cap is a percentage - employer matches up to that percentage
        const matchPercentage = Math.min(employeePercentage, election.employerMatchCap);
        employerAmount = roundUpToCent((grossPay * matchPercentage) / 100);
      } else {
        // Cap is a dollar amount - employer matches up to that amount
        employerAmount = Math.min(employeeAmount, roundUpToCent(election.employerMatchCap));
      }
    }

    return { employeeAmount, employerAmount };
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
      alert('Failed to select save location: ' + (error as Error).message);
    }
  }, [budgetData]);

  // Bundle all our state and functions into a single object
  // This is what gets provided to all child components
  const value: BudgetContextType = {
    budgetData,
    loading,
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
    addRetirementElection,
    updateRetirementElection,
    deleteRetirementElection,
    calculatePaycheckBreakdown,
    calculateRetirementContributions,
    addLoan,
    updateLoan,
    deleteLoan,
  };

  // Provide the value to all children components
  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
};
