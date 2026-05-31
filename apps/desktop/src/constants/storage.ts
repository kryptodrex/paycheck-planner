export const STORAGE_KEYS = {
  settings: 'paycheck-planner-settings',
  recentFiles: 'paycheck-planner-recent-files',
  fileToPlanMapping: 'paycheck-planner-file-to-plan-mapping',
  theme: 'paycheck-planner-theme',
  accounts: 'paycheck-planner-accounts',
  currencyRates: 'paycheck-planner-currency-rates',
} as const;

export const APP_STORAGE_PREFIX = 'paycheck-planner-';

export const APP_STORAGE_KEYS = [
  STORAGE_KEYS.settings,
  STORAGE_KEYS.recentFiles,
  STORAGE_KEYS.fileToPlanMapping,
  STORAGE_KEYS.theme,
  STORAGE_KEYS.accounts,
  STORAGE_KEYS.currencyRates,
] as const;

export const SETTINGS_PLAN_SPECIFIC_FIELDS = ['encryptionEnabled', 'encryptionKey'] as const;

export const BACKUP_EXCLUDED_STORAGE_KEYS = [STORAGE_KEYS.accounts] as const;

export const MAX_RECENT_FILES = 10;