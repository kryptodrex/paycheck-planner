import { TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Floating search button shown on every plan tab. Hovers over the content in
 * the bottom-right and opens the search modal. The bottom offset rides on the
 * safe-area inset (which includes the native tab bar) so it sits just above it.
 */
export function SearchFab() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <TouchableOpacity
      onPress={() => router.push('/search')}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Search plan"
      style={[
        styles.fab,
        {
          backgroundColor: colors.accentPrimary,
          shadowColor: '#000',
          bottom: insets.bottom + 16,
        },
      ]}
    >
      <Feather name="search" size={24} color="#ffffff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
