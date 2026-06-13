import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '../contexts/ThemeContext';

export interface PickerOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label?: string;
  options: PickerOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
}

/** Wrapping pill selector — mobile equivalent of the desktop PillToggle/RadioGroup. */
export function OptionPicker<T extends string>({ label, options, value, onChange }: Props<T>) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View style={{ marginBottom: spacing.md }}>
      {label && (
        <ThemedText
          variant="secondary"
          size="xs"
          weight="semibold"
          style={{ marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.4 }}
        >
          {label}
        </ThemedText>
      )}
      <View style={[styles.row, { gap: spacing.sm }]}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.pill,
                {
                  borderRadius: radius.xl,
                  borderColor: selected ? colors.accentPrimary : colors.border,
                  backgroundColor: selected ? colors.accentPrimary : colors.bgInput,
                },
              ]}
              onPress={() => onChange(option.value)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <ThemedText
                size="sm"
                weight={selected ? 'semibold' : 'normal'}
                style={{ color: selected ? colors.textInverse : colors.textSecondary }}
              >
                {option.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  pill: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
