export { getIconComponent } from './iconNameToComponent';
export { getDefaultAccountColor } from '@paycheck-planner/core/account-defaults';

import type { Account } from '../types/accounts';

const DESKTOP_ACCOUNT_ICONS: Record<Account['type'], string> = {
  checking: 'CreditCard',
  savings: 'PiggyBank',
  investment: 'TrendingUp',
  other: 'Wallet',
};

export function getDefaultAccountIcon(type: Account['type']): string {
  return DESKTOP_ACCOUNT_ICONS[type];
}