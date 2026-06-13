import { View } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '../contexts/ThemeContext';

export function FormError({ message }: { message: string | null }) {
  const { colors, spacing, radius } = useTheme();
  if (!message) return null;

  return (
    <View
      style={{
        backgroundColor: colors.error + '18',
        borderColor: colors.error + '50',
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing.sm,
        marginBottom: spacing.md,
      }}
    >
      <ThemedText size="xs" style={{ color: colors.error }}>
        {message}
      </ThemedText>
    </View>
  );
}
