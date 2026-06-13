import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  message?: string;
}

export function EmptyState({ icon = 'inbox', title, message }: Props) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.container, { paddingVertical: spacing.xl }]}>
      <Feather name={icon} size={28} color={colors.textTertiary} />
      <ThemedText
        variant="secondary"
        size="sm"
        weight="semibold"
        style={{ marginTop: spacing.sm, textAlign: 'center' }}
      >
        {title}
      </ThemedText>
      {message && (
        <ThemedText
          variant="tertiary"
          size="xs"
          style={{ marginTop: spacing.xs, textAlign: 'center', maxWidth: 260 }}
        >
          {message}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});
