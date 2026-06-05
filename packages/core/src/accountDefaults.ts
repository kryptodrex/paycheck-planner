import type { Account } from './accounts';

export const ACCOUNT_TYPE_COLORS: Record<Account['type'], string> = {
  checking: '#667eea',
  savings: '#f093fb',
  investment: '#4facfe',
  other: '#43e97b',
};

export const DEFAULT_ACCOUNT_COLOR = ACCOUNT_TYPE_COLORS.checking;

export function getDefaultAccountColor(type: Account['type']): string {
  return ACCOUNT_TYPE_COLORS[type] ?? DEFAULT_ACCOUNT_COLOR;
}

/**
 * Semantic icon keys for account types. Each platform maps these to its own
 * icon system (desktop: Lucide React, mobile: Ionicons, etc.).
 */
export const ACCOUNT_TYPE_ICON_KEYS: Record<Account['type'], string> = {
  checking: 'card',
  savings: 'piggy-bank',
  investment: 'trending-up',
  other: 'wallet',
};

export function getDefaultAccountIconKey(type: Account['type']): string {
  return ACCOUNT_TYPE_ICON_KEYS[type] ?? 'wallet';
}
