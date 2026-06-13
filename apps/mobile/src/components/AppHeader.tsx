import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedText } from './ThemedText';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan } from '../contexts/PlanContext';

interface Props {
  title: string;
  subtitle?: string;
}

/**
 * Consistent in-app header for the main tab screens. Left is a back chevron
 * that closes the current plan and returns to the welcome screen (mirroring
 * how Numbers' back arrow returns to the document browser); right is a gear
 * that opens Settings. Native tabs don't render a header, so this provides one.
 */
export function AppHeader({ title, subtitle }: Props) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { closePlan } = usePlan();

  function handleClose() {
    closePlan();
    router.replace('/');
  }

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
      <TouchableOpacity
        onPress={handleClose}
        style={styles.closeButton}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Close plan and return to welcome screen"
      >
        <Feather name="chevron-left" size={26} color={colors.accentPrimary} />
        <ThemedText variant="accent" size="md" weight="semibold">
          Close
        </ThemedText>
      </TouchableOpacity>

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
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingRight: 6,
  },
  titleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
});
