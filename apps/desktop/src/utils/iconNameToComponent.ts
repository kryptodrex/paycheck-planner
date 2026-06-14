import {
  Archive,
  Baby,
  BadgeDollarSign,
  BarChart2,
  Banknote,
  Bike,
  BriefcaseBusiness,
  Building,
  Building2,
  Bus,
  CalendarClock,
  Calculator,
  ChartNoAxesCombined,
  ChartPie,
  CircleDollarSign,
  ClipboardClock,
  Coins,
  Coffee,
  Briefcase,
  Car,
  CreditCard,
  DollarSign,
  Dumbbell,
  Factory,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  Fuel,
  Gift,
  GraduationCap,
  HandHeart,
  HandCoins,
  Heart,
  HeartPulse,
  Home,
  House,
  HouseHeart,
  HousePlus,
  HouseWifi,
  Key,
  Landmark,
  Laptop,
  Lock,
  LockOpen,
  MapPin,
  Monitor,
  PawPrint,
  Percent,
  Plane,
  PiggyBank,
  ReceiptText,
  Scale,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Store,
  Target,
  Truck,
  TrendingUp,
  Umbrella,
  Utensils,
  Wallet,
  KeyRound,
} from 'lucide-react';
import { ACCOUNT_ICON_NAMES as CORE_ACCOUNT_ICON_NAMES } from '@paycheck-planner/core/account-defaults';

/** Map of icon names to Lucide icon components */
export const ACCOUNT_ICON_MAP = {
  CreditCard,
  Banknote,
  Wallet,
  PiggyBank,
  Coins,
  DollarSign,
  CircleDollarSign,
  BadgeDollarSign,

  TrendingUp,
  BarChart2,
  ChartPie,
  ChartNoAxesCombined,
  Target,
  Calculator,
  Percent,
  Scale,

  ReceiptText,
  FileText,
  FileSpreadsheet,
  Folder,
  FolderOpen,
  Archive,
  ClipboardClock,
  CalendarClock,

  Briefcase,
  BriefcaseBusiness,
  Building2,
  Building,
  Landmark,
  Factory,
  Store,
  House,

  Home,
  HousePlus,
  HouseHeart,
  HouseWifi,
  Car,
  Truck,
  Bus,
  Plane,

  Bike,
  MapPin,
  Fuel,
  HandCoins,
  HandHeart,
  Heart,
  HeartPulse,
  Umbrella,

  Lock,
  LockOpen,
  Shield,
  ShieldCheck,
  KeyRound,
  Key,
  Laptop,
  Monitor,

  ShoppingCart,
  Utensils,
  Coffee,
  Dumbbell,
  GraduationCap,
  Baby,
  PawPrint,
  Gift,
} as const;

export type AccountIconName = keyof typeof ACCOUNT_ICON_MAP;

/** Get the Lucide component for a given icon name */
export function getIconComponent(iconName: string): React.ComponentType<{ className?: string }> | null {
  if (iconName in ACCOUNT_ICON_MAP) {
    return ACCOUNT_ICON_MAP[iconName as AccountIconName];
  }

  return null;
}

/**
 * Available account icon names in display order. The canonical list lives in
 * core (shared with mobile); we keep only names this app can render.
 */
export const ACCOUNT_ICON_NAMES = CORE_ACCOUNT_ICON_NAMES.filter(
  (name): name is AccountIconName => name in ACCOUNT_ICON_MAP,
);
