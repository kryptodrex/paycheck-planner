// Service for managing encryption keys securely using system keychain
// Keys are stored in the OS keychain (Keychain on macOS, Credential Manager on Windows, etc.)
// This is much more secure than storing keys in localStorage

const SERVICE_NAME = 'Paycheck Planner';
const ACCOUNT_NAME = 'encryption-key';

export class KeychainService {
  /**
   * Save an encryption key to the system keychain
   * @param planId - The ID of the plan to associate with this key
   * @param key - The encryption key to save
   * @returns Promise that resolves when key is saved
   */
  static async saveKey(planId: string, key: string): Promise<void> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    const result = await window.electronAPI.saveKeychainKey(
      SERVICE_NAME,
      `${ACCOUNT_NAME}:${planId}`,
      key
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to save encryption key to keychain');
    }
  }

  /**
   * Retrieve an encryption key from the system keychain
   * @param planId - The ID of the plan to retrieve the key for
   * @returns The encryption key, or null if not found
   */
  static async getKey(planId: string): Promise<string | null> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    const result = await window.electronAPI.getKeychainKey(
      SERVICE_NAME,
      `${ACCOUNT_NAME}:${planId}`
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to retrieve encryption key from keychain');
    }

    return result.key || null;
  }

  /**
   * Delete an encryption key from the system keychain
   * @param planId - The ID of the plan to delete the key for
   * @returns Promise that resolves when key is deleted
   */
  static async deleteKey(planId: string): Promise<void> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    const result = await window.electronAPI.deleteKeychainKey(
      SERVICE_NAME,
      `${ACCOUNT_NAME}:${planId}`
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to delete encryption key from keychain');
    }
  }

  /**
   * Check if a key exists in the keychain
   * @param planId - The ID of the plan to check
   * @returns Boolean indicating if key exists
   */
  static async keyExists(planId: string): Promise<boolean> {
    try {
      const key = await this.getKey(planId);
      return key !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get or create a key for a plan
   * If key doesn't exist, creates one and saves it
   * @param planId - The ID of the plan
   * @returns The encryption key
   */
  static async getOrCreateKey(planId: string): Promise<string> {
    const existingKey = await this.getKey(planId);
    if (existingKey) {
      return existingKey;
    }

    // Generate a new key if one doesn't exist
    const newKey = this.generateEncryptionKey();
    await this.saveKey(planId, newKey);
    return newKey;
  }

  /**
   * Generate a random encryption key
   * @returns A secure random key as a hex string
   */
  private static generateEncryptionKey(): string {
    // Generate 32 random bytes and convert to hex
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
}
