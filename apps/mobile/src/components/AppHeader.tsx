import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedText } from './ThemedText';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  title: string;
  subtitle?: string;
}

/**
 * Consistent in-app header for the main tab screens. A centered title with a
 * gear on the right that opens Settings (where the plan can be closed). Native
 * tabs don't render a header, so this provides one.
 */
export function AppHeader({ title, subtitle }: Props) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 8,
          paddingHorizontal: spacing.xs,
          backgroundColor: colors.bgPrimary,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {/* Spacer balances the gear button so the title stays centered. */}
      <View style={styles.sideButton} />

      <View style={styles.titleWrap}>
        <ThemedText size="lg" weight="bold" numberOfLines={1} style={{ textAlign: 'center' }}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText
            variant="tertiary"
            size="xs"
            numberOfLines={1}
            style={{ textAlign: 'center', marginTop: 1 }}
          >
            {subtitle}
          </ThemedText>
        ) : null}
      </View>

      <TouchableOpacity
        onPress={() => router.push('/settings')}
        style={styles.sideButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
        accessibilityRole="button"
        accessibilityLabel="Settings"
      >
        <Feather name="settings" size={23} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sideButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
});
