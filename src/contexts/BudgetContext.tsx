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
  PaycheckBreakdown
} from '../types/auth';
import { FileStorageService } from '../services/fileStorage';
import { KeychainService } from '../services/keychainService';
import { roundUpToCent } from '../utils/money';

// Create the context - this is the "container" for our global state
// Initially undefined, we'll provide the actual value in the Provider
const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

/**
 * Custom hook to access budget data from any component
 * Usage: const { budgetData, saveBudget } = useBudget()
 * This is much cleaner than passing props down through many components
 */
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
   */
  const saveBudget = useCallback(async () => {
    if (!budgetData) return;

    setLoading(true);
    try {
      // Update the "last modified" timestamp
      const updatedBudget = {
        ...budgetData, // Spread operator: copy all existing properties
        updatedAt: new Date().toISOString(),
      };

      // Note: Each plan maintains its own encryptionEnabled setting (set during SetupWizard)
      // Encryption keys are stored in the system keychain, not in settings

      // Save to file and get back the file path
      const filePath = await FileStorageService.saveBudget(
        updatedBudget,
        budgetData.settings.filePath
      );

      // If user canceled the dialog, filePath will be null
      if (!filePath) {
        return;
      }

      // Update state with the new file path and settings
      const savedBudget = {
        ...updatedBudget,
        settings: {
          ...updatedBudget.settings,
          filePath,
        },
      };
      setBudgetData(savedBudget);
      
      // Mark as saved
      lastSavedDataRef.current = JSON.stringify(savedBudget);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving budget:', error);
      // Type assertion: tell TypeScript that error is an Error object
      alert('Failed to save budget: ' + (error as Error).message);
    } finally {
      // Always runs, even if there's an error
      setLoading(false);
    }
  }, [budgetData]); // Dependency: recreate this function if budgetData changes

  /**
   * Load a budget from disk
   * @param filePath - Optional path to load from (user will be prompted if not provided)
   */
  const loadBudget = useCallback(async (filePath?: string) => {
    setLoading(true);
    try {
      let data = await FileStorageService.loadBudget(filePath);
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
      
      // Migrate old retirement election format to new format
      data.retirement = data.retirement.map((election: any) => {
        const migrated: any = { ...election };
        
        // Migrate field names
        if ('employeeContributionAmount' in election) {
          migrated.employeeContribution = election.employeeContributionAmount;
          delete migrated.employeeContributionAmount;
        }
        
        // Add hasEmployerMatch if missing
        if (!('hasEmployerMatch' in migrated)) {
          // If there was an employerMatchAmount, assume employer match is enabled
          migrated.hasEmployerMatch = (election.employerMatchAmount && election.employerMatchAmount > 0) || false;
        }
        
        // Initialize employerMatchCap if missing
        if (!('employerMatchCap' in migrated)) {
          migrated.employerMatchCap = election.employerMatchCap || 0;
        }
        
        // Initialize employerMatchCapIsPercentage if missing
        if (!('employerMatchCapIsPercentage' in migrated)) {
          migrated.employerMatchCapIsPercentage = election.employerMatchCapIsPercentage || false;
        }
        
        // Remove old fields that are no longer used
        delete migrated.employerMatchAmount;
        delete migrated.employerMatchIsPercentage;
        
        return migrated;
      });
      
      setBudgetData(data);
      // Mark as saved (just loaded)
      lastSavedDataRef.current = JSON.stringify(data);
      setHasUnsavedChanges(false);
      
      // Notify main process that a budget is loaded (transitions welcome to plan window)
      if (window.electronAPI) {
        window.electronAPI.budgetLoaded();
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

    // Add pre-tax benefits
    (benefits || []).forEach((benefit) => {
      if (!benefit.isTaxable) { // Pre-tax benefit
        if (benefit.isPercentage) {
          totalPreTaxDeductions += (grossPay * benefit.amount) / 100;
        } else {
          totalPreTaxDeductions += benefit.amount;
        }
      }
    });

    // Add employee retirement contributions (pre-tax)
    (retirement || []).forEach((election) => {
      if (election.employeeContributionIsPercentage) {
        totalPreTaxDeductions += (grossPay * election.employeeContribution) / 100;
      } else {
        totalPreTaxDeductions += election.employeeContribution;
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

    // Subtract post-tax benefits
    (benefits || []).forEach((benefit) => {
      if (benefit.isTaxable) { // Post-tax benefit
        if (benefit.isPercentage) {
          netPayBeforePostTax -= roundUpToCent((grossPay * benefit.amount) / 100);
        } else {
          netPayBeforePostTax -= roundUpToCent(benefit.amount);
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
   * Helper function to get number of paychecks per year
   */
  const getPaychecksPerYear = (frequency: string): number => {
    switch (frequency) {
      case 'weekly': return 52;
      case 'bi-weekly': return 26;
      case 'semi-monthly': return 24;
      case 'monthly': return 12;
      default: return 26;
    }
  };

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
    loadBudget,
    createNewBudget,
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
  };

  // Provide the value to all children components
  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
};
