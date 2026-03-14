// Service for managing app-wide accounts that can be reused across plans
// Accounts are stored in localStorage and persist across sessions
import { STORAGE_KEYS } from '../constants/storage';
import type { Account } from '../types/accounts';
import { getDefaultAccountColor, getDefaultAccountIcon } from '../utils/accountDefaults';

// Helper function to generate color based on account type

export class AccountsService {
  /**
   * Get all global accounts from localStorage
   * @returns Array of accounts or default accounts if none exist
   */
  static getAccounts(): Account[] {
    const stored = localStorage.getItem(STORAGE_KEYS.accounts);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        const defaultAccounts = this.getDefaultAccounts();
        this.saveAccounts(defaultAccounts);
        return defaultAccounts;
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
        color: getDefaultAccountColor('investment'),
        icon: getDefaultAccountIcon('investment'),
      },
      {
        id: crypto.randomUUID(),
        name: 'Savings',
        type: 'savings' as const,
        color: getDefaultAccountColor('savings'),
        icon: getDefaultAccountIcon('savings'),
      },
      {
        id: crypto.randomUUID(),
        name: 'Checking',
        type: 'checking' as const,
        color: getDefaultAccountColor('checking'),
        icon: getDefaultAccountIcon('checking'),
      },
    ];
  }

  /**
   * Save accounts to localStorage
   * @param accounts - Array of accounts to save
   */
  static saveAccounts(accounts: Account[]): void {
    localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(accounts));
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
      color: getDefaultAccountColor(type),
      icon: getDefaultAccountIcon(type),
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
    // Return copies
    return globalAccounts.map(acc => ({ ...acc }));
  }
}
