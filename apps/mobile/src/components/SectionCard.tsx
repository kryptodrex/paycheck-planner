import { type ReactNode } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  title?: string;
  children: ReactNode;
  actionLabel?: string;
  actionIcon?: keyof typeof Feather.glyphMap;
  onAction?: () => void;
}

export function SectionCard({ title, children, actionLabel, actionIcon = 'plus', onAction }: Props) {
  const { spacing, radius, colors } = useTheme();

  return (
    <ThemedView
      variant="elevated"
      style={{
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        marginBottom: spacing.md,
        overflow: 'hidden',
      }}
    >
      {(title || onAction) && (
        <View
          style={[
            styles.header,
            {
              paddingHorizontal: spacing.md,
              paddingTop: spacing.md,
              paddingBottom: spacing.xs,
            },
          ]}
        >
          <ThemedText
            variant="tertiary"
            size="xs"
            weight="semibold"
            style={{ textTransform: 'uppercase', letterSpacing: 0.6, flex: 1 }}
          >
            {title ?? ''}
          </ThemedText>
          {onAction && (
            <TouchableOpacity
              onPress={onAction}
              style={styles.action}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={actionLabel ?? 'Add'}
            >
              <Feather name={actionIcon} size={14} color={colors.textAccent} />
              <ThemedText variant="accent" size="xs" weight="semibold">
                {actionLabel ?? 'Add'}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      )}
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.md,
          paddingTop: title || onAction ? 0 : spacing.md,
        }}
      >
        {children}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
