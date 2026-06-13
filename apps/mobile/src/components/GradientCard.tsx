import { type ReactNode } from 'react';
import { type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  children: ReactNode;
  style?: ViewStyle;
}

/**
 * Accent gradient surface matching the desktop's `--header-gradient`
 * (135deg accent-primary → accent-secondary).
 */
export function GradientCard({ children, style }: Props) {
  const { colors, radius, spacing } = useTheme();

  return (
    <LinearGradient
      colors={[colors.accentPrimary, colors.accentSecondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ borderRadius: radius.xl, padding: spacing.lg }, style]}
    >
      {children}
    </LinearGradient>
  );
}
