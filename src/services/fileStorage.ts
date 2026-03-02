// Service for handling local file storage and encryption
// This class manages reading/writing budget files and encrypting/decrypting the data
import CryptoJS from 'crypto-js';
import type { BudgetData, AppSettings } from '../types/auth';
import { AccountsService } from './accountsService';

// LocalStorage key for app settings
const SETTINGS_KEY = 'paycheck-planner-settings';

export class FileStorageService {
  /**
   * Get app settings from localStorage
   * @returns App settings or undefined if not yet configured
   */
  static getAppSettings(): AppSettings {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // If parsing fails, return undefined to force setup
      }
    }
    // Return with encryptionEnabled undefined to indicate setup not completed
    return {
      encryptionEnabled: undefined,
    };
  }

  /**
   * Save app settings to localStorage
   * @param settings - Settings to save
   */
  static saveAppSettings(settings: AppSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  /**
   * Generate a random encryption key
   * @returns A secure random key as a hex string
   */
  static generateEncryptionKey(): string {
    // Generate 32 random bytes and convert to hex
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Encrypt budget data before saving
   * Takes plain text and returns encrypted string
   * @param data - The plain text string to encrypt
   * @param key - The encryption key to use
   * @returns Encrypted string
   */
  static encrypt(data: string, key: string): string {
    return CryptoJS.AES.encrypt(data, key).toString();
  }

  /**
   * Decrypt budget data after loading
   * Takes encrypted string and returns plain text
   * @param encryptedData - The encrypted string to decrypt
   * @param key - The encryption key to use
   * @returns Decrypted plain text string
   */
  static decrypt(encryptedData: string, key: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Save budget data to a file
   * Handles serialization and optional encryption
   * @param budgetData - The budget data object to save
   * @param filePath - Optional path to save to (if not provided, user will be prompted)
   * @returns The file path where the data was saved
   */
  static async saveBudget(budgetData: BudgetData, filePath?: string): Promise<string | null> {
    // Check if Electron API is available (we're running in Electron)
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    let targetPath = filePath;

    // If no file path provided, open save dialog for user to choose location
    if (!targetPath) {
      const selectedPath = await window.electronAPI.saveFileDialog();
      if (!selectedPath) {
        // User canceled - return null without error
        return null;
      }
      targetPath = selectedPath;
    }

    // Convert the budget object to JSON string (serialization)
    const jsonData = JSON.stringify(budgetData, null, 2);
    
    // Check if encryption is enabled
    let dataToSave = jsonData;
    if (budgetData.settings.encryptionEnabled && budgetData.settings.encryptionKey) {
      // Encrypt the JSON data for security
      dataToSave = this.encrypt(jsonData, budgetData.settings.encryptionKey);
    }

    // Send to Electron's main process to actually write the file
    const result = await window.electronAPI.saveBudget(targetPath, dataToSave);

    if (!result.success) {
      throw new Error(result.error || 'Failed to save budget');
    }

    return targetPath;
  }

  /**
   * Load budget data from a file
   * Handles optional decryption and deserialization
   * @param filePath - Optional path to load from (if not provided, user will be prompted)
   * @returns The loaded budget data object
   */
  static async loadBudget(filePath?: string): Promise<BudgetData | null> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    let targetPath = filePath;

    // If no file path provided, open file dialog for user to choose file
    if (!targetPath) {
      const selectedPath = await window.electronAPI.openFileDialog();
      if (!selectedPath) {
        // User canceled - return null without error
        return null;
      }
      targetPath = selectedPath;
    }

    // Request Electron's main process to read the file
    const result = await window.electronAPI.loadBudget(targetPath);

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to load budget');
    }

    let jsonData = result.data;
    
    // Try to parse as JSON first (unencrypted file)
    try {
      const budgetData: BudgetData = JSON.parse(jsonData);
      return budgetData;
    } catch {
      // If JSON parsing fails, it's likely encrypted
      // Try to decrypt with the user's key
      const settings = this.getAppSettings();
      
      if (!settings.encryptionKey) {
        throw new Error('This file is encrypted but no encryption key is set. Please set your encryption key in settings.');
      }

      try {
        // Decrypt the file contents
        const decryptedData = this.decrypt(jsonData, settings.encryptionKey);
        
        // Parse JSON back into a JavaScript object (deserialization)
        const budgetData: BudgetData = JSON.parse(decryptedData);
        return budgetData;
      } catch {
        throw new Error('Failed to decrypt file. The encryption key may be incorrect.');
      }
    }
  }

  /**
   * Create a new empty budget plan with default values
   * @param year - The year for the new plan
   * @param currency - The currency code (default: 'USD')
   * @returns A new budget data object
   */
  static createEmptyBudget(year: number, currency: string = 'USD'): BudgetData {
    // Get app settings to inherit encryption preferences  
    const appSettings = this.getAppSettings();
    
    return {
      id: crypto.randomUUID(), // Generate a unique ID
      name: `${year} Plan`,
      year,
      paySettings: {
        payType: 'salary',
        payFrequency: 'bi-weekly',
      },
      preTaxDeductions: [],
      taxSettings: {
        federalTaxRate: 0,
        stateTaxRate: 0,
        socialSecurityRate: 6.2,
        medicareRate: 1.45,
        additionalWithholding: 0,
      },
      accounts: AccountsService.getAccountsForNewPlan(), // Initialize from global accounts
      bills: [],
      settings: {
        currency,
        locale: 'en-US',
        encryptionEnabled: appSettings.encryptionEnabled ?? false, // Default to false if undefined
        encryptionKey: appSettings.encryptionKey,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Select a directory for saving budget files
   * Opens a folder picker dialog
   * @returns The selected directory path, or null if cancelled
   */
  static async selectDirectory(): Promise<string | null> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    return await window.electronAPI.selectDirectory();
  }
}
