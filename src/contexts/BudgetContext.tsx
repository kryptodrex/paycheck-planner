// Budget Context - Manages all budget data and operations
// This is like a "global state" that any component can access
// In JavaScript, you'd use prop drilling or Redux - Context is React's built-in solution
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { BudgetData, BudgetContextType, Category, Transaction } from '../types/auth';
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
   * Create a new empty budget
   * @param name - The name for the new budget
   */
  const createNewBudget = useCallback((name: string) => {
    const newBudget = FileStorageService.createEmptyBudget(name);
    setBudgetData(newBudget);
  }, []);

  /**
   * Add a new category to the budget
   * @param category - Category data without the ID (we generate that)
   */
  const addCategory = useCallback((category: Omit<Category, 'id'>) => {
    setBudgetData((prev) => {
      // If no budget exists, don't do anything
      if (!prev) return prev;
      
      return {
        ...prev, // Keep all existing data
        categories: [
          ...prev.categories, // Keep all existing categories
          {
            ...category, // Add the new category
            id: crypto.randomUUID(), // Generate a unique ID
          },
        ],
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Update an existing category
   * @param id - The ID of the category to update
   * @param category - Partial category data (only the fields to update)
   */
  const updateCategory = useCallback((id: string, category: Partial<Category>) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      
      return {
        ...prev,
        // Map through categories and update the matching one
        categories: prev.categories.map((cat) =>
          cat.id === id ? { ...cat, ...category } : cat
        ),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Delete a category
   * @param id - The ID of the category to delete
   */
  const deleteCategory = useCallback((id: string) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      
      return {
        ...prev,
        // Filter out the category with this ID
        categories: prev.categories.filter((cat) => cat.id !== id),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Add a new transaction
   * @param transaction - Transaction data without the ID
   */
  const addTransaction = useCallback((transaction: Omit<Transaction, 'id'>) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      
      return {
        ...prev,
        transactions: [
          ...prev.transactions,
          {
            ...transaction,
            id: crypto.randomUUID(),
          },
        ],
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Update an existing transaction
   * @param id - The ID of the transaction to update
   * @param transaction - Partial transaction data (only fields to update)
   */
  const updateTransaction = useCallback((id: string, transaction: Partial<Transaction>) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      
      return {
        ...prev,
        transactions: prev.transactions.map((trans) =>
          trans.id === id ? { ...trans, ...transaction } : trans
        ),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  /**
   * Delete a transaction
   * @param id - The ID of the transaction to delete
   */
  const deleteTransaction = useCallback((id: string) => {
    setBudgetData((prev) => {
      if (!prev) return prev;
      
      return {
        ...prev,
        transactions: prev.transactions.filter((trans) => trans.id !== id),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

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
    addCategory,
    updateCategory,
    deleteCategory,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    selectSaveLocation,
  };

  // Provide the value to all children components
  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
};
