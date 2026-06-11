import { View, Switch, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
}

export function ToggleRow({ label, value, onChange, hint }: Props) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.row, { marginBottom: spacing.md }]}>
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <ThemedText size="sm" weight="medium">
          {label}
        </ThemedText>
        {hint && (
          <ThemedText variant="tertiary" size="xs" style={{ marginTop: 2 }}>
            {hint}
          </ThemedText>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.accentPrimary }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
});
