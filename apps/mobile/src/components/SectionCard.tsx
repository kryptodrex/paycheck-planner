import { type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  title?: string;
  children: ReactNode;
}

export function SectionCard({ title, children }: Props) {
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
      {title && (
        <View
          style={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.md,
            paddingBottom: spacing.xs,
          }}
        >
          <ThemedText
            variant="tertiary"
            size="xs"
            weight="semibold"
            style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}
          >
            {title}
          </ThemedText>
        </View>
      )}
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.md,
          paddingTop: title ? 0 : spacing.md,
        }}
      >
        {children}
      </View>
    </ThemedView>
  );
}
