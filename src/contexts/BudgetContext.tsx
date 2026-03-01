// Budget Context - Manages all paycheck planning data and operations
// This is like a "global state" that any component can access
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { 
  BudgetData, 
  BudgetContextType, 
  PaySettings,
  Deduction,
  TaxSettings,
  Account,
  Bill,
  PaycheckBreakdown
} from '../types/auth';
import { FileStorageService } from '../services/fileStorage';

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

      // Sync encryption settings from app settings (in case they changed)
      const appSettings = FileStorageService.getAppSettings();
      updatedBudget.settings.encryptionEnabled = appSettings.encryptionEnabled ?? false;
      updatedBudget.settings.encryptionKey = appSettings.encryptionKey;

      // Save to file and get back the file path
      const filePath = await FileStorageService.saveBudget(
        updatedBudget,
        budgetData.settings.filePath
      );

      // Update state with the new file path and settings
      setBudgetData({
        ...updatedBudget,
        settings: {
          ...updatedBudget.settings,
          filePath,
        },
      });
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
      const data = await FileStorageService.loadBudget(filePath);
      setBudgetData(data);
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
  }, []);

  /**
   * Copy the current plan to a new year
   * @param newYear - The target year
   */
  const copyPlanToNewYear = useCallback((newYear: number) => {
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
    
    setBudgetData(newBudget);
  }, [budgetData]);

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

    const { paySettings, preTaxDeductions, taxSettings } = budgetData;
    
    // Calculate gross pay per paycheck
    let grossPay = 0;
    if (paySettings.payType === 'salary' && paySettings.annualSalary) {
      const paychecksPerYear = getPaychecksPerYear(paySettings.payFrequency);
      grossPay = paySettings.annualSalary / paychecksPerYear;
    } else if (paySettings.payType === 'hourly' && paySettings.hourlyRate && paySettings.hoursPerPayPeriod) {
      grossPay = paySettings.hourlyRate * paySettings.hoursPerPayPeriod;
    }

    // Calculate pre-tax deductions
    let totalPreTaxDeductions = 0;
    preTaxDeductions.forEach((deduction) => {
      if (deduction.isPercentage) {
        totalPreTaxDeductions += (grossPay * deduction.amount) / 100;
      } else {
        totalPreTaxDeductions += deduction.amount;
      }
    });

    // Calculate taxable income
    const taxableIncome = grossPay - totalPreTaxDeductions;

    // Calculate taxes
    const federalTax = (taxableIncome * taxSettings.federalTaxRate) / 100;
    const stateTax = (taxableIncome * taxSettings.stateTaxRate) / 100;
    const socialSecurity = (taxableIncome * taxSettings.socialSecurityRate) / 100;
    const medicare = (taxableIncome * taxSettings.medicareRate) / 100;
    const additionalWithholding = taxSettings.additionalWithholding;

    const totalTaxes = federalTax + stateTax + socialSecurity + medicare + additionalWithholding;

    // Calculate net pay
    const netPay = taxableIncome - totalTaxes;

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
    copyPlanToNewYear,
    selectSaveLocation,
    updatePaySettings,
    addDeduction,
    updateDeduction,
    deleteDeduction,
    updateTaxSettings,
    addAccount,
    updateAccount,
    deleteAccount,
    addBill,
    updateBill,
    deleteBill,
    calculatePaycheckBreakdown,
  };

  // Provide the value to all children components
  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
};
