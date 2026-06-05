import { Text, type TextProps } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'inverse';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl';
type Weight = 'normal' | 'medium' | 'semibold' | 'bold';

interface Props extends TextProps {
  variant?: Variant;
  size?: Size;
  weight?: Weight;
}

const WEIGHT_MAP: Record<Weight, '400' | '500' | '600' | '700'> = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export function ThemedText({
  variant = 'primary',
  size = 'md',
  weight = 'normal',
  style,
  ...props
}: Props) {
  const { colors, fontSize } = useTheme();

  const colorMap: Record<Variant, string> = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    accent: colors.textAccent,
    inverse: colors.textInverse,
  };

  return (
    <Text
      style={[
        {
          color: colorMap[variant],
          fontSize: fontSize[size],
          fontWeight: WEIGHT_MAP[weight],
        },
        style,
      ]}
      {...props}
    />
  );
}
