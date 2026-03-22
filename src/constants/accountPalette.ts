import type { Account } from '../types/accounts';

export const ACCOUNT_TYPE_COLORS: Record<Account['type'], string> = {
  checking: '#667eea',
  savings: '#f093fb',
  investment: '#4facfe',
  other: '#43e97b',
};

export const DEFAULT_ACCOUNT_COLOR = ACCOUNT_TYPE_COLORS.checking;
