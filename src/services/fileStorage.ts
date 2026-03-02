// Service for handling local file storage and encryption
// This class manages reading/writing budget files and encrypting/decrypting the data
import CryptoJS from 'crypto-js';
import type { BudgetData, AppSettings } from '../types/auth';
import { AccountsService } from './accountsService';
import { KeychainService } from './keychainService';

// LocalStorage key for app settings
const SETTINGS_KEY = 'paycheck-planner-settings';
const RECENT_FILES_KEY = 'paycheck-planner-recent-files';
const FILE_TO_PLAN_MAPPING_KEY = 'paycheck-planner-file-to-plan-mapping';
const MAX_RECENT_FILES = 10;

export interface RecentFile {
  filePath: string;
  fileName: string;
  lastOpened: string;
}

export class FileStorageService {
  /**
   * Get app settings from localStorage
   * @returns App settings or undefined if not yet configured
   */
  static getAppSettings(): AppSettings {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      try {
        const settings = JSON.parse(stored);
        // Remove encryptionKey from settings - it's now stored in keychain
        delete (settings as any).encryptionKey;
        return settings;
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
   * Note: Encryption keys are NOT stored here - they're in the system keychain
   * @param settings - Settings to save
   */
  static saveAppSettings(settings: AppSettings): void {
    // Remove encryptionKey if it exists - we don't store keys in localStorage
    const settingsToStore = { ...settings };
    delete (settingsToStore as any).encryptionKey;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsToStore));
  }

  /**
   * Get recent files list from localStorage
   * @returns Array of recent files, sorted by most recently opened
   */
  static getRecentFiles(): RecentFile[] {
    const stored = localStorage.getItem(RECENT_FILES_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * Add a file to the recent files list
   * @param filePath - The file path to add
   */
  static addRecentFile(filePath: string): void {
    // Extract file name from path
    const fileName = filePath.split(/[\\/]/).pop() || filePath;
    
    const recentFiles = this.getRecentFiles();
    
    // Remove any existing entry for this file
    const filtered = recentFiles.filter(f => f.filePath !== filePath);
    
    // Add to the beginning of the list
    filtered.unshift({
      filePath,
      fileName,
      lastOpened: new Date().toISOString(),
    });
    
    // Keep only the most recent MAX_RECENT_FILES
    const trimmed = filtered.slice(0, MAX_RECENT_FILES);
    
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(trimmed));
  }

  /**
   * Remove a file from the recent files list
   * @param filePath - The file path to remove
   */
  static removeRecentFile(filePath: string): void {
    const recentFiles = this.getRecentFiles();
    const filtered = recentFiles.filter(f => f.filePath !== filePath);
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(filtered));
  }

  /**
   * Clear all recent files
   */
  static clearRecentFiles(): void {
    localStorage.removeItem(RECENT_FILES_KEY);
  }

  /**
   * Save the mapping of file path to plan ID
   * This is used to retrieve encryption keys from keychain when loading
   * @param filePath - The file path
   * @param planId - The plan ID
   */
  private static savePlanFileMapping(filePath: string, planId: string): void {
    try {
      const mapping = this.getPlanFileMappings();
      mapping[filePath] = planId;
      localStorage.setItem(FILE_TO_PLAN_MAPPING_KEY, JSON.stringify(mapping));
    } catch {
      // If this fails, it's not critical - worst case the key lookup will fail
    }
  }

  /**
   * Get all file path to plan ID mappings
   * @returns Object mapping file paths to plan IDs
   */
  private static getPlanFileMappings(): Record<string, string> {
    try {
      const stored = localStorage.getItem(FILE_TO_PLAN_MAPPING_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // If parsing fails, return empty object
    }
    return {};
  }

  /**
   * Get the plan ID for a file path
   * @param filePath - The file path
   * @returns The plan ID or null if not found
   */
  private static getPlanIdForFile(filePath: string): string | null {
    const mapping = this.getPlanFileMappings();
    return mapping[filePath] || null;
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
   * Keys are stored in the system keychain, not in the file
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

    // Create a copy of budget data without the encryption key (we store it in keychain)
    const budgetDataToSave = {
      ...budgetData,
      settings: {
        ...budgetData.settings,
        // Remove encryptionKey from the saved data - it goes in keychain instead
        encryptionKey: undefined,
      },
    };

    // Convert the budget object to JSON string (serialization)
    const jsonData = JSON.stringify(budgetDataToSave, null, 2);
    
    // Check if encryption is enabled
    let dataToSave = jsonData;
    if (budgetData.settings.encryptionEnabled) {
      // Get the encryption key - it should be in the keychain or in the current budget data
      let encryptionKey = budgetData.settings.encryptionKey;
      
      if (!encryptionKey) {
        // Try to get from keychain
        encryptionKey = await KeychainService.getKey(budgetData.id);
      }
      
      if (!encryptionKey) {
        throw new Error('Encryption is enabled but no encryption key is available');
      }
      
      // Save the key to keychain for future loads
      await KeychainService.saveKey(budgetData.id, encryptionKey);
      
      // Encrypt the JSON data for security
      dataToSave = this.encrypt(jsonData, encryptionKey);
    }

    // Send to Electron's main process to actually write the file
    const result = await window.electronAPI.saveBudget(targetPath, dataToSave);

    if (!result.success) {
      throw new Error(result.error || 'Failed to save budget');
    }

    // Add to recent files
    this.addRecentFile(targetPath);

    return targetPath;
  }

  /**
   * Load budget data from a file
   * Handles optional decryption and deserialization
   * Encryption keys are retrieved from the system keychain
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
      // Save the file-to-plan mapping for future reference
      this.savePlanFileMapping(targetPath, budgetData.id);
      // Add to recent files on successful load
      this.addRecentFile(targetPath);
      return budgetData;
    } catch {
      // If JSON parsing fails, it's likely encrypted
      // Try to decrypt with the key from keychain
      
      // First, try to get the plan ID from our file mapping
      let planId = this.getPlanIdForFile(targetPath);
      let encryptionKey: string | null = null;
      
      if (planId) {
        // Try to get the key from keychain using the plan ID
        try {
          encryptionKey = await KeychainService.getKey(planId);
        } catch {
          // Key lookup failed, will try alternatives below
        }
      }
      
      // If we don't have a key yet, we need to ask the user or get the key some other way
      if (!encryptionKey) {
        throw new Error(
          'This file appears to be encrypted but no encryption key was found. ' +
          'Please ensure the encryption key for this plan is set up correctly in the keychain, ' +
          'or provide the encryption key manually.'
        );
      }

      try {
        // Decrypt the file contents
        const decryptedData = this.decrypt(jsonData, encryptionKey);
        
        // Parse JSON back into a JavaScript object (deserialization)
        const budgetData: BudgetData = JSON.parse(decryptedData);
        
        // Save the file-to-plan mapping for future reference
        this.savePlanFileMapping(targetPath, budgetData.id);
        
        // Ensure the key is stored in keychain with the correct plan ID
        await KeychainService.saveKey(budgetData.id, encryptionKey);
        
        // Add to recent files on successful load
        this.addRecentFile(targetPath);
        
        return budgetData;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to decrypt file: ${errorMsg}. The encryption key may be incorrect.`);
      }
    }
  }

  /**
   * Create a new empty budget plan with default values
   * Note: Encryption keys are managed in the system keychain, not here
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
        // encryptionKey is NOT stored here - it's managed in the system keychain
        encryptionKey: undefined,
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
