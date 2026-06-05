import { View, type ViewProps } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

type Variant = 'primary' | 'secondary' | 'elevated' | 'transparent';

interface Props extends ViewProps {
  variant?: Variant;
}

export function ThemedView({ variant = 'primary', style, ...props }: Props) {
  const { colors } = useTheme();

  const bgMap: Record<Variant, string> = {
    primary: colors.bgPrimary,
    secondary: colors.bgSecondary,
    elevated: colors.bgElevated,
    transparent: 'transparent',
  };

  return <View style={[{ backgroundColor: bgMap[variant] }, style]} {...props} />;
}
