// TypeScript Type Definitions
// These are like "contracts" that describe the shape of our data
// They help catch bugs by ensuring we use data correctly throughout the app

/**
 * BudgetData - The main data structure for a budget file
 * This is what gets saved to disk (after encryption)
 */
export interface BudgetData {
  id: string;                    // Unique identifier for this budget
  name: string;                  // Display name (e.g., "2024 Budget")
  categories: Category[];        // Array of budget categories
  transactions: Transaction[];   // Array of all income/expenses
  settings: BudgetSettings;      // User preferences
  createdAt: string;            // ISO date string when created
  updatedAt: string;            // ISO date string when last modified
}

/**
 * Category - A budget category (e.g., "Groceries", "Entertainment")
 */
export interface Category {
  id: string;          // Unique identifier
  name: string;        // Category name
  budget: number;      // Monthly budget amount in dollars
  color: string;       // Hex color code for UI display (e.g., "#FF5733")
  icon?: string;       // Optional emoji or icon (? means optional property)
}

/**
 * Transaction - A single income or expense entry
 */
export interface Transaction {
  id: string;              // Unique identifier
  categoryId: string;      // Which category this belongs to
  amount: number;          // Dollar amount
  description: string;     // What was this for?
  date: string;           // ISO date string when it occurred
  type: 'income' | 'expense';  // Union type: can only be one of these two strings
}

/**
 * BudgetSettings - User preferences and app configuration
 */
export interface BudgetSettings {
  currency: string;                  // Currency code (e.g., "USD", "EUR")
  locale: string;                    // Locale for formatting (e.g., "en-US")
  filePath?: string;                 // Where the budget is saved (optional, may not be set yet)
  encryptionEnabled?: boolean;       // Whether to encrypt budget files (undefined = not set)
  encryptionKey?: string;            // User's encryption key (only if encryption enabled)
}

/**
 * AppSettings - Global app settings stored in localStorage
 */
export interface AppSettings {
  encryptionEnabled?: boolean;  // Global preference for encryption (undefined = not set up yet)
  encryptionKey?: string;       // User's master encryption key
  lastOpenedFile?: string;      // Path to last opened budget file
}

/**
 * BudgetContextType - Describes what the budget context provides
 * This interface defines all the state and functions available via useBudget() hook
 */
export interface BudgetContextType {
  budgetData: BudgetData | null;  // Current budget data (null if none loaded)
  loading: boolean;               // Whether an operation is in progress
  
  // File operations
  saveBudget: () => Promise<void>;                      // Save to disk
  loadBudget: (filePath?: string) => Promise<void>;     // Load from disk
  createNewBudget: (name: string) => void;              // Create empty budget
  selectSaveLocation: () => Promise<void>;              // Choose where to save
  
  // Category operations
  addCategory: (category: Omit<Category, 'id'>) => void;              // Add category (Omit means "Category without id field")
  updateCategory: (id: string, category: Partial<Category>) => void;  // Update category (Partial means "some fields of Category")
  deleteCategory: (id: string) => void;                               // Delete category
  
  // Transaction operations
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
}
