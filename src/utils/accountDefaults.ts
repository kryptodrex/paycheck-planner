import type { Account } from '../types/accounts';
import { ACCOUNT_TYPE_COLORS, DEFAULT_ACCOUNT_COLOR } from '../constants/accountPalette';

export function getDefaultAccountColor(type: Account['type']): string {
  return ACCOUNT_TYPE_COLORS[type] ?? DEFAULT_ACCOUNT_COLOR;
}

export function getDefaultAccountIcon(type: Account['type']): string {
  switch (type) {
    case 'checking':
      return '💳';
    case 'savings':
      return '💰';
    case 'investment':
      return '📈';
    case 'other':
      return '💵';
    default:
      return '💰';
  }
}