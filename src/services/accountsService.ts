// Service for managing app-wide accounts that can be reused across plans
// Accounts are stored in localStorage and persist across sessions
import type { Account } from '../types/auth';

// LocalStorage key for global accounts
const ACCOUNTS_KEY = 'paycheck-planner-accounts';

// Helper function to generate color based on account type
const getDefaultColorForType = (type: Account['type']): string => {
  switch (type) {
    case 'checking':
      return '#667eea'; // Purple
    case 'savings':
      return '#f093fb'; // Pink
    case 'investment':
      return '#4facfe'; // Blue
    case 'other':
      return '#43e97b'; // Green
    default:
      return '#667eea';
  }
};

export class AccountsService {
  /**
   * Get all global accounts from localStorage
   * @returns Array of accounts or default accounts if none exist
   */
  static getAccounts(): Account[] {
    const stored = localStorage.getItem(ACCOUNTS_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Error parsing stored accounts:', error);
        return this.getDefaultAccounts();
      }
    }
    // Return default accounts if none exist
    return this.getDefaultAccounts();
  }

  /**
   * Get default accounts for new users
   * @returns Array of default accounts
   */
  static getDefaultAccounts(): Account[] {
    return [
      {
        id: crypto.randomUUID(),
        name: 'Investment',
        type: 'investment' as const,
        allocation: 0,
        isRemainder: false,
        color: getDefaultColorForType('investment'),
      },
      {
        id: crypto.randomUUID(),
        name: 'Savings',
        type: 'savings' as const,
        allocation: 0,
        isRemainder: false,
        color: getDefaultColorForType('savings'),
      },
      {
        id: crypto.randomUUID(),
        name: 'Checking',
        type: 'checking' as const,
        allocation: 0,
        isRemainder: true,
        color: getDefaultColorForType('checking'),
      },
    ];
  }

  /**
   * Save accounts to localStorage
   * @param accounts - Array of accounts to save
   */
  static saveAccounts(accounts: Account[]): void {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  /**
   * Check if user has set up accounts
   * @returns true if accounts exist in localStorage
   */
  static hasAccounts(): boolean {
    return localStorage.getItem(ACCOUNTS_KEY) !== null;
  }

  /**
   * Add a new account
   * @param name - Account name
   * @param type - Account type
   * @returns The new account
   */
  static addAccount(name: string, type: Account['type']): Account {
    const accounts = this.getAccounts();
    const newAccount: Account = {
      id: crypto.randomUUID(),
      name: name.trim(),
      type,
      allocation: 0,
      isRemainder: false,
      color: getDefaultColorForType(type),
    };
    accounts.push(newAccount);
    this.saveAccounts(accounts);
    return newAccount;
  }

  /**
   * Update an existing account
   * @param id - Account ID
   * @param updates - Partial account data to update
   */
  static updateAccount(id: string, updates: Partial<Omit<Account, 'id'>>): void {
    const accounts = this.getAccounts();
    const index = accounts.findIndex(acc => acc.id === id);
    if (index !== -1) {
      accounts[index] = { ...accounts[index], ...updates };
      this.saveAccounts(accounts);
    }
  }

  /**
   * Delete an account
   * @param id - Account ID
   * @returns true if deleted, false if it was the last account
   */
  static deleteAccount(id: string): boolean {
    const accounts = this.getAccounts();
    if (accounts.length <= 1) {
      return false; // Don't allow deleting the last account
    }
    const filtered = accounts.filter(acc => acc.id !== id);
    this.saveAccounts(filtered);
    return true;
  }

  /**
   * Initialize accounts for a new plan (creates copies with allocation data)
   * @returns Array of accounts ready for a new plan
   */
  static getAccountsForNewPlan(): Account[] {
    const globalAccounts = this.getAccounts();
    // Return copies with reset allocations
    return globalAccounts.map(acc => ({
      ...acc,
      allocation: 0,
      // Keep isRemainder from global account
    }));
  }
}
