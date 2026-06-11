import { View, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  title: string;
  subtitle?: string;
  amount?: string;
  amountCaption?: string;
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  onPress?: () => void;
  badge?: string;
}

/**
 * Tappable list-item card with optional enable toggle — the mobile
 * counterpart of the desktop SectionItemCard.
 */
export function ItemCard({
  title,
  subtitle,
  amount,
  amountCaption,
  enabled,
  onToggle,
  onPress,
  badge,
}: Props) {
  const { colors, spacing, radius } = useTheme();
  const dimmed = enabled === false;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.bgElevated,
          borderColor: colors.border,
          borderRadius: radius.md,
          marginBottom: spacing.sm,
          padding: spacing.md,
          opacity: dimmed ? 0.55 : 1,
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.75}
    >
      <View style={{ flex: 1, paddingRight: spacing.sm }}>
        <View style={styles.titleRow}>
          <ThemedText size="sm" weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title}
          </ThemedText>
          {badge && (
            <View
              style={[
                styles.badge,
                { backgroundColor: colors.accentPrimary + '22', borderRadius: radius.sm },
              ]}
            >
              <ThemedText variant="accent" size="xs" weight="medium">
                {badge}
              </ThemedText>
            </View>
          )}
        </View>
        {subtitle && (
          <ThemedText variant="tertiary" size="xs" style={{ marginTop: 2 }} numberOfLines={1}>
            {subtitle}
          </ThemedText>
        )}
      </View>

      {amount !== undefined && (
        <View style={styles.amountColumn}>
          <ThemedText size="sm" weight="semibold">
            {amount}
          </ThemedText>
          {amountCaption && (
            <ThemedText variant="tertiary" size="xs">
              {amountCaption}
            </ThemedText>
          )}
        </View>
      )}

      {onToggle && (
        <Switch
          value={enabled !== false}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.accentPrimary }}
          thumbColor="#ffffff"
          style={{ marginLeft: spacing.sm }}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 60,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2 },
  amountColumn: { alignItems: 'flex-end' },
});
