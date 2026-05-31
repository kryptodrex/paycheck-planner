// Service for managing encryption keys securely using system keychain
// Keys are stored in the OS keychain (Keychain on macOS, Credential Manager on Windows, etc.)
// This is much more secure than storing keys in localStorage

import { StorageError } from '@paycheck-planner/storage';
import { resolveStorageComposition } from './storageComposition';

const ACCOUNT_NAME = 'encryption-key';

export class KeychainService {
  private static getRepository() {
    return resolveStorageComposition().keychain;
  }

  private static toUserFacingError(error: unknown, fallbackMessage: string): Error {
    if (error instanceof StorageError) {
      return new Error(error.message || fallbackMessage);
    }

    if (error instanceof Error) {
      return new Error(error.message || fallbackMessage);
    }

    return new Error(fallbackMessage);
  }

  /**
   * Save an encryption key to the system keychain
   * @param planId - The ID of the plan to associate with this key
   * @param key - The encryption key to save
   * @returns Promise that resolves when key is saved
   */
  static async saveKey(planId: string, key: string): Promise<void> {
    const account = `${ACCOUNT_NAME}:${planId}`;
    if (import.meta.env.DEV) console.debug(`[KeychainService] Saving key for account: ${account}`);

    try {
      await this.getRepository().saveKey(planId, key);
    } catch (error) {
      throw this.toUserFacingError(error, 'Failed to save encryption key to keychain');
    }

    if (import.meta.env.DEV) console.debug(`[KeychainService] Successfully saved key for account: ${account}`);
  }

  /**
   * Retrieve an encryption key from the system keychain
   * @param planId - The ID of the plan to retrieve the key for
   * @returns The encryption key, or null if not found
   */
  static async getKey(planId: string): Promise<string | null> {
    const account = `${ACCOUNT_NAME}:${planId}`;

    try {
      return await this.getRepository().getKey(planId);
    } catch (error) {
      const normalized = this.toUserFacingError(error, 'Failed to retrieve encryption key from keychain');
      const errorMsg = normalized.message;
      console.error(`[KeychainService] Get failed for ${account}: ${errorMsg}`);
      throw normalized;
    }
  }

  /**
   * Delete an encryption key from the system keychain
   * @param planId - The ID of the plan to delete the key for
   * @returns Promise that resolves when key is deleted
   */
  static async deleteKey(planId: string): Promise<void> {
    try {
      await this.getRepository().deleteKey(planId);
    } catch (error) {
      throw this.toUserFacingError(error, 'Failed to delete encryption key from keychain');
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
    return this.getRepository().getOrCreateKey(planId);
  }
}
