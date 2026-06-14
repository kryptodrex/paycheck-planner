import { useState } from 'react';
import { View, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  label: string;
  /** ISO date string (YYYY-MM-DD) or undefined when unset. */
  value?: string;
  onChange: (isoDate: string) => void;
  hint?: string;
}

function formatDisplay(iso?: string): string {
  if (!iso) return 'Not set';
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Date picker field — a tappable row that opens the native date picker. */
export function DateField({ label, value, onChange, hint }: Props) {
  const { colors, spacing, radius, fontSize } = useTheme();
  const [show, setShow] = useState(false);

  const current = value ? new Date(`${value}T00:00:00`) : new Date();

  function handleChange(event: DateTimePickerEvent, selected?: Date) {
    // Android fires once and dismisses itself; keep iOS inline picker open.
    setShow(Platform.OS === 'ios');
    if (event.type === 'set' && selected) {
      // Store as local YYYY-MM-DD (no timezone shift).
      const y = selected.getFullYear();
      const m = String(selected.getMonth() + 1).padStart(2, '0');
      const d = String(selected.getDate()).padStart(2, '0');
      onChange(`${y}-${m}-${d}`);
    }
  }

  return (
    <View style={{ marginBottom: spacing.md }}>
      <ThemedText
        variant="secondary"
        size="xs"
        weight="semibold"
        style={{ marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.4 }}
      >
        {label}
      </ThemedText>
      <TouchableOpacity
        style={[
          styles.field,
          {
            backgroundColor: colors.bgInput,
            borderColor: colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
          },
        ]}
        onPress={() => setShow(true)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatDisplay(value)}`}
      >
        <ThemedText size="md" style={{ flex: 1, fontSize: fontSize.md, color: value ? colors.textPrimary : colors.textTertiary }}>
          {formatDisplay(value)}
        </ThemedText>
        <Feather name="calendar" size={18} color={colors.textTertiary} />
      </TouchableOpacity>

      {show && (
        <DateTimePicker
          value={current}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleChange}
          themeVariant={colors.bgPrimary === '#ffffff' ? 'light' : undefined}
        />
      )}

      {hint ? (
        <ThemedText variant="tertiary" size="xs" style={{ marginTop: spacing.xs }}>
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', minHeight: 46, borderWidth: 1 },
});
