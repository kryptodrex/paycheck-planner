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
  /** Emphasize the card briefly, e.g. when navigated to from search. */
  highlighted?: boolean;
}

/**
 * Tappable list-item card — the mobile counterpart of the desktop
 * SectionItemCard. The title wraps (up to two lines) and the enable/pause
 * switch lives in a footer below the name, subtitle, and amount, so long
 * names are never truncated by the control.
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
  highlighted,
}: Props) {
  const { colors, spacing, radius } = useTheme();
  const dimmed = enabled === false;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: highlighted ? colors.accentPrimary + '22' : colors.bgElevated,
          borderColor: highlighted ? colors.accentPrimary : colors.border,
          borderWidth: highlighted ? 1.5 : StyleSheet.hairlineWidth,
          borderRadius: radius.md,
          marginBottom: spacing.sm,
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.body, { padding: spacing.md, opacity: dimmed ? 0.55 : 1 }]}>
        <View style={{ flex: 1, paddingRight: amount !== undefined ? spacing.sm : 0 }}>
          <ThemedText size="md" weight="semibold" numberOfLines={2}>
            {title}
          </ThemedText>
          <View style={styles.subRow}>
            {badge && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: colors.accentPrimary + '22', borderRadius: radius.sm },
                ]}
              >
                <ThemedText variant="accent" size="xs" weight="semibold">
                  {badge}
                </ThemedText>
              </View>
            )}
            {subtitle && (
              <ThemedText variant="tertiary" size="xs" style={{ flexShrink: 1 }} numberOfLines={1}>
                {subtitle}
              </ThemedText>
            )}
          </View>
        </View>

        {amount !== undefined && (
          <View style={styles.amountColumn}>
            <ThemedText size="md" weight="semibold" numberOfLines={1}>
              {amount}
            </ThemedText>
            {amountCaption && (
              <ThemedText variant="tertiary" size="xs">
                {amountCaption}
              </ThemedText>
            )}
          </View>
        )}
      </View>

      {onToggle && (
        <View
          style={[
            styles.footer,
            {
              borderTopColor: colors.border,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
            },
          ]}
        >
          <ThemedText variant={dimmed ? 'tertiary' : 'secondary'} size="sm" weight="medium">
            {dimmed ? 'Paused' : 'Active'}
          </ThemedText>
          <Switch
            value={enabled !== false}
            onValueChange={onToggle}
            trackColor={{ false: colors.border, true: colors.accentPrimary }}
            thumbColor="#ffffff"
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  body: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  badge: { paddingHorizontal: 8, paddingVertical: 2 },
  amountColumn: { alignItems: 'flex-end' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
});
