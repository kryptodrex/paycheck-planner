import * as LucideIcons from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

// lucide-react-native exposes the same PascalCase icon names as desktop's
// lucide-react, so an account's stored `icon` renders identically on both.
const ICONS = LucideIcons as unknown as Record<string, LucideIcon>;

interface Props {
  name?: string | null;
  color: string;
  size?: number;
}

/** Renders a Lucide account icon by name, falling back to Wallet. */
export function AccountIcon({ name, color, size = 20 }: Props) {
  const Icon = (name && ICONS[name]) || ICONS.Wallet;
  return <Icon color={color} size={size} />;
}
