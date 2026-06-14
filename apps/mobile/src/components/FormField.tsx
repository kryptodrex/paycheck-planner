import { View, TextInput, StyleSheet, type KeyboardTypeOptions } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  error?: string | null;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  hint?: string;
  secureTextEntry?: boolean;
}

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  error,
  multiline,
  autoCapitalize = 'sentences',
  hint,
  secureTextEntry,
}: Props) {
  const { colors, spacing, radius, fontSize } = useTheme();

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
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.bgInput,
            borderColor: error ? colors.error : colors.border,
            borderRadius: radius.md,
            color: colors.textPrimary,
            fontSize: fontSize.md,
            paddingHorizontal: spacing.md,
            minHeight: multiline ? 88 : 46,
            textAlignVertical: multiline ? 'top' : 'center',
            paddingVertical: multiline ? spacing.sm : 0,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        secureTextEntry={secureTextEntry}
      />
      {error ? (
        <ThemedText size="xs" style={{ color: colors.error, marginTop: spacing.xs }}>
          {error}
        </ThemedText>
      ) : hint ? (
        <ThemedText variant="tertiary" size="xs" style={{ marginTop: spacing.xs }}>
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1 },
});
