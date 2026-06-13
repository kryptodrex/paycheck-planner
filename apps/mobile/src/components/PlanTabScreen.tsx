import { type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppHeader } from './AppHeader';
import { SearchFab } from './SearchFab';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Hide the floating search button (e.g. screens that aren't searchable). */
  hideSearch?: boolean;
}

/**
 * Scaffold for the main tab screens: a consistent custom header (native tabs
 * render no header of their own), the scrollable content, and the floating
 * search button. Keeps every tab visually aligned.
 */
export function PlanTabScreen({ title, subtitle, children, hideSearch }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: colors.bgPrimary }]}>
      <AppHeader title={title} subtitle={subtitle} />
      <View style={styles.content}>{children}</View>
      {!hideSearch && <SearchFab />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1 },
});
