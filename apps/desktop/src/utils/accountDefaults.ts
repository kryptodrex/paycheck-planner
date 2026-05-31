import type { Account } from '../types/accounts';
import { ACCOUNT_TYPE_COLORS, DEFAULT_ACCOUNT_COLOR } from '../constants/accountPalette';
export { getIconComponent } from './iconNameToComponent';

export function getDefaultAccountColor(type: Account['type']): string {
  return ACCOUNT_TYPE_COLORS[type] ?? DEFAULT_ACCOUNT_COLOR;
}

const DEFAULT_ACCOUNT_ICONS: Record<Account['type'], string> = {
  checking: 'CreditCard',
  savings: 'PiggyBank',
  investment: 'TrendingUp',
  other: 'Wallet',
};

export function getDefaultAccountIcon(type: Account['type']): string {
  return DEFAULT_ACCOUNT_ICONS[type];
}