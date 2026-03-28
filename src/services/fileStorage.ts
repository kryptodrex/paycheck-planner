// Service for handling local file storage and encryption
// This class manages reading/writing budget files and encrypting/decrypting the data
import CryptoJS from 'crypto-js';
import { DEFAULT_APPEARANCE_PRESET } from '../constants/appearancePresets';
import {
  APP_STORAGE_KEYS,
  APP_STORAGE_PREFIX,
  BACKUP_EXCLUDED_STORAGE_KEYS,
  MAX_RECENT_FILES,
  SETTINGS_PLAN_SPECIFIC_FIELDS,
  STORAGE_KEYS,
} from '../constants/storage';
import type { BudgetData } from '../types/budget';
import type { AppSettings } from '../types/settings';
import type {
  OtherIncome,
  OtherIncomeAmountMode,
  OtherIncomePayTreatment,
  OtherIncomeTimingMode,
  OtherIncomeType,
  OtherIncomeWithholdingMode,
} from '../types/payroll';
import { KeychainService } from './keychainService';
import { getBaseFileName, getPlanNameFromPath } from '../utils/filePath';
import {
  normalizeAppearanceMode,
  normalizeAppearancePreset,
  normalizeColorVisionMode,
  normalizeCustomAppearance,
  normalizeFontScale,
  normalizeHighContrastMode,
  normalizeStateCueMode,
  normalizeThemeMode,
} from '../utils/appearanceSettings';
import { getDefaultAccountColor, getDefaultAccountIcon } from '../utils/accountDefaults';

const VALID_OTHER_INCOME_TYPES = [
  'bonus',
  'commission',
  'personal-business',
  'rental-income',
  'retirement-withdrawal',
  'disability',
  'reimbursement',
  'investment-income',
  'other',
 ] as const satisfies readonly OtherIncomeType[];

const VALID_OTHER_INCOME_AMOUNT_MODES = ['fixed', 'percent-of-gross'] as const satisfies readonly OtherIncomeAmountMode[];
const VALID_OTHER_INCOME_FREQUENCIES = ['weekly', 'bi-weekly', 'semi-monthly', 'monthly', 'quarterly', 'yearly'] as const;
const VALID_OTHER_INCOME_PAY_TREATMENTS = ['gross', 'taxable', 'net'] as const satisfies readonly OtherIncomePayTreatment[];
const VALID_OTHER_INCOME_WITHHOLDING_MODES = ['manual', 'auto', 'none'] as const satisfies readonly OtherIncomeWithholdingMode[];
const VALID_OTHER_INCOME_TIMING_MODES = ['average', 'payout'] as const satisfies readonly OtherIncomeTimingMode[];

function isOtherIncomeType(value: string): value is OtherIncomeType {
  return VALID_OTHER_INCOME_TYPES.includes(value as OtherIncomeType);
}

function isOtherIncomeAmountMode(value: string): value is OtherIncomeAmountMode {
  return VALID_OTHER_INCOME_AMOUNT_MODES.includes(value as OtherIncomeAmountMode);
}

function isOtherIncomeFrequency(value: string): value is OtherIncome['frequency'] {
  return VALID_OTHER_INCOME_FREQUENCIES.includes(value as OtherIncome['frequency']);
}

function isOtherIncomePayTreatment(value: string): value is OtherIncomePayTreatment {
  return VALID_OTHER_INCOME_PAY_TREATMENTS.includes(value as OtherIncomePayTreatment);
}

function isOtherIncomeWithholdingMode(value: string): value is OtherIncomeWithholdingMode {
  return VALID_OTHER_INCOME_WITHHOLDING_MODES.includes(value as OtherIncomeWithholdingMode);
}

function isOtherIncomeTimingMode(value: string): value is OtherIncomeTimingMode {
  return VALID_OTHER_INCOME_TIMING_MODES.includes(value as OtherIncomeTimingMode);
}

function normalizeOtherIncomeEntry(entry: unknown): OtherIncome {
  const candidate = entry && typeof entry === 'object'
    ? entry as Record<string, unknown>
    : {};

  const normalizedActiveMonths = Array.isArray(candidate.activeMonths)
    ? [...new Set(candidate.activeMonths.filter((month): month is number => Number.isInteger(month) && month >= 1 && month <= 12))].sort((left, right) => left - right)
    : undefined;

  return {
    id: typeof candidate.id === 'string' && candidate.id.trim() !== '' ? candidate.id : crypto.randomUUID(),
    name: typeof candidate.name === 'string' && candidate.name.trim() !== '' ? candidate.name : 'Other Income',
    incomeType: typeof candidate.incomeType === 'string' && isOtherIncomeType(candidate.incomeType)
      ? candidate.incomeType
      : 'other',
    amountMode: typeof candidate.amountMode === 'string' && isOtherIncomeAmountMode(candidate.amountMode)
      ? candidate.amountMode
      : 'fixed',
    amount: typeof candidate.amount === 'number' && Number.isFinite(candidate.amount) && candidate.amount >= 0
      ? candidate.amount
      : 0,
    percentOfGross: typeof candidate.percentOfGross === 'number' && Number.isFinite(candidate.percentOfGross) && candidate.percentOfGross >= 0
      ? candidate.percentOfGross
      : undefined,
    frequency: typeof candidate.frequency === 'string' && isOtherIncomeFrequency(candidate.frequency)
      ? candidate.frequency
      : 'monthly',
    enabled: candidate.enabled !== false,
    notes: typeof candidate.notes === 'string' ? candidate.notes : '',
    isTaxable: candidate.isTaxable !== false,
    payTreatment: typeof candidate.payTreatment === 'string' && isOtherIncomePayTreatment(candidate.payTreatment)
      ? candidate.payTreatment
      : 'gross',
    withholdingMode: typeof candidate.withholdingMode === 'string' && isOtherIncomeWithholdingMode(candidate.withholdingMode)
      ? candidate.withholdingMode
      : 'manual',
    timingMode: typeof candidate.timingMode === 'string' && isOtherIncomeTimingMode(candidate.timingMode)
      ? candidate.timingMode
      : 'average',
    withholdingProfileId: typeof candidate.withholdingProfileId === 'string' && candidate.withholdingProfileId.trim() !== ''
      ? candidate.withholdingProfileId
      : undefined,
    activeMonths: normalizedActiveMonths && normalizedActiveMonths.length > 0 ? normalizedActiveMonths : undefined,
  };
}

const BACKUP_EXCLUDED_KEYS = new Set<string>(BACKUP_EXCLUDED_STORAGE_KEYS);

export interface RecentFile {
  filePath: string;
  fileName: string;
  lastOpened: string;
}

export type RelinkMovedBudgetFileResult =
  | { status: 'success'; filePath: string; planName: string }
  | { status: 'cancelled' }
  | { status: 'mismatch'; message: string }
  | { status: 'invalid'; message: string };

interface EncryptedBudgetEnvelopeV1 {
  format: 'paycheck-planner-encrypted-v1';
  planId: string;
  payload: string;
}

interface SettingsBackupEnvelopeV1 {
  appName: 'paycheck-planner';
  version: 1;
  data: Record<string, unknown>;
}

function isEncryptedBudgetEnvelopeV1(value: unknown): value is EncryptedBudgetEnvelopeV1 {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<EncryptedBudgetEnvelopeV1>;
  return (
    candidate.format === 'paycheck-planner-encrypted-v1' &&
    typeof candidate.planId === 'string' &&
    typeof candidate.payload === 'string'
  );
}

function isBudgetData(value: unknown): value is BudgetData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<BudgetData>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.year === 'number' &&
    typeof candidate.name === 'string' &&
    typeof candidate.paySettings === 'object' &&
    Array.isArray(candidate.accounts) &&
    Array.isArray(candidate.bills) &&
    typeof candidate.settings === 'object'
  );
}

function isSettingsBackupEnvelopeV1(value: unknown): value is SettingsBackupEnvelopeV1 {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SettingsBackupEnvelopeV1>;
  return (
    candidate.appName === 'paycheck-planner' &&
    candidate.version === 1 &&
    typeof candidate.data === 'object' &&
    candidate.data !== null
  );
}

function normalizeAppSettingsValue(
  value: AppSettings & { encryptionKey?: string }
): AppSettings & { encryptionKey?: string } {
  const normalized = { ...value };

  const normalizedThemeMode = normalizeThemeMode(normalized.themeMode);
  if (normalizedThemeMode) {
    normalized.themeMode = normalizedThemeMode;
  } else {
    Reflect.deleteProperty(normalized, 'themeMode');
  }

  normalized.appearanceMode = normalizeAppearanceMode(normalized.appearanceMode);
  normalized.appearancePreset = normalizeAppearancePreset(normalized.appearancePreset ?? DEFAULT_APPEARANCE_PRESET);
  normalized.customAppearance = normalizeCustomAppearance(normalized.customAppearance);
  normalized.highContrastMode = normalizeHighContrastMode(normalized.highContrastMode);
  normalized.colorVisionMode = normalizeColorVisionMode(normalized.colorVisionMode);
  normalized.stateCueMode = normalizeStateCueMode(normalized.stateCueMode);
  normalized.fontScale = normalizeFontScale(normalized.fontScale);

  return normalized;
}

/**
 * Migrate/upgrade budget data to ensure all required fields exist
 * This handles old budget files that may be missing newer fields
 */
function migrateBudgetData(budgetData: BudgetData): BudgetData {
  const migrated = { ...budgetData };

  if (!migrated.metadata) {
    migrated.metadata = { auditHistory: [] };
  } else if (!Array.isArray(migrated.metadata.auditHistory)) {
    migrated.metadata.auditHistory = [];
  }

  // Ensure taxSettings exists with default values
  if (!migrated.taxSettings) {
    migrated.taxSettings = {
      taxLines: [
        { id: crypto.randomUUID(), label: 'Federal Tax', rate: 0, amount: 0, calculationType: 'percentage' },
        { id: crypto.randomUUID(), label: 'State Tax', rate: 0, amount: 0, calculationType: 'percentage' },
        { id: crypto.randomUUID(), label: 'Social Security', rate: 6.2, amount: 0, calculationType: 'percentage' },
        { id: crypto.randomUUID(), label: 'Medicare', rate: 1.45, amount: 0, calculationType: 'percentage' },
      ],
      additionalWithholding: 0,
      filingStatus: 'single',
    };
  } else if ('federalTaxRate' in migrated.taxSettings) {
    // Migrate old fixed-field format to dynamic taxLines
    const old = migrated.taxSettings as unknown as {
      federalTaxRate?: number;
      stateTaxRate?: number;
      socialSecurityRate?: number;
      medicareRate?: number;
      additionalWithholding?: number;
    };
    migrated.taxSettings = {
      taxLines: [
        { id: crypto.randomUUID(), label: 'Federal Tax', rate: old.federalTaxRate ?? 0, amount: 0, calculationType: 'percentage' },
        { id: crypto.randomUUID(), label: 'State Tax', rate: old.stateTaxRate ?? 0, amount: 0, calculationType: 'percentage' },
        { id: crypto.randomUUID(), label: 'Social Security', rate: old.socialSecurityRate ?? 6.2, amount: 0, calculationType: 'percentage' },
        { id: crypto.randomUUID(), label: 'Medicare', rate: old.medicareRate ?? 1.45, amount: 0, calculationType: 'percentage' },
      ],
      additionalWithholding: old.additionalWithholding ?? 0,
      filingStatus: 'single',
    };
  } else {
    migrated.taxSettings = {
      ...migrated.taxSettings,
      filingStatus: migrated.taxSettings.filingStatus === 'married_filing_jointly' ? 'married_filing_jointly' : 'single',
      taxLines: (migrated.taxSettings.taxLines || []).map((line) => ({
        ...line,
        amount: typeof line.amount === 'number' ? line.amount : 0,
        calculationType: line.calculationType === 'fixed' ? 'fixed' : 'percentage',
      })),
    };
  }

  // Ensure benefits array exists
  if (!migrated.benefits) {
    migrated.benefits = [];
  }

  // Ensure otherIncome array exists
  if (!Array.isArray(migrated.otherIncome)) {
    migrated.otherIncome = [];
  } else {
    migrated.otherIncome = migrated.otherIncome.map((entry) => normalizeOtherIncomeEntry(entry));
  }

  // Ensure retirement array exists
  if (!migrated.retirement) {
    migrated.retirement = [];
  }

  // Ensure savingsContributions array exists
  if (!migrated.savingsContributions) {
    migrated.savingsContributions = [];
  }

  return migrated;
}

export class FileStorageService {
  private static derivePlanNameFromFilePath(filePath: string): string {
    return getPlanNameFromPath(filePath) || 'plan';
  }

  private static async inspectBudgetFile(
    filePath: string
  ): Promise<{ isBudgetFile: boolean; planId: string | null; invalidReason?: string }> {
    if (!window.electronAPI) {
      return { isBudgetFile: false, planId: null, invalidReason: 'Unable to read selected file.' };
    }

    const result = await window.electronAPI.loadBudget(filePath);
    if (!result.success || !result.data) {
      return { isBudgetFile: false, planId: null };
    }

    try {
      const parsed = JSON.parse(result.data) as unknown;

      if (isEncryptedBudgetEnvelopeV1(parsed)) {
        return { isBudgetFile: true, planId: parsed.planId };
      }

      if (isBudgetData(parsed)) {
        return { isBudgetFile: true, planId: parsed.id };
      }

      if (isSettingsBackupEnvelopeV1(parsed)) {
        return {
          isBudgetFile: false,
          planId: null,
          invalidReason: 'That file is an app settings export, not a plan file.',
        };
      }
    } catch {
      return { isBudgetFile: false, planId: null, invalidReason: 'The selected file is not a valid plan file.' };
    }

    return { isBudgetFile: false, planId: null, invalidReason: 'The selected file is not a valid plan file.' };
  }

  static getKnownPlanIdForFile(filePath: string): string | null {
    return this.getPlanIdForFile(filePath);
  }

  /**
   * Prompt the user to locate a moved budget file and relink metadata.
   * Returns a typed outcome so caller can provide custom UX.
   */
  static async relinkMovedBudgetFile(
    missingFilePath: string,
    expectedPlanId?: string
  ): Promise<RelinkMovedBudgetFileResult> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    const selectedPath = await window.electronAPI.openFileDialog();
    if (!selectedPath) {
      return { status: 'cancelled' };
    }

    const inspected = await this.inspectBudgetFile(selectedPath);
    if (!inspected.isBudgetFile || !inspected.planId) {
      return {
        status: 'invalid',
        message: inspected.invalidReason || 'The selected file is not a valid Paycheck Planner plan file.',
      };
    }

    if (expectedPlanId && inspected.planId !== expectedPlanId) {
      return {
        status: 'mismatch',
        message: 'That file belongs to a different plan. Please choose the moved file for this plan.',
      };
    }

    const planIdToPersist = expectedPlanId || inspected.planId;
    if (planIdToPersist) {
      this.savePlanFileMapping(selectedPath, planIdToPersist);
      this.addRecentFileForPlan(selectedPath, planIdToPersist);
    } else {
      this.addRecentFile(selectedPath);
    }

    this.removeRecentFile(missingFilePath);

    return {
      status: 'success',
      filePath: selectedPath,
      planName: this.derivePlanNameFromFilePath(selectedPath),
    };
  }

  /**
   * Get app settings from localStorage
   * @returns App settings or undefined if not yet configured
   */
  static getAppSettings(): AppSettings {
    const stored = localStorage.getItem(STORAGE_KEYS.settings);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as unknown;
        if (!parsed || typeof parsed !== 'object') {
          return {
            encryptionEnabled: undefined,
          };
        }

        const parsedSettings = parsed as AppSettings & { encryptionKey?: string };
        // Remove encryptionKey from settings - it's now stored in keychain
        const settingsWithoutKey = { ...parsedSettings };
        Reflect.deleteProperty(settingsWithoutKey, 'encryptionKey');
        return normalizeAppSettingsValue(settingsWithoutKey);
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
    const settingsToStore = normalizeAppSettingsValue({
      ...(settings as AppSettings & { encryptionKey?: string }),
    });
    Reflect.deleteProperty(settingsToStore, 'encryptionKey');
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settingsToStore));
  }

  /**
   * Get recent files list from localStorage
   * @returns Array of recent files, sorted by most recently opened
   */
  static getRecentFiles(): RecentFile[] {
    const stored = localStorage.getItem(STORAGE_KEYS.recentFiles);
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
    const fileName = getBaseFileName(filePath) || filePath;
    
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
    
    localStorage.setItem(STORAGE_KEYS.recentFiles, JSON.stringify(trimmed));
  }

  /**
   * Add/update a recent file while de-duplicating other entries that belong to the same plan.
   * This keeps recents correct when a plan file is renamed/moved externally.
   */
  static addRecentFileForPlan(filePath: string, planId?: string): void {
    const fileName = getBaseFileName(filePath) || filePath;
    const recentFiles = this.getRecentFiles();
    const mapping = this.getPlanFileMappings();

    const filtered = recentFiles.filter((entry) => {
      if (entry.filePath === filePath) return false;
      if (!planId) return true;
      return mapping[entry.filePath] !== planId;
    });

    filtered.unshift({
      filePath,
      fileName,
      lastOpened: new Date().toISOString(),
    });

    const trimmed = filtered.slice(0, MAX_RECENT_FILES);
    localStorage.setItem(STORAGE_KEYS.recentFiles, JSON.stringify(trimmed));
  }

  /**
   * Remove a file from the recent files list
   * @param filePath - The file path to remove
   */
  static removeRecentFile(filePath: string): void {
    const recentFiles = this.getRecentFiles();
    const filtered = recentFiles.filter(f => f.filePath !== filePath);
    localStorage.setItem(STORAGE_KEYS.recentFiles, JSON.stringify(filtered));
  }

  /**
   * Clear all recent files
   */
  static clearRecentFiles(): void {
    localStorage.removeItem(STORAGE_KEYS.recentFiles);
  }

  /**
   * Get all known plan IDs from file-to-plan mappings.
   * Useful for cleaning up keychain entries when resetting app memory.
   */
  static getKnownPlanIds(): string[] {
    const mapping = this.getPlanFileMappings();
    return Array.from(new Set(Object.values(mapping).filter(Boolean)));
  }

  /**
   * Remove all app-owned localStorage values.
   * This does not delete budget files on disk.
   */
  static clearAppMemory(): void {
    APP_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));

    // Also clear any additional future keys under the paycheck-planner prefix.
    if (typeof localStorage.key === 'function' && typeof localStorage.length === 'number') {
      const prefixedKeys: string[] = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key?.startsWith(APP_STORAGE_PREFIX)) {
          prefixedKeys.push(key);
        }
      }

      prefixedKeys.forEach((key) => localStorage.removeItem(key));
    }
  }

  /**
   * Collect all global app preferences into a portable JSON envelope.
   * Plan-specific data (accounts, encryption state) is intentionally excluded
   * because it is already stored inside each .budget file.
   */
  static exportAppData(): string {
    const data: Record<string, string> = {};

    // Build candidate set from known keys + any future prefixed keys, then
    // subtract plan-specific keys that must not be exported.
    const candidates = new Set<string>(APP_STORAGE_KEYS);
    if (typeof localStorage.key === 'function' && typeof localStorage.length === 'number') {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key?.startsWith(APP_STORAGE_PREFIX)) {
          candidates.add(key);
        }
      }
    }

    for (const key of candidates) {
      if (BACKUP_EXCLUDED_KEYS.has(key)) continue;

      let value = localStorage.getItem(key);
      if (value === null) continue;

      // Strip plan-specific fields from the settings blob
      if (key === STORAGE_KEYS.settings) {
        try {
          const parsed = JSON.parse(value) as Record<string, unknown>;
          for (const field of SETTINGS_PLAN_SPECIFIC_FIELDS) {
            delete parsed[field];
          }
          value = JSON.stringify(normalizeAppSettingsValue(parsed as AppSettings & { encryptionKey?: string }));
        } catch {
          // If parsing fails, skip this key entirely rather than export corrupt data
          continue;
        }
      }

      data[key] = value;
    }

    return JSON.stringify(
      {
        version: 1,
        appName: 'paycheck-planner',
        exportedAt: new Date().toISOString(),
        data,
      },
      null,
      2,
    );
  }

  /**
   * Restore app-owned localStorage keys from a JSON backup produced by exportAppData().
   * Returns the parsed data object so callers can refresh in-memory state.
   * Throws if the file is not a valid backup envelope.
   */
  static importAppData(rawJson: string): Record<string, string> {
    let envelope: unknown;
    try {
      envelope = JSON.parse(rawJson);
    } catch {
      throw new Error('The selected file is not valid JSON.');
    }

    if (
      !envelope ||
      typeof envelope !== 'object' ||
      (envelope as Record<string, unknown>)['appName'] !== 'paycheck-planner' ||
      (envelope as Record<string, unknown>)['version'] !== 1 ||
      typeof (envelope as Record<string, unknown>)['data'] !== 'object'
    ) {
      throw new Error(
        'The selected file is not a Paycheck Planner settings backup.',
      );
    }

    const rawData = (envelope as { data: Record<string, unknown> }).data;

    const restored: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawData)) {
      if (!key.startsWith(APP_STORAGE_PREFIX) || typeof value !== 'string') continue;
      // Never restore plan-specific keys even if present in an older backup file
      if (BACKUP_EXCLUDED_KEYS.has(key)) continue;

      let valueToStore = value;
      // Strip plan-specific fields from a restored settings blob
      if (key === STORAGE_KEYS.settings) {
        try {
          const parsed = JSON.parse(value) as Record<string, unknown>;
          for (const field of SETTINGS_PLAN_SPECIFIC_FIELDS) {
            delete parsed[field];
          }
          valueToStore = JSON.stringify(normalizeAppSettingsValue(parsed as AppSettings & { encryptionKey?: string }));
        } catch {
          continue;
        }
      }

      localStorage.setItem(key, valueToStore);
      restored[key] = valueToStore;
    }

    return restored;
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
      // Remove stale paths for this plan ID (e.g., file renamed/moved)
      for (const existingPath of Object.keys(mapping)) {
        if (mapping[existingPath] === planId && existingPath !== filePath) {
          delete mapping[existingPath];
        }
      }
      mapping[filePath] = planId;
      localStorage.setItem(STORAGE_KEYS.fileToPlanMapping, JSON.stringify(mapping));
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
      const stored = localStorage.getItem(STORAGE_KEYS.fileToPlanMapping);
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
   * Show an in-app encryption key prompt that works in Electron sandboxed renderers.
   */
  private static async requestEncryptionKeyInput(message: string): Promise<string | null> {
    // Prefer native prompt when available (e.g., browser dev/testing environments).
    if (typeof window.prompt === 'function') {
      try {
        const key = window.prompt(message);
        if (key === null) return null;
        const trimmed = key.trim();
        return trimmed ? trimmed : null;
      } catch {
        // Some Electron/sandboxed renderers expose prompt() but throw "not supported".
        // Fall through to custom dialog implementation below.
      }
    }

    if (!document?.body) {
      throw new Error('Encryption key input is unavailable in this environment.');
    }

    return new Promise<string | null>((resolve) => {
      const rootStyle = window.getComputedStyle(document.documentElement);
      const token = (name: string, fallback: string): string => {
        const value = rootStyle.getPropertyValue(name).trim();
        return value || fallback;
      };

      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.background = token('--overlay-backdrop', 'rgba(0, 0, 0, 0.45)');
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = '99999';

      const dialog = document.createElement('div');
      dialog.style.width = 'min(520px, calc(100vw - 32px))';
      dialog.style.background = token('--bg-primary', '#1f1f1f');
      dialog.style.color = token('--text-primary', '#f2f2f2');
      dialog.style.border = `1px solid ${token('--border-color', '#3a3a3a')}`;
      dialog.style.borderRadius = '12px';
      dialog.style.padding = '16px';
      dialog.style.boxShadow = token('--shadow-elevated-shell', '0 12px 28px rgba(0, 0, 0, 0.35)');
      dialog.style.fontFamily = 'system-ui, -apple-system, Segoe UI, sans-serif';

      const title = document.createElement('div');
      title.textContent = 'Enter Encryption Key';
      title.style.fontSize = '16px';
      title.style.fontWeight = '600';
      title.style.marginBottom = '8px';

      const body = document.createElement('div');
      body.textContent = message;
      body.style.fontSize = '13px';
      body.style.lineHeight = '1.4';
      body.style.color = token('--text-secondary', '#d1d5db');
      body.style.whiteSpace = 'pre-line';
      body.style.marginBottom = '12px';

      const input = document.createElement('input');
      input.type = 'password';
      input.autocomplete = 'off';
      input.style.width = '100%';
      input.style.boxSizing = 'border-box';
      input.style.padding = '10px 12px';
      input.style.borderRadius = '8px';
      input.style.border = `1px solid ${token('--border-color', '#4a4a4a')}`;
      input.style.background = token('--bg-secondary', '#111');
      input.style.color = token('--text-primary', '#fff');
      input.style.marginBottom = '14px';

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.justifyContent = 'flex-end';
      actions.style.gap = '8px';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.padding = '8px 12px';
      cancelBtn.style.borderRadius = '8px';
      cancelBtn.style.border = `1px solid ${token('--border-color', '#555')}`;
      cancelBtn.style.background = token('--bg-tertiary', '#2a2a2a');
      cancelBtn.style.color = token('--text-primary', '#fff');
      cancelBtn.style.cursor = 'pointer';

      const submitBtn = document.createElement('button');
      submitBtn.textContent = 'Continue';
      submitBtn.style.padding = '8px 12px';
      submitBtn.style.borderRadius = '8px';
      submitBtn.style.border = `1px solid ${token('--accent-hover', '#4e9bff')}`;
      submitBtn.style.background = token('--accent-primary', '#2b6fd8');
      submitBtn.style.color = token('--text-inverse', '#fff');
      submitBtn.style.cursor = 'pointer';

      const cleanup = (value: string | null) => {
        document.removeEventListener('keydown', onKeyDown, true);
        overlay.remove();
        resolve(value);
      };

      const submit = () => {
        const trimmed = input.value.trim();
        if (!trimmed) {
          input.focus();
          return;
        }
        cleanup(trimmed);
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          cleanup(null);
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          submit();
        }
      };

      cancelBtn.addEventListener('click', () => cleanup(null));
      submitBtn.addEventListener('click', submit);
      document.addEventListener('keydown', onKeyDown, true);

      actions.appendChild(cancelBtn);
      actions.appendChild(submitBtn);
      dialog.appendChild(title);
      dialog.appendChild(body);
      dialog.appendChild(input);
      dialog.appendChild(actions);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      input.focus();
    });
  }

  /**
   * Prompt user for encryption key and validate it by attempting decryption
   * @param encryptedPayload - The encrypted data to test the key against
   * @param planId - The plan ID to save the key to keychain if successful
   * @returns The validated encryption key, or null if user canceled or key was invalid after retries
   */
  private static async promptForEncryptionKey(
    encryptedPayload: string,
    planId: string
  ): Promise<string | null> {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      const key = await this.requestEncryptionKeyInput(
        attempts === 0
          ? 'This file is encrypted but the key was not found in your keychain.\n\nPlease enter your encryption key to decrypt this file:'
          : `Incorrect encryption key. Please try again (Attempt ${attempts + 1}/${maxAttempts}):`
      );

      // User canceled
      if (key === null) {
        return null;
      }

      // User entered empty string
      if (key.trim() === '') {
        attempts++;
        continue;
      }

      // Try to decrypt with this key
      try {
        const decryptedData = this.decrypt(encryptedPayload, key);
        // Try to parse as JSON to validate
        const parsed = JSON.parse(decryptedData);
        
        // Validate it's actually budget data
        if (isBudgetData(parsed)) {
          // Valid key! Save it to keychain for next time
          try {
            await KeychainService.saveKey(planId, key);
            if (import.meta.env.DEV) console.debug('[FileStorage] Successfully saved recovered encryption key to keychain');
          } catch (error) {
            console.warn('[FileStorage] Could not save recovered key to keychain:', error);
            // Don't fail - the key works, keychain save is just a convenience
          }
          return key;
        }
      } catch {
        // Decryption or parsing failed - wrong key
        attempts++;
      }
    }

    // Max attempts reached
    throw new Error(`Failed to decrypt file after ${maxAttempts} attempts. Please check your encryption key.`);
  }

  /**
   * Async variant for save flow to support in-app dialog input.
   */
  private static async promptForEncryptionKeyForSaveAsync(): Promise<string | null> {
    return this.requestEncryptionKeyInput(
      'Encryption is enabled for this plan, but no key was found in keychain.\n\nPlease enter your encryption key to save this plan:'
    );
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
      const selectedPath = await window.electronAPI.saveFileDialog(budgetData.name);
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
      // Validate budget ID before attempting keychain operations
      if (!budgetData.id || budgetData.id.trim() === '') {
        throw new Error('Invalid budget ID - cannot save encryption key');
      }
      
      // Get the encryption key - it should be in the keychain or in the current budget data
      let encryptionKey: string | undefined = budgetData.settings.encryptionKey;
      
      if (!encryptionKey) {
        // Try to get from keychain
        try {
          const keychainKey = await KeychainService.getKey(budgetData.id);
          encryptionKey = keychainKey || undefined;
        } catch (error) {
          console.warn('Failed to retrieve key from keychain, will prompt for key:', error);
        }
      }
      
      if (!encryptionKey) {
        // New encrypted plans may not have a keychain entry yet.
        // Prompt the user so save can proceed and then persist to keychain.
        const enteredKey = await this.promptForEncryptionKeyForSaveAsync();
        if (!enteredKey) {
          throw new Error('Encryption is enabled but no encryption key was provided');
        }
        encryptionKey = enteredKey;
      }
      
      // Try to save the key to keychain for future loads (only if not already saved)
      try {
        const existingKey = await KeychainService.getKey(budgetData.id);
        if (!existingKey || existingKey !== encryptionKey) {
          await KeychainService.saveKey(budgetData.id, encryptionKey);
          if (import.meta.env.DEV) console.debug('[FileStorage] Saved encryption key to keychain');
        }
      } catch (error) {
        // Don't fail the save operation if keychain save fails - the file can still be saved
        // Just log the error for troubleshooting
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn('[FileStorage] Could not save key to keychain:', errorMsg);
        console.warn('[FileStorage] Encryption will work, but key may need to be re-entered next time.');
      }
      
      // Encrypt the JSON data for security
      const encryptedPayload = this.encrypt(jsonData, encryptionKey);

      // Store encrypted file as a small JSON envelope with planId metadata.
      // This allows key lookup by stable UUID even if filename/path changes.
      const envelope: EncryptedBudgetEnvelopeV1 = {
        format: 'paycheck-planner-encrypted-v1',
        planId: budgetData.id,
        payload: encryptedPayload,
      };
      dataToSave = JSON.stringify(envelope, null, 2);
    }

    // Send to Electron's main process to actually write the file
    const result = await window.electronAPI.saveBudget(targetPath, dataToSave);

    if (!result.success) {
      throw new Error(result.error || 'Failed to save budget');
    }

    // Keep mapping and recents in sync with the canonical saved path
    this.savePlanFileMapping(targetPath, budgetData.id);
    this.addRecentFileForPlan(targetPath, budgetData.id);

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

    if (targetPath && window.electronAPI?.fileExists) {
      const exists = await window.electronAPI.fileExists(targetPath);
      if (!exists) {
        const expectedPlanId = this.getPlanIdForFile(targetPath) || undefined;
        const relinked = await this.relinkMovedBudgetFile(targetPath, expectedPlanId);
        if (relinked.status !== 'success') {
          return null;
        }
        targetPath = relinked.filePath;
      }
    }

    // Request Electron's main process to read the file
    const result = await window.electronAPI.loadBudget(targetPath);

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to load budget');
    }

    const fileData = result.data;

    // Parse JSON first. Only non-JSON payloads should go through legacy decryption fallback.
    let parsedData: unknown;
    let isJsonFile = true;
    try {
      parsedData = JSON.parse(fileData);
    } catch {
      isJsonFile = false;
    }

    if (isJsonFile) {
      // New encrypted format: use embedded plan ID metadata to fetch key
      if (isEncryptedBudgetEnvelopeV1(parsedData)) {
        const envelope = parsedData;
        let encryptionKey = await KeychainService.getKey(envelope.planId);

        // If key not found in keychain, prompt user to enter it
        if (!encryptionKey) {
          console.warn('[FileStorage] Encryption key not found in keychain, prompting user');
          encryptionKey = await this.promptForEncryptionKey(envelope.payload, envelope.planId);

          // User canceled or failed to provide valid key
          if (!encryptionKey) {
            throw new Error(
              'This file is encrypted but no valid key was provided. Cannot open file.'
            );
          }
        }

        const decryptedData = this.decrypt(envelope.payload, encryptionKey);
        const decryptedParsed: unknown = JSON.parse(decryptedData);

        if (!isBudgetData(decryptedParsed)) {
          throw new Error('Decrypted file data is not a valid budget format.');
        }

        const budgetData = migrateBudgetData(decryptedParsed as BudgetData);
        budgetData.settings = { ...budgetData.settings, filePath: targetPath };
        this.savePlanFileMapping(targetPath, budgetData.id);

        // Ensure key is in keychain (may have been recovered)
        try {
          await KeychainService.saveKey(budgetData.id, encryptionKey);
        } catch (error) {
          console.warn('[FileStorage] Could not save encryption key to keychain:', error);
        }

        this.addRecentFileForPlan(targetPath, budgetData.id);
        return budgetData;
      }

      // Regular unencrypted budget file
      if (isBudgetData(parsedData)) {
        const budgetData = migrateBudgetData(parsedData as BudgetData);
        budgetData.settings = { ...budgetData.settings, filePath: targetPath };
        this.savePlanFileMapping(targetPath, budgetData.id);
        this.addRecentFileForPlan(targetPath, budgetData.id);
        return budgetData;
      }

      if (isSettingsBackupEnvelopeV1(parsedData)) {
        throw new Error('This file is a Paycheck Planner settings export, not a budget plan. Use Import Settings in the app settings screen.');
      }

      throw new Error('Unsupported or invalid budget file format.');
    }

    // Non-JSON payloads may be legacy encrypted raw files. Try legacy decryption flow.

    // First, try to get the plan ID from our file mapping
    const planId = this.getPlanIdForFile(targetPath);
    let encryptionKey: string | null = null;

    if (planId) {
      // Try to get the key from keychain using the plan ID
      try {
        encryptionKey = await KeychainService.getKey(planId);
      } catch {
        // Key lookup failed, will try alternatives below
      }
    }

    // If we don't have a key yet, try to prompt the user for it
    if (!encryptionKey) {
      console.warn('[FileStorage] Legacy encrypted file with no keychain entry, prompting user');

      // For legacy format, we need to try decryption first to get the plan ID
      // So we'll use a special flow where we ask for the key and validate it
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        const key = await this.requestEncryptionKeyInput(
          attempts === 0
            ? 'This file is encrypted but the key was not found in your keychain.\n\nPlease enter your encryption key to decrypt this file:'
            : `Incorrect encryption key. Please try again (Attempt ${attempts + 1}/${maxAttempts}):`
        );

        // User canceled
        if (key === null) {
          throw new Error('File decryption canceled by user.');
        }

        // User entered empty string
        if (key.trim() === '') {
          attempts++;
          continue;
        }

        // Try to decrypt with this key
        try {
          const decryptedData = this.decrypt(fileData, key);
          const parsed: unknown = JSON.parse(decryptedData);

          if (isBudgetData(parsed)) {
            // Success! This is the correct key
            const budgetData = migrateBudgetData(parsed as BudgetData);
            budgetData.settings = { ...budgetData.settings, filePath: targetPath };

            // Save the file-to-plan mapping for future reference
            this.savePlanFileMapping(targetPath, budgetData.id);

            // Save the recovered key to keychain
            try {
              await KeychainService.saveKey(budgetData.id, key);
              if (import.meta.env.DEV) console.debug('[FileStorage] Successfully saved recovered encryption key to keychain');
            } catch (error) {
              console.warn('[FileStorage] Could not save recovered key to keychain:', error);
            }

            // Add to recent files on successful load
            this.addRecentFileForPlan(targetPath, budgetData.id);

            return budgetData;
          }
        } catch {
          // Wrong key or corrupted data
          attempts++;
        }
      }

      // Max attempts reached
      throw new Error(
        `Failed to decrypt file after ${maxAttempts} attempts. The encryption key may be incorrect.`
      );
    }

    try {
      // We have a key from keychain, try to decrypt
      const decryptedData = this.decrypt(fileData, encryptionKey);

      // Parse JSON back into a JavaScript object (deserialization)
      const parsed: unknown = JSON.parse(decryptedData);
      if (!isBudgetData(parsed)) {
        throw new Error('Decrypted file data is not a valid budget format.');
      }
      const budgetData = migrateBudgetData(parsed as BudgetData);
      budgetData.settings = { ...budgetData.settings, filePath: targetPath };

      // Save the file-to-plan mapping for future reference
      this.savePlanFileMapping(targetPath, budgetData.id);

      // Ensure the key is stored in keychain with the correct plan ID
      try {
        await KeychainService.saveKey(budgetData.id, encryptionKey);
      } catch (error) {
        console.warn('[FileStorage] Could not save encryption key to keychain:', error);
      }

      // Add to recent files on successful load
      this.addRecentFileForPlan(targetPath, budgetData.id);

      return budgetData;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to decrypt file: ${errorMsg}. The encryption key may be incorrect.`);
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
      otherIncome: [],
      taxSettings: {
        taxLines: [
          { id: crypto.randomUUID(), label: 'Federal Tax', rate: 0, amount: 0, calculationType: 'percentage' },
          { id: crypto.randomUUID(), label: 'State Tax', rate: 0, amount: 0, calculationType: 'percentage' },
          { id: crypto.randomUUID(), label: 'Social Security', rate: 6.2, amount: 0, calculationType: 'percentage' },
          { id: crypto.randomUUID(), label: 'Medicare', rate: 1.45, amount: 0, calculationType: 'percentage' },
        ],
        additionalWithholding: 0,
      },
      accounts: [
        {
          id: crypto.randomUUID(),
          name: 'My Checking',
          type: 'checking',
          color: getDefaultAccountColor('checking'),
          icon: getDefaultAccountIcon('checking'),
        },
      ],
      bills: [],
      loans: [],
      benefits: [],
      retirement: [],
      savingsContributions: [],
      metadata: {
        auditHistory: [],
      },
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
