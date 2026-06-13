import { View, StyleSheet } from 'react-native';
import type { KeyMetricsSegment } from '@paycheck-planner/core';
import { ThemedText } from './ThemedText';
import { useTheme } from '../contexts/ThemeContext';
import type { ColorTokens } from '../theme/tokens';

function segmentColor(key: string, colors: ColorTokens): string {
  switch (key) {
    case 'billsAndDeductions':
      return colors.segmentBills;
    case 'taxes':
      return colors.segmentTaxes;
    case 'savings':
      return colors.segmentSavings;
    case 'remaining':
      return colors.segmentRemaining;
    case 'shortfall':
      return colors.segmentShortfall;
    default:
      return colors.accentPrimary;
  }
}

interface Props {
  segments: KeyMetricsSegment[];
  formatAmount: (amount: number) => string;
}

/**
 * Stacked allocation bar + legend, mirroring the desktop KeyMetrics
 * gross-pay breakdown bar.
 */
export function AllocationBar({ segments, formatAmount }: Props) {
  const { colors, spacing, radius } = useTheme();

  if (segments.length === 0) return null;

  return (
    <View>
      <View
        style={[
          styles.bar,
          { borderRadius: radius.sm, backgroundColor: colors.bgInput, marginBottom: spacing.md },
        ]}
      >
        {segments.map((segment) => (
          <View
            key={segment.key}
            style={{
              flex: Math.max(segment.pct, 1.5),
              backgroundColor: segmentColor(segment.key, colors),
            }}
          />
        ))}
      </View>

      {segments.map((segment) => (
        <View key={segment.key} style={[styles.legendRow, { marginBottom: spacing.xs }]}>
          <View
            style={[styles.dot, { backgroundColor: segmentColor(segment.key, colors) }]}
          />
          <ThemedText variant="secondary" size="sm" style={{ flex: 1 }}>
            {segment.label}
          </ThemedText>
          <ThemedText size="sm" weight="medium">
            {formatAmount(segment.amount)}
          </ThemedText>
          <ThemedText variant="tertiary" size="xs" style={styles.pct}>
            {segment.pct.toFixed(1)}%
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', height: 14, overflow: 'hidden' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  pct: { width: 48, textAlign: 'right' },
});
