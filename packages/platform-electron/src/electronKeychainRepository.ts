import type { SecureKeyRepository } from '@paycheck-planner/storage';
import { StorageError, toStorageError } from '@paycheck-planner/storage';

export interface ElectronKeychainBridge {
  saveKeychainKey(service: string, account: string, key: string): Promise<{ success: boolean; error?: string }>;
  getKeychainKey(service: string, account: string): Promise<{ success: boolean; key?: string; error?: string }>;
  deleteKeychainKey(service: string, account: string): Promise<{ success: boolean; error?: string }>;
}

export interface ElectronKeychainRepositoryOptions {
  serviceName: string;
  accountPrefix: string;
  bridge: ElectronKeychainBridge;
  keyFactory?: () => string;
}

function defaultKeyFactory(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export class ElectronKeychainRepository implements SecureKeyRepository {
  private readonly serviceName: string;
  private readonly accountPrefix: string;
  private readonly bridge: ElectronKeychainBridge;
  private readonly keyFactory: () => string;

  constructor(options: ElectronKeychainRepositoryOptions) {
    this.serviceName = options.serviceName;
    this.accountPrefix = options.accountPrefix;
    this.bridge = options.bridge;
    this.keyFactory = options.keyFactory ?? defaultKeyFactory;
  }

  private account(planId: string): string {
    return `${this.accountPrefix}:${planId}`;
  }

  async saveKey(planId: string, key: string): Promise<void> {
    try {
      const result = await this.bridge.saveKeychainKey(this.serviceName, this.account(planId), key);
      if (!result.success) {
        throw new StorageError('UNKNOWN', result.error || 'Failed to save encryption key to keychain');
      }
    } catch (error) {
      throw toStorageError(error, 'Failed to save encryption key to keychain');
    }
  }

  async getKey(planId: string): Promise<string | null> {
    try {
      const result = await this.bridge.getKeychainKey(this.serviceName, this.account(planId));
      if (!result.success) {
        throw new StorageError('UNKNOWN', result.error || 'Failed to retrieve encryption key from keychain');
      }

      return result.key || null;
    } catch (error) {
      throw toStorageError(error, 'Failed to retrieve encryption key from keychain');
    }
  }

  async deleteKey(planId: string): Promise<void> {
    try {
      const result = await this.bridge.deleteKeychainKey(this.serviceName, this.account(planId));
      if (!result.success) {
        throw new StorageError('UNKNOWN', result.error || 'Failed to delete encryption key from keychain');
      }
    } catch (error) {
      throw toStorageError(error, 'Failed to delete encryption key from keychain');
    }
  }

  async keyExists(planId: string): Promise<boolean> {
    try {
      const key = await this.getKey(planId);
      return key !== null;
    } catch {
      return false;
    }
  }

  async getOrCreateKey(planId: string): Promise<string> {
    const existing = await this.getKey(planId);
    if (existing) {
      return existing;
    }

    const nextKey = this.keyFactory();
    await this.saveKey(planId, nextKey);
    return nextKey;
  }
}
