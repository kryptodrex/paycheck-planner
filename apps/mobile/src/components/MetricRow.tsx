import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  label: string;
  value: string;
  isTotal?: boolean;
  isNegative?: boolean;
  indented?: boolean;
}

export function MetricRow({ label, value, isTotal, isNegative, indented }: Props) {
  const { spacing, colors } = useTheme();
  return (
    <View
      style={[
        styles.row,
        { paddingVertical: spacing.sm, minHeight: 48 },
        isTotal && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, marginTop: 4, paddingTop: spacing.sm + 4 },
        indented && { paddingLeft: spacing.md },
      ]}
    >
      <ThemedText
        variant={isTotal ? 'primary' : 'secondary'}
        size="sm"
        weight={isTotal ? 'bold' : 'medium'}
        style={{ flex: 1, paddingRight: spacing.sm }}
      >
        {label}
      </ThemedText>
      <ThemedText
        variant={isNegative ? 'secondary' : isTotal ? 'primary' : 'primary'}
        size="sm"
        weight={isTotal ? 'bold' : 'semibold'}
      >
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
