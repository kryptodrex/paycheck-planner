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
 * Account icon names — Lucide icon names shared by every platform (desktop:
 * `lucide-react`, mobile: `lucide-react-native`, which expose the same set).
 * Storing the icon name on the account keeps the chosen icon identical across
 * platforms. This is the canonical list + display order for the icon picker.
 */
export const ACCOUNT_ICON_NAMES = [
  'CreditCard', 'Banknote', 'Wallet', 'PiggyBank', 'Coins', 'DollarSign', 'CircleDollarSign', 'BadgeDollarSign',
  'TrendingUp', 'BarChart2', 'ChartPie', 'ChartNoAxesCombined', 'Target', 'Calculator', 'Percent', 'Scale',
  'ReceiptText', 'FileText', 'FileSpreadsheet', 'Folder', 'FolderOpen', 'Archive', 'ClipboardClock', 'CalendarClock',
  'Briefcase', 'BriefcaseBusiness', 'Building2', 'Building', 'Landmark', 'Factory', 'Store', 'House',
  'Home', 'HousePlus', 'HouseHeart', 'HouseWifi', 'Car', 'Truck', 'Bus', 'Plane',
  'Bike', 'MapPin', 'Fuel', 'HandCoins', 'HandHeart', 'Heart', 'HeartPulse', 'Umbrella',
  'Lock', 'LockOpen', 'Shield', 'ShieldCheck', 'KeyRound', 'Key', 'Laptop', 'Monitor',
  'ShoppingCart', 'Utensils', 'Coffee', 'Dumbbell', 'GraduationCap', 'Baby', 'PawPrint', 'Gift',
] as const;

export type AccountIconName = (typeof ACCOUNT_ICON_NAMES)[number];

/** Default Lucide icon name per account type. */
export const ACCOUNT_TYPE_ICON_KEYS: Record<Account['type'], AccountIconName> = {
  checking: 'CreditCard',
  savings: 'PiggyBank',
  investment: 'TrendingUp',
  other: 'Wallet',
};

export function getDefaultAccountIconKey(type: Account['type']): AccountIconName {
  return ACCOUNT_TYPE_ICON_KEYS[type] ?? 'Wallet';
}
