import type { Account } from '../types/accounts';

export function getDefaultAccountColor(type: Account['type']): string {
  switch (type) {
    case 'checking':
      return '#667eea';
    case 'savings':
      return '#f093fb';
    case 'investment':
      return '#4facfe';
    case 'other':
      return '#43e97b';
    default:
      return '#667eea';
  }
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