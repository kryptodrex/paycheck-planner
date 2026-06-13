import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '../contexts/ThemeContext';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const { colors, radius } = useTheme();

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: colors.bgInput, borderRadius: radius.md, padding: 3 },
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.segment,
              { borderRadius: radius.sm },
              selected && { backgroundColor: colors.accentPrimary },
            ]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <ThemedText
              size="xs"
              weight={selected ? 'semibold' : 'medium'}
              style={{ color: selected ? colors.textInverse : colors.textSecondary }}
              numberOfLines={1}
            >
              {option.label}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row' },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
});
