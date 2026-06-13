import { TouchableOpacity, ActivityIndicator, StyleSheet, type ViewStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '../contexts/ThemeContext';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  compact,
  style,
}: Props) {
  const { colors, radius } = useTheme();

  const backgroundColor =
    variant === 'primary' ? colors.accentPrimary
    : variant === 'danger' ? colors.error
    : 'transparent';

  const textColor =
    variant === 'primary' || variant === 'danger' ? colors.textInverse
    : variant === 'secondary' ? colors.textSecondary
    : colors.textAccent;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor,
          borderRadius: radius.md,
          minHeight: compact ? 38 : 48,
          paddingHorizontal: compact ? 12 : 16,
          opacity: disabled ? 0.5 : 1,
        },
        variant === 'secondary' && {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <ThemedText
          size={compact ? 'sm' : 'md'}
          weight="semibold"
          style={{ color: textColor }}
        >
          {title}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
});
